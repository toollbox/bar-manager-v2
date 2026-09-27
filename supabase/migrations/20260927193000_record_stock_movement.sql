create function public.record_stock_movement(
  target_organization_id uuid,
  target_location_id uuid,
  target_inventory_product_id uuid,
  stock_movement_type public.inventory_movement_type,
  stock_quantity_delta numeric,
  movement_notes text default null
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_quantity numeric;
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

  if stock_movement_type not in ('purchase', 'waste', 'spill', 'correction') then
    raise exception 'Unsupported manual movement type';
  end if;

  if stock_quantity_delta = 0 then
    raise exception 'Movement quantity cannot be zero';
  end if;

  if stock_movement_type = 'purchase' and stock_quantity_delta < 0 then
    raise exception 'Received stock must increase inventory';
  end if;

  if stock_movement_type in ('waste', 'spill') and stock_quantity_delta > 0 then
    raise exception 'Waste and spills must decrease inventory';
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
    from public.inventory_products p
    join public.location_products lp
      on lp.inventory_product_id = p.id
     and lp.location_id = target_location_id
    where p.id = target_inventory_product_id
      and p.organization_id = target_organization_id
      and p.is_active
      and lp.is_available
  ) then
    raise exception 'Product is not available at this location';
  end if;

  insert into public.inventory_balances (
    location_id,
    inventory_product_id,
    quantity
  ) values (
    target_location_id,
    target_inventory_product_id,
    0
  )
  on conflict (location_id, inventory_product_id) do nothing;

  select quantity
  into current_quantity
  from public.inventory_balances
  where location_id = target_location_id
    and inventory_product_id = target_inventory_product_id
  for update;

  if current_quantity + stock_quantity_delta < 0 then
    raise exception 'Insufficient inventory';
  end if;

  insert into public.inventory_movements (
    organization_id,
    location_id,
    inventory_product_id,
    movement_type,
    quantity_delta,
    notes,
    performed_by
  ) values (
    target_organization_id,
    target_location_id,
    target_inventory_product_id,
    stock_movement_type,
    stock_quantity_delta,
    nullif(trim(movement_notes), ''),
    auth.uid()
  );

  return current_quantity + stock_quantity_delta;
end;
$$;

revoke all on function public.record_stock_movement(
  uuid, uuid, uuid, public.inventory_movement_type, numeric, text
) from public;

grant execute on function public.record_stock_movement(
  uuid, uuid, uuid, public.inventory_movement_type, numeric, text
) to authenticated;

comment on function public.record_stock_movement(
  uuid, uuid, uuid, public.inventory_movement_type, numeric, text
) is 'Records a serialized manual stock movement and rejects negative balances.';
