-- Display inventory in the unit chosen for each product; canonical balances
-- and production calculations continue to use the ingredient's base unit.
alter table public.inventory_products add column stock_unit text;
update public.inventory_products p set stock_unit = i.base_unit::text
from public.ingredients i where i.id = p.ingredient_id;
alter table public.inventory_products
  alter column stock_unit set not null,
  add constraint valid_stock_unit check (stock_unit in ('ml', 'fl_oz', 'g', 'each'));

create function public.validate_product_stock_unit()
returns trigger language plpgsql set search_path = '' as $$
declare ingredient_unit text;
begin
  select base_unit::text into ingredient_unit from public.ingredients
  where id = new.ingredient_id and organization_id = new.organization_id;
  new.stock_unit := coalesce(new.stock_unit, ingredient_unit);
  if ingredient_unit is null or not (
    new.stock_unit = ingredient_unit or
    (ingredient_unit = 'ml' and new.stock_unit = 'fl_oz')
  ) then raise exception 'Stock unit does not match the ingredient'; end if;
  return new;
end;
$$;
create trigger validate_product_stock_unit before insert or update of stock_unit, ingredient_id, organization_id
on public.inventory_products for each row execute function public.validate_product_stock_unit();

-- Add optional unit parameters to the existing atomic product operations.
drop function public.create_inventory_product(uuid,uuid,uuid,text,text,text,numeric,numeric,numeric,numeric,numeric);
drop function public.update_inventory_product(uuid,uuid,uuid,text,text,numeric,numeric,numeric,numeric,text);

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
  product_target_stock numeric default 0,
  product_stock_unit text default null
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
    default_cost,
    stock_unit
  ) values (
    target_organization_id,
    target_ingredient_id,
    trim(product_brand),
    trim(product_name),
    nullif(trim(product_variant), ''),
    product_bottle_size,
    product_default_cost,
    product_stock_unit
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
  uuid, uuid, uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text
) from public;

grant execute on function public.create_inventory_product(
  uuid, uuid, uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text
) to authenticated;

comment on function public.create_inventory_product(
  uuid, uuid, uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text
) is 'Atomically creates a branded product, location settings, and opening inventory.';

create function public.update_inventory_product(
  target_organization_id uuid, target_location_id uuid, target_product_id uuid,
  product_brand text, product_name text, product_bottle_size numeric,
  product_cost numeric, product_reorder_point numeric, product_target_stock numeric,
  product_image_url text default null, product_stock_unit text default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_organization_role(target_organization_id, array['owner','manager']::public.app_role[]) then
    raise exception 'Not authorized';
  end if;
  if not exists (select 1 from public.locations where id = target_location_id and organization_id = target_organization_id) then
    raise exception 'Location not found';
  end if;
  update public.inventory_products set brand = trim(product_brand), name = trim(product_name),
    stock_unit = coalesce(product_stock_unit, stock_unit), bottle_size = product_bottle_size, default_cost = product_cost, image_url = nullif(product_image_url, '')
  where id = target_product_id and organization_id = target_organization_id;
  if not found then raise exception 'Product not found'; end if;
  insert into public.location_products(location_id, inventory_product_id, reorder_point, target_stock)
  values(target_location_id, target_product_id, product_reorder_point, product_target_stock)
  on conflict(location_id, inventory_product_id) do update set
    reorder_point = excluded.reorder_point, target_stock = excluded.target_stock;
end;
$$;
revoke all on function public.update_inventory_product(uuid,uuid,uuid,text,text,numeric,numeric,numeric,numeric,text,text) from public;
grant execute on function public.update_inventory_product(uuid,uuid,uuid,text,text,numeric,numeric,numeric,numeric,text,text) to authenticated;


