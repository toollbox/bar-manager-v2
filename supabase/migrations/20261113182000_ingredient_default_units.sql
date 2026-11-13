-- Keep the ingredient's chosen unit separate from its canonical stock unit.
-- ml and US fl oz share canonical ml, so switching between them is safe even
-- for ingredients already used in stock and recipes.
alter table public.ingredients add column default_unit text;
update public.ingredients set default_unit = base_unit::text;
alter table public.ingredients
  alter column default_unit set not null,
  add constraint valid_ingredient_default_unit check (
    default_unit = base_unit::text or (base_unit = 'ml' and default_unit = 'fl_oz')
  );

create function public.set_ingredient_default_unit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.default_unit is null then
    new.default_unit := new.base_unit::text;
  elsif tg_op = 'UPDATE' then
    if new.base_unit <> old.base_unit and new.default_unit = old.default_unit then
      new.default_unit := new.base_unit::text;
    end if;
  end if;
  return new;
end;
$$;
create trigger set_ingredient_default_unit before insert or update of base_unit, default_unit
on public.ingredients for each row execute function public.set_ingredient_default_unit();

-- New products inherit the ingredient's chosen unit unless one is specified.
create or replace function public.validate_product_stock_unit()
returns trigger language plpgsql set search_path = '' as $$
declare ingredient_unit text; ingredient_default text;
begin
  select base_unit::text, default_unit into ingredient_unit, ingredient_default
  from public.ingredients where id = new.ingredient_id and organization_id = new.organization_id;
  new.stock_unit := coalesce(new.stock_unit, ingredient_default);
  if ingredient_unit is null or not (
    new.stock_unit = ingredient_unit or
    (ingredient_unit = 'ml' and new.stock_unit = 'fl_oz')
  ) then raise exception 'Stock unit does not match the ingredient'; end if;
  return new;
end;
$$;
