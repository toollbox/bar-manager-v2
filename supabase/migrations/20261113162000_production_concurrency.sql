drop function public.make_cocktail(uuid, uuid, uuid, integer, jsonb);

create function public.make_cocktail(
  target_organization_id uuid,
  target_location_id uuid,
  target_cocktail_id uuid,
  production_quantity integer,
  product_selections jsonb,
  request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_production_id uuid;
  recipe_count integer;
  selection_count integer;
  recipe_line record;
  selected_product_id uuid;
  required_quantity numeric(14, 3);
  current_quantity numeric(14, 3);
  previous public.cocktail_productions%rowtype;
begin
  if auth.uid() is null or not public.is_organization_member(target_organization_id) then
    raise exception 'Not authorized';
  end if;

  if request_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(request_id::text, 2));
    select * into previous from public.cocktail_productions
      where organization_id = target_organization_id and cocktail_productions.request_id = make_cocktail.request_id;
    if found then
      if previous.location_id <> target_location_id or previous.cocktail_id <> target_cocktail_id
         or previous.quantity <> production_quantity or previous.request_selections <> product_selections then
        raise exception 'Request already used with different selections';
      end if;
      return previous.id;
    end if;
  end if;

  perform 1 from public.cocktails where id = target_cocktail_id and organization_id = target_organization_id for share;

  if production_quantity is null or production_quantity < 1 or production_quantity > 100 then
    raise exception 'Quantity must be between 1 and 100';
  end if;

  if not exists (
    select 1 from public.locations
    where id = target_location_id and organization_id = target_organization_id
  ) or not exists (
    select 1 from public.cocktails
    where id = target_cocktail_id
      and organization_id = target_organization_id
      and is_active
  ) then
    raise exception 'Cocktail or location not found';
  end if;

  if product_selections is null or jsonb_typeof(product_selections) <> 'object' then
    raise exception 'Product selections must be an object';
  end if;

  select count(*) into recipe_count
  from public.cocktail_ingredients
  where cocktail_id = target_cocktail_id
    and organization_id = target_organization_id;

  select count(*) into selection_count from jsonb_object_keys(product_selections);
  if recipe_count = 0 or selection_count <> recipe_count then
    raise exception 'Select one product for every recipe ingredient';
  end if;

  -- Lock all selected balances in the same order across recipes to avoid deadlocks.
  perform 1 from public.inventory_balances
    where location_id = target_location_id
      and inventory_product_id in (select value::uuid from jsonb_each_text(product_selections))
    order by inventory_product_id for update;

  insert into public.cocktail_productions (
    organization_id, location_id, cocktail_id, quantity, performed_by, request_id, request_selections
  ) values (
    target_organization_id, target_location_id, target_cocktail_id,
    production_quantity, auth.uid(), request_id, product_selections
  ) returning id into new_production_id;

  for recipe_line in
    select * from public.cocktail_ingredients
    where cocktail_id = target_cocktail_id
      and organization_id = target_organization_id
    order by id
  loop
    begin
      selected_product_id := (product_selections ->> recipe_line.id::text)::uuid;
    exception when others then
      raise exception 'Invalid product selection';
    end;

    if selected_product_id is null or not exists (
      select 1
      from public.inventory_products product
      join public.location_products location_product
        on location_product.inventory_product_id = product.id
       and location_product.location_id = target_location_id
      where product.id = selected_product_id
        and product.organization_id = target_organization_id
        and product.ingredient_id = recipe_line.ingredient_id
        and product.is_active
        and location_product.is_available
        and (
          recipe_line.selection_policy <> 'require_product'
          or product.id = recipe_line.preferred_product_id
        )
    ) then
      raise exception 'A selected product is not eligible for this recipe';
    end if;

    required_quantity := recipe_line.quantity_in_base_unit * production_quantity;

    select quantity into current_quantity
    from public.inventory_balances
    where location_id = target_location_id
      and inventory_product_id = selected_product_id
    for update;

    if current_quantity is null or current_quantity < required_quantity then
      raise exception 'Insufficient inventory for a selected product';
    end if;

    insert into public.cocktail_production_ingredients (
      production_id, cocktail_ingredient_id, inventory_product_id, quantity_used
    ) values (
      new_production_id, recipe_line.id, selected_product_id, required_quantity
    );

    insert into public.inventory_movements (
      organization_id, location_id, inventory_product_id, movement_type,
      quantity_delta, reference_type, reference_id, performed_by
    ) values (
      target_organization_id, target_location_id, selected_product_id,
      'drink_production', -required_quantity, 'cocktail_production',
      new_production_id, auth.uid()
    );
  end loop;

  return new_production_id;
end;
$$;

revoke all on function public.make_cocktail(uuid, uuid, uuid, integer, jsonb, uuid) from public;
grant execute on function public.make_cocktail(uuid, uuid, uuid, integer, jsonb, uuid) to authenticated;
