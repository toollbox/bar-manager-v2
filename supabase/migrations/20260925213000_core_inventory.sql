create extension if not exists pgcrypto;

create type public.app_role as enum ('owner', 'manager', 'bartender');
create type public.base_unit as enum ('ml', 'g', 'each');
create type public.inventory_movement_type as enum (
  'opening_balance',
  'purchase',
  'drink_production',
  'waste',
  'spill',
  'correction',
  'transfer_in',
  'transfer_out'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  category text not null check (char_length(trim(category)) between 1 and 80),
  base_unit public.base_unit not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.inventory_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  brand text not null check (char_length(trim(brand)) between 1 and 120),
  name text not null check (char_length(trim(name)) between 1 and 160),
  variant text,
  bottle_size numeric(12, 3) check (bottle_size > 0),
  barcode text,
  sku text,
  default_cost numeric(12, 2) check (default_cost >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, brand, name, variant),
  unique (organization_id, sku),
  unique (organization_id, barcode)
);

create table public.location_products (
  location_id uuid not null references public.locations(id) on delete cascade,
  inventory_product_id uuid not null references public.inventory_products(id) on delete cascade,
  reorder_point numeric(14, 3) not null default 0 check (reorder_point >= 0),
  target_stock numeric(14, 3) not null default 0 check (target_stock >= reorder_point),
  is_available boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (location_id, inventory_product_id)
);

