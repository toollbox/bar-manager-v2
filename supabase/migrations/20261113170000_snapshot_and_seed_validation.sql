do $$
declare definition text;
begin
  select pg_get_functiondef('public.seed_starter_bar(uuid,uuid)'::regprocedure) into definition;
  definition := replace(definition, 'added_cocktails uuid[] := ''{}'';', 'added_cocktails uuid[] := ARRAY[]::uuid[];');
  execute definition;
end;
$$;

create or replace function public.snapshot_production_ingredient()
returns trigger language plpgsql set search_path = '' as $$
begin
  select i.name, i.base_unit, p.brand || ' ' || p.name,
         ci.quantity_in_base_unit, ci.selection_policy
  into new.ingredient_name, new.base_unit, new.product_label,
       new.recipe_quantity, new.recipe_policy
  from public.cocktail_ingredients ci
  join public.ingredients i on i.id = ci.ingredient_id
  join public.inventory_products p on p.id = new.inventory_product_id
    and p.ingredient_id = ci.ingredient_id and p.organization_id = ci.organization_id
  where ci.id = new.cocktail_ingredient_id and i.is_active and p.is_active;
  if not found then raise exception 'A selected ingredient or product is not eligible for this recipe'; end if;
  return new;
end;
$$;
