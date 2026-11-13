-- All client stock writes must use the validated security-definer functions.
drop policy movements_insert_staff on public.inventory_movements;
revoke insert, update, delete on public.inventory_movements from anon, authenticated;
revoke insert, update, delete on public.inventory_balances from anon, authenticated;

create or replace function public.apply_inventory_movement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.locations l
    join public.inventory_products p on p.id = new.inventory_product_id
    where l.id = new.location_id and l.organization_id = new.organization_id
      and p.organization_id = new.organization_id
  ) then raise exception 'Stock location and product must belong to the organization'; end if;

  insert into public.inventory_balances (location_id, inventory_product_id, quantity)
  values (new.location_id, new.inventory_product_id, 0)
  on conflict do nothing;
  update public.inventory_balances
  set quantity = quantity + new.quantity_delta, updated_at = now()
  where location_id = new.location_id and inventory_product_id = new.inventory_product_id
    and quantity + new.quantity_delta >= 0;
  if not found then raise exception 'Insufficient inventory'; end if;
  return new;
end;
$$;

-- Snapshot names and measures, independent of subsequent catalog edits.
alter table public.cocktail_productions add column cocktail_name text;
update public.cocktail_productions p set cocktail_name = c.name
from public.cocktails c where c.id = p.cocktail_id;
alter table public.cocktail_productions alter column cocktail_name set not null;
alter table public.cocktail_production_ingredients
  add column ingredient_name text,
  add column base_unit public.base_unit,
  add column product_label text,
  add column recipe_quantity numeric(12,3),
  add column recipe_policy public.recipe_selection_policy;
update public.cocktail_production_ingredients pi
set ingredient_name = i.name, base_unit = i.base_unit,
    product_label = p.brand || ' ' || p.name,
    recipe_quantity = ci.quantity_in_base_unit, recipe_policy = ci.selection_policy
from public.cocktail_ingredients ci
join public.ingredients i on i.id = ci.ingredient_id
join public.inventory_products p on p.ingredient_id = i.id
where ci.id = pi.cocktail_ingredient_id and p.id = pi.inventory_product_id;
alter table public.cocktail_production_ingredients
  alter column ingredient_name set not null,
  alter column base_unit set not null,
  alter column product_label set not null,
  alter column recipe_quantity set not null,
  alter column recipe_policy set not null,
  alter column cocktail_ingredient_id drop not null,
  drop constraint cocktail_production_ingredients_cocktail_ingredient_id_fkey,
  add foreign key (cocktail_ingredient_id) references public.cocktail_ingredients(id) on delete set null;

create function public.snapshot_production()
returns trigger language plpgsql set search_path = '' as $$
begin
  select name into new.cocktail_name from public.cocktails where id = new.cocktail_id;
  return new;
end;
$$;
create trigger snapshot_production before insert on public.cocktail_productions
for each row execute function public.snapshot_production();

create function public.snapshot_production_ingredient()
returns trigger language plpgsql set search_path = '' as $$
begin
  select i.name, i.base_unit, p.brand || ' ' || p.name,
         ci.quantity_in_base_unit, ci.selection_policy
  into new.ingredient_name, new.base_unit, new.product_label,
       new.recipe_quantity, new.recipe_policy
  from public.cocktail_ingredients ci
  join public.ingredients i on i.id = ci.ingredient_id
  join public.inventory_products p on p.id = new.inventory_product_id
  where ci.id = new.cocktail_ingredient_id;
  return new;
end;
$$;
create trigger snapshot_production_ingredient before insert on public.cocktail_production_ingredients
for each row execute function public.snapshot_production_ingredient();

-- A pour holds a shared recipe lock; recipe edits take an exclusive lock.
create function public.lock_recipe_edit()
returns trigger language plpgsql set search_path = '' as $$
begin
  perform 1 from public.cocktails where id = coalesce(new.cocktail_id, old.cocktail_id) for update;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger lock_recipe_edit before insert or update or delete on public.cocktail_ingredients
for each row execute function public.lock_recipe_edit();

alter table public.cocktail_productions add column request_id uuid,
  add column request_selections jsonb,
  add constraint production_request_unique unique (organization_id, request_id);

-- Keep inventory measures stable once recipes/stock reference an ingredient.
create function public.protect_ingredient_unit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.base_unit <> old.base_unit and (
    exists (select 1 from public.inventory_products where ingredient_id = old.id)
    or exists (select 1 from public.cocktail_ingredients where ingredient_id = old.id)
  ) then raise exception 'Base unit cannot change once an ingredient is used'; end if;
  return new;
end;
$$;
create trigger protect_ingredient_unit before update on public.ingredients
for each row execute function public.protect_ingredient_unit();
