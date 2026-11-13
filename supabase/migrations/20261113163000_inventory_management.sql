create function public.update_inventory_product(
  target_organization_id uuid, target_location_id uuid, target_product_id uuid,
  product_brand text, product_name text, product_bottle_size numeric,
  product_cost numeric, product_reorder_point numeric, product_target_stock numeric,
  product_image_url text default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_organization_role(target_organization_id, array['owner','manager']::public.app_role[]) then
    raise exception 'Not authorized';
  end if;
  if not exists (select 1 from public.locations where id = target_location_id and organization_id = target_organization_id) then
    raise exception 'Location not found';
  end if;
  update public.inventory_products set brand = trim(product_brand), name = trim(product_name),
    bottle_size = product_bottle_size, default_cost = product_cost, image_url = nullif(product_image_url, '')
  where id = target_product_id and organization_id = target_organization_id;
  if not found then raise exception 'Product not found'; end if;
  insert into public.location_products(location_id, inventory_product_id, reorder_point, target_stock)
  values(target_location_id, target_product_id, product_reorder_point, product_target_stock)
  on conflict(location_id, inventory_product_id) do update set
    reorder_point = excluded.reorder_point, target_stock = excluded.target_stock;
end;
$$;
revoke all on function public.update_inventory_product(uuid,uuid,uuid,text,text,numeric,numeric,numeric,numeric,text) from public;
grant execute on function public.update_inventory_product(uuid,uuid,uuid,text,text,numeric,numeric,numeric,numeric,text) to authenticated;

-- Reject cross-organization catalog links even when writes bypass the UI.
alter table public.inventory_products add constraint products_same_organization_ingredient
foreign key(organization_id, ingredient_id) references public.ingredients(organization_id, id);

create function public.validate_location_product()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.locations l join public.inventory_products p
    on p.organization_id = l.organization_id
    where l.id = new.location_id and p.id = new.inventory_product_id) then
    raise exception 'Location and product must belong to the same organization';
  end if;
  return new;
end;
$$;
create trigger validate_location_product before insert or update on public.location_products
for each row execute function public.validate_location_product();
