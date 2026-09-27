create type public.recipe_selection_policy as enum (
  'any_product',
  'prefer_product',
  'require_product'
);

alter table public.ingredients
  add constraint ingredients_organization_id_id_key unique (organization_id, id);

alter table public.inventory_products
  add constraint inventory_products_organization_id_id_key unique (organization_id, id),
  add constraint inventory_products_organization_ingredient_key
    unique (organization_id, ingredient_id, id);

create table public.cocktails (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text check (char_length(description) <= 500),
  instructions text not null check (char_length(trim(instructions)) between 1 and 4000),
  glassware text check (char_length(glassware) <= 120),
  garnish text check (char_length(garnish) <= 240),
  image_path text,
  image_url text check (image_url is null or image_url ~ '^https://'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, id)
);

create table public.cocktail_ingredients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cocktail_id uuid not null,
  ingredient_id uuid not null,
  preferred_product_id uuid,
  selection_policy public.recipe_selection_policy not null default 'any_product',
  quantity_in_base_unit numeric(12, 3) not null check (quantity_in_base_unit > 0),
  notes text check (char_length(notes) <= 240),
  created_at timestamptz not null default now(),
  foreign key (organization_id, cocktail_id)
    references public.cocktails(organization_id, id) on delete cascade,
  foreign key (organization_id, ingredient_id)
    references public.ingredients(organization_id, id) on delete restrict,
  foreign key (organization_id, ingredient_id, preferred_product_id)
    references public.inventory_products(organization_id, ingredient_id, id)
    on delete restrict,
  check (
    (selection_policy = 'any_product' and preferred_product_id is null)
    or (selection_policy in ('prefer_product', 'require_product') and preferred_product_id is not null)
  ),
  unique (cocktail_id, ingredient_id)
);

create index cocktail_ingredients_cocktail_idx
  on public.cocktail_ingredients (cocktail_id);
create index cocktail_ingredients_ingredient_idx
  on public.cocktail_ingredients (ingredient_id);

create trigger cocktails_set_updated_at
before update on public.cocktails
for each row execute function public.set_updated_at();

alter table public.cocktails enable row level security;
alter table public.cocktail_ingredients enable row level security;

create policy cocktails_select_member on public.cocktails
for select to authenticated
using (public.is_organization_member(organization_id));

create policy cocktails_manage_staff on public.cocktails
for all to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'manager']::public.app_role[]
  )
)
with check (
  public.has_organization_role(
    organization_id,
    array['owner', 'manager']::public.app_role[]
  )
);

create policy cocktail_ingredients_select_member on public.cocktail_ingredients
for select to authenticated
using (public.is_organization_member(organization_id));

create policy cocktail_ingredients_manage_staff on public.cocktail_ingredients
for all to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'manager']::public.app_role[]
  )
)
with check (
  public.has_organization_role(
    organization_id,
    array['owner', 'manager']::public.app_role[]
  )
);

comment on column public.cocktail_ingredients.selection_policy is
  'any_product allows substitution, prefer_product suggests a brand but allows substitution, require_product forbids substitution.';