create table public.location_ingredient_defaults (
  location_id uuid not null references public.locations(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  inventory_product_id uuid not null references public.inventory_products(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (location_id, ingredient_id)
);

create table public.inventory_balances (
  location_id uuid not null references public.locations(id) on delete cascade,
  inventory_product_id uuid not null references public.inventory_products(id) on delete restrict,
  quantity numeric(14, 3) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (location_id, inventory_product_id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  inventory_product_id uuid not null references public.inventory_products(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity_delta numeric(14, 3) not null check (quantity_delta <> 0),
  unit_cost numeric(12, 4) check (unit_cost >= 0),
  reference_type text,
  reference_id uuid,
  notes text check (char_length(notes) <= 1000),
  performed_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index inventory_products_ingredient_idx
  on public.inventory_products (ingredient_id);
create index inventory_movements_product_time_idx
  on public.inventory_movements (location_id, inventory_product_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ingredients_set_updated_at
before update on public.ingredients
for each row execute function public.set_updated_at();

create trigger inventory_products_set_updated_at
before update on public.inventory_products
for each row execute function public.set_updated_at();

create trigger location_products_set_updated_at
before update on public.location_products
for each row execute function public.set_updated_at();

create trigger location_ingredient_defaults_set_updated_at
before update on public.location_ingredient_defaults
for each row execute function public.set_updated_at();

create function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.inventory_balances (
    location_id,
    inventory_product_id,
    quantity,
    updated_at
  ) values (
    new.location_id,
    new.inventory_product_id,
    new.quantity_delta,
    now()
  )
  on conflict (location_id, inventory_product_id)
  do update set
    quantity = public.inventory_balances.quantity + excluded.quantity,
    updated_at = now();

  return new;
end;
$$;

create trigger inventory_movement_updates_balance
after insert on public.inventory_movements
for each row execute function public.apply_inventory_movement();

create function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

create function public.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

create function public.create_organization(
  organization_name text,
  first_location_name text,
  location_timezone text default 'UTC'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.organizations (name)
  values (trim(organization_name))
  returning id into new_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization_id, auth.uid(), 'owner');

  insert into public.locations (organization_id, name, timezone)
  values (new_organization_id, trim(first_location_name), location_timezone);

  return new_organization_id;
end;
$$;

revoke all on function public.create_organization(text, text, text) from public;
grant execute on function public.create_organization(text, text, text) to authenticated;

alter table public.organizations enable row level security;
alter table public.locations enable row level security;
alter table public.organization_members enable row level security;
alter table public.ingredients enable row level security;
alter table public.inventory_products enable row level security;
alter table public.location_products enable row level security;
alter table public.location_ingredient_defaults enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.inventory_movements enable row level security;

create policy organizations_select_member on public.organizations
for select to authenticated
using (public.is_organization_member(id));

create policy organizations_update_owner on public.organizations
for update to authenticated
using (public.has_organization_role(id, array['owner']::public.app_role[]))
with check (public.has_organization_role(id, array['owner']::public.app_role[]));

create policy locations_select_member on public.locations
for select to authenticated
using (public.is_organization_member(organization_id));

create policy locations_manage_owner on public.locations
for all to authenticated
using (public.has_organization_role(organization_id, array['owner']::public.app_role[]))
with check (public.has_organization_role(organization_id, array['owner']::public.app_role[]));

create policy members_select_same_organization on public.organization_members
for select to authenticated
using (public.is_organization_member(organization_id));

create policy members_manage_owner on public.organization_members
for all to authenticated
using (public.has_organization_role(organization_id, array['owner']::public.app_role[]))
with check (public.has_organization_role(organization_id, array['owner']::public.app_role[]));

create policy ingredients_select_member on public.ingredients
for select to authenticated
using (public.is_organization_member(organization_id));

create policy ingredients_manage_staff on public.ingredients
for all to authenticated
using (public.has_organization_role(organization_id, array['owner', 'manager']::public.app_role[]))
with check (public.has_organization_role(organization_id, array['owner', 'manager']::public.app_role[]));

create policy products_select_member on public.inventory_products
for select to authenticated
using (public.is_organization_member(organization_id));

create policy products_manage_staff on public.inventory_products
for all to authenticated
using (public.has_organization_role(organization_id, array['owner', 'manager']::public.app_role[]))
with check (public.has_organization_role(organization_id, array['owner', 'manager']::public.app_role[]));

create policy location_products_select_member on public.location_products
for select to authenticated
using (
  exists (
    select 1 from public.locations
    where id = location_id
      and public.is_organization_member(organization_id)
  )
);

create policy location_products_manage_staff on public.location_products
for all to authenticated
using (
  exists (
    select 1 from public.locations
    where id = location_id
      and public.has_organization_role(
        organization_id,
        array['owner', 'manager']::public.app_role[]
      )
  )
)
with check (
  exists (
    select 1 from public.locations
    where id = location_id
      and public.has_organization_role(
        organization_id,
        array['owner', 'manager']::public.app_role[]
      )
  )
);

create policy defaults_select_member on public.location_ingredient_defaults
for select to authenticated
using (
  exists (
    select 1 from public.locations
    where id = location_id
      and public.is_organization_member(organization_id)
  )
);

create policy defaults_manage_staff on public.location_ingredient_defaults
for all to authenticated
using (
  exists (
    select 1 from public.locations
    where id = location_id
      and public.has_organization_role(
        organization_id,
        array['owner', 'manager']::public.app_role[]
      )
  )
)
with check (
  exists (
    select 1 from public.locations
    where id = location_id
      and public.has_organization_role(
        organization_id,
        array['owner', 'manager']::public.app_role[]
      )
  )
);

create policy balances_select_member on public.inventory_balances
for select to authenticated
using (
  exists (
    select 1 from public.locations
    where id = location_id
      and public.is_organization_member(organization_id)
  )
);

create policy movements_select_member on public.inventory_movements
for select to authenticated
using (public.is_organization_member(organization_id));

create policy movements_insert_staff on public.inventory_movements
for insert to authenticated
with check (
  performed_by = auth.uid()
  and public.has_organization_role(
    organization_id,
    array['owner', 'manager']::public.app_role[]
  )
);

comment on table public.ingredients is
  'Generic recipe concepts such as Vodka, Gin, or Lime Juice.';
comment on table public.inventory_products is
  'Exact branded products/SKUs stocked by the bar, such as Grey Goose Original.';
comment on table public.inventory_movements is
  'Immutable source of truth for every inventory quantity change.';
