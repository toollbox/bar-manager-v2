create function public.create_inventory_product(
  target_organization_id uuid,
  target_location_id uuid,
  target_ingredient_id uuid,
  product_brand text,
  product_name text,
  product_variant text default null,
  product_bottle_size numeric default null,
  product_default_cost numeric default null,
  opening_quantity numeric default 0,
  product_reorder_point numeric default 0,
  product_target_stock numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_product_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_organization_role(
    target_organization_id,
    array['owner', 'manager']::public.app_role[]
  ) then
    raise exception 'Insufficient permissions';
  end if;

  if opening_quantity < 0 then
    raise exception 'Opening quantity cannot be negative';
  end if;

  if product_reorder_point < 0 or product_target_stock < product_reorder_point then
    raise exception 'Target stock must be greater than or equal to reorder point';
  end if;

  if not exists (
    select 1
    from public.locations
    where id = target_location_id
      and organization_id = target_organization_id
  ) then
    raise exception 'Location does not belong to organization';
  end if;

  if not exists (
    select 1
    from public.ingredients
    where id = target_ingredient_id
      and organization_id = target_organization_id
      and is_active
  ) then
    raise exception 'Ingredient does not belong to organization';
  end if;

  insert into public.inventory_products (
    organization_id,
    ingredient_id,
    brand,
    name,
    variant,
    bottle_size,
    default_cost
  ) values (
    target_organization_id,
    target_ingredient_id,
    trim(product_brand),
    trim(product_name),
    nullif(trim(product_variant), ''),
    product_bottle_size,
    product_default_cost
  )
  returning id into new_product_id;

  insert into public.location_products (
    location_id,
    inventory_product_id,
    reorder_point,
    target_stock
  ) values (
    target_location_id,
    new_product_id,
    product_reorder_point,
    product_target_stock
  );

  if opening_quantity > 0 then
    insert into public.inventory_movements (
      organization_id,
      location_id,
      inventory_product_id,
      movement_type,
      quantity_delta,
      unit_cost,
      notes,
      performed_by
    ) values (
      target_organization_id,
      target_location_id,
      new_product_id,
      'opening_balance',
      opening_quantity,
      product_default_cost,
      'Opening inventory',
      auth.uid()
    );
  end if;

  return new_product_id;
end;
$$;

revoke all on function public.create_inventory_product(
  uuid, uuid, uuid, text, text, text, numeric, numeric, numeric, numeric, numeric
) from public;

grant execute on function public.create_inventory_product(
  uuid, uuid, uuid, text, text, text, numeric, numeric, numeric, numeric, numeric
) to authenticated;

comment on function public.create_inventory_product(
  uuid, uuid, uuid, text, text, text, numeric, numeric, numeric, numeric, numeric
) is 'Atomically creates a branded product, location settings, and opening inventory.';
