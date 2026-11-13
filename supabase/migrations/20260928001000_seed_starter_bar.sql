create function public.seed_starter_bar(
  target_organization_id uuid,
  target_location_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  recipe jsonb;
  ingredient_id_value uuid;
  product_id_value uuid;
  cocktail_id_value uuid;
  created_products integer := 0;
  created_cocktails integer := 0;
begin
  if not public.has_organization_role(
    target_organization_id,
    array['owner']::public.app_role[]
  ) then
    raise exception 'Only an owner can load starter data';
  end if;
  if not exists (
    select 1 from public.locations
    where id = target_location_id and organization_id = target_organization_id
  ) then
    raise exception 'Location not found';
  end if;

  for item in select value from jsonb_array_elements('[
    {"name":"Vodka","category":"Spirit","unit":"ml"},
    {"name":"Tequila","category":"Spirit","unit":"ml"},
    {"name":"Orange Liqueur","category":"Liqueur","unit":"ml"},
    {"name":"White Rum","category":"Spirit","unit":"ml"},
    {"name":"Gin","category":"Spirit","unit":"ml"},
    {"name":"Bourbon","category":"Spirit","unit":"ml"},
    {"name":"Lime Juice","category":"Juice","unit":"ml"},
    {"name":"Lemon Juice","category":"Juice","unit":"ml"},
    {"name":"Simple Syrup","category":"Syrup","unit":"ml"},
    {"name":"Ginger Beer","category":"Mixer","unit":"ml"},
    {"name":"Tonic Water","category":"Mixer","unit":"ml"},
    {"name":"Soda Water","category":"Mixer","unit":"ml"},
    {"name":"Aromatic Bitters","category":"Bitters","unit":"ml"},
    {"name":"Mint","category":"Garnish","unit":"each"}
  ]'::jsonb)
  loop
    insert into public.ingredients (organization_id, name, category, base_unit)
    values (
      target_organization_id, item->>'name', item->>'category',
      (item->>'unit')::public.base_unit
    )
    on conflict (organization_id, name) do nothing;
  end loop;

  for item in select value from jsonb_array_elements('[
    {"ingredient":"Vodka","brand":"Smirnoff","name":"No. 21 Vodka","size":750,"cost":18,"opening":3000,"reorder":750,"target":4500},
    {"ingredient":"Vodka","brand":"Grey Goose","name":"Original","size":750,"cost":34,"opening":1500,"reorder":750,"target":3000},
    {"ingredient":"Tequila","brand":"Jose Cuervo","name":"Especial Silver","size":750,"cost":22,"opening":2250,"reorder":750,"target":3750},
    {"ingredient":"Orange Liqueur","brand":"Cointreau","name":"Orange Liqueur","size":750,"cost":38,"opening":1500,"reorder":500,"target":2250},
    {"ingredient":"White Rum","brand":"Bacardi","name":"Superior","size":750,"cost":17,"opening":2250,"reorder":750,"target":3750},
    {"ingredient":"Gin","brand":"Bombay Sapphire","name":"London Dry Gin","size":750,"cost":26,"opening":2250,"reorder":750,"target":3750},
    {"ingredient":"Bourbon","brand":"Maker''s Mark","name":"Kentucky Straight Bourbon","size":750,"cost":29,"opening":2250,"reorder":750,"target":3750},
    {"ingredient":"Lime Juice","brand":"House","name":"Fresh Lime Juice","size":1000,"cost":8,"opening":2000,"reorder":500,"target":3000},
    {"ingredient":"Lemon Juice","brand":"House","name":"Fresh Lemon Juice","size":1000,"cost":8,"opening":1500,"reorder":500,"target":2500},
    {"ingredient":"Simple Syrup","brand":"House","name":"Simple Syrup","size":1000,"cost":5,"opening":2000,"reorder":500,"target":3000},
    {"ingredient":"Ginger Beer","brand":"Fever-Tree","name":"Premium Ginger Beer","size":200,"cost":2,"opening":2400,"reorder":800,"target":4000},
    {"ingredient":"Tonic Water","brand":"Fever-Tree","name":"Premium Indian Tonic","size":200,"cost":2,"opening":2400,"reorder":800,"target":4000},
    {"ingredient":"Soda Water","brand":"House","name":"Soda Water","size":1000,"cost":2,"opening":3000,"reorder":1000,"target":5000},
    {"ingredient":"Aromatic Bitters","brand":"Angostura","name":"Aromatic Bitters","size":200,"cost":14,"opening":400,"reorder":100,"target":600},
    {"ingredient":"Mint","brand":"House","name":"Fresh Mint Leaves","size":50,"cost":4,"opening":100,"reorder":30,"target":150}
  ]'::jsonb)
  loop
    select id into ingredient_id_value from public.ingredients
    where organization_id = target_organization_id and name = item->>'ingredient';
    select id into product_id_value from public.inventory_products
    where organization_id = target_organization_id
      and ingredient_id = ingredient_id_value
      and brand = item->>'brand' and name = item->>'name'
    limit 1;
    if product_id_value is null then
      insert into public.inventory_products (
        organization_id, ingredient_id, brand, name, bottle_size, default_cost
      ) values (
        target_organization_id, ingredient_id_value, item->>'brand', item->>'name',
        (item->>'size')::numeric, (item->>'cost')::numeric
      ) returning id into product_id_value;
      created_products := created_products + 1;
    end if;
    insert into public.location_products (
      location_id, inventory_product_id, reorder_point, target_stock
    ) values (
      target_location_id, product_id_value,
      (item->>'reorder')::numeric, (item->>'target')::numeric
    ) on conflict (location_id, inventory_product_id) do update set
      reorder_point = excluded.reorder_point,
      target_stock = excluded.target_stock,
      is_available = true;
    if not exists (
      select 1 from public.inventory_balances
      where location_id = target_location_id and inventory_product_id = product_id_value
    ) then
      insert into public.inventory_movements (
        organization_id, location_id, inventory_product_id, movement_type,
        quantity_delta, notes, performed_by
      ) values (
        target_organization_id, target_location_id, product_id_value,
        'opening_balance', (item->>'opening')::numeric,
        'Starter bar opening stock', auth.uid()
      );
    end if;
    product_id_value := null;
  end loop;

  for item in select value from jsonb_array_elements('[
    {"name":"Margarita","description":"Bright, citrusy tequila classic.","instructions":"Shake with ice and strain into a salt-rimmed glass.","glass":"Coupe","garnish":"Lime wheel"},
    {"name":"Moscow Mule","description":"Vodka, lime, and spicy ginger beer.","instructions":"Build over ice and stir gently.","glass":"Copper mug","garnish":"Lime wheel"},
    {"name":"Old Fashioned","description":"Spirit-forward bourbon classic.","instructions":"Stir with ice and strain over a large cube.","glass":"Rocks","garnish":"Orange peel"},
    {"name":"Mojito","description":"Fresh mint, lime, rum, and soda.","instructions":"Gently muddle mint with syrup and lime, add rum and ice, then top with soda.","glass":"Highball","garnish":"Mint sprig"},
    {"name":"Gin and Tonic","description":"Crisp gin with premium tonic.","instructions":"Build over ice and stir once.","glass":"Highball","garnish":"Lime wheel"},
    {"name":"Whiskey Sour","description":"Balanced bourbon, lemon, and sugar.","instructions":"Shake with ice and strain over fresh ice.","glass":"Rocks","garnish":"Lemon peel"}
  ]'::jsonb)
  loop
    insert into public.cocktails (
      organization_id, name, description, instructions, glassware, garnish
    ) values (
      target_organization_id, item->>'name', item->>'description',
      item->>'instructions', item->>'glass', item->>'garnish'
    ) on conflict (organization_id, name) do nothing;
    if found then created_cocktails := created_cocktails + 1; end if;
  end loop;

  for recipe in select value from jsonb_array_elements('[
    {"cocktail":"Margarita","ingredient":"Tequila","amount":50,"policy":"prefer_product","brand":"Jose Cuervo"},
    {"cocktail":"Margarita","ingredient":"Orange Liqueur","amount":25,"policy":"prefer_product","brand":"Cointreau"},
    {"cocktail":"Margarita","ingredient":"Lime Juice","amount":25,"policy":"any_product"},
    {"cocktail":"Moscow Mule","ingredient":"Vodka","amount":50,"policy":"prefer_product","brand":"Smirnoff"},
    {"cocktail":"Moscow Mule","ingredient":"Lime Juice","amount":15,"policy":"any_product"},
    {"cocktail":"Moscow Mule","ingredient":"Ginger Beer","amount":120,"policy":"any_product"},
    {"cocktail":"Old Fashioned","ingredient":"Bourbon","amount":60,"policy":"require_product","brand":"Maker''s Mark"},
    {"cocktail":"Old Fashioned","ingredient":"Simple Syrup","amount":8,"policy":"any_product"},
    {"cocktail":"Old Fashioned","ingredient":"Aromatic Bitters","amount":3,"policy":"any_product"},
    {"cocktail":"Mojito","ingredient":"White Rum","amount":50,"policy":"prefer_product","brand":"Bacardi"},
    {"cocktail":"Mojito","ingredient":"Lime Juice","amount":25,"policy":"any_product"},
    {"cocktail":"Mojito","ingredient":"Simple Syrup","amount":15,"policy":"any_product"},
    {"cocktail":"Mojito","ingredient":"Mint","amount":8,"policy":"any_product"},
    {"cocktail":"Mojito","ingredient":"Soda Water","amount":60,"policy":"any_product"},
    {"cocktail":"Gin and Tonic","ingredient":"Gin","amount":50,"policy":"prefer_product","brand":"Bombay Sapphire"},
    {"cocktail":"Gin and Tonic","ingredient":"Tonic Water","amount":120,"policy":"any_product"},
    {"cocktail":"Whiskey Sour","ingredient":"Bourbon","amount":50,"policy":"any_product"},
    {"cocktail":"Whiskey Sour","ingredient":"Lemon Juice","amount":25,"policy":"any_product"},
    {"cocktail":"Whiskey Sour","ingredient":"Simple Syrup","amount":20,"policy":"any_product"}
  ]'::jsonb)
  loop
    select id into cocktail_id_value from public.cocktails
    where organization_id = target_organization_id and name = recipe->>'cocktail';
    select id into ingredient_id_value from public.ingredients
    where organization_id = target_organization_id and name = recipe->>'ingredient';
    product_id_value := null;
    if recipe ? 'brand' then
      select id into product_id_value from public.inventory_products
      where organization_id = target_organization_id
        and ingredient_id = ingredient_id_value
        and brand = recipe->>'brand'
      limit 1;
    end if;
    insert into public.cocktail_ingredients (
      organization_id, cocktail_id, ingredient_id, preferred_product_id,
      selection_policy, quantity_in_base_unit
    ) values (
      target_organization_id, cocktail_id_value, ingredient_id_value,
      product_id_value, (recipe->>'policy')::public.recipe_selection_policy,
      (recipe->>'amount')::numeric
    ) on conflict (cocktail_id, ingredient_id) do update set
      preferred_product_id = excluded.preferred_product_id,
      selection_policy = excluded.selection_policy,
      quantity_in_base_unit = excluded.quantity_in_base_unit;
  end loop;

  return jsonb_build_object(
    'products_created', created_products,
    'cocktails_created', created_cocktails
  );
end;
$$;

revoke all on function public.seed_starter_bar(uuid, uuid) from public;
grant execute on function public.seed_starter_bar(uuid, uuid) to authenticated;
