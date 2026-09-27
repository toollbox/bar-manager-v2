alter table public.ingredients
  add column image_path text,
  add column image_url text check (image_url is null or image_url ~ '^https://');

alter table public.inventory_products
  add column image_path text,
  add column image_url text check (image_url is null or image_url ~ '^https://');

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'catalog-images',
  'catalog-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy catalog_images_insert_staff
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'catalog-images'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.has_organization_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'manager']::public.app_role[]
  )
);

create policy catalog_images_update_staff
on storage.objects
for update
to authenticated
using (
  bucket_id = 'catalog-images'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.has_organization_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'manager']::public.app_role[]
  )
)
with check (
  bucket_id = 'catalog-images'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.has_organization_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'manager']::public.app_role[]
  )
);

create policy catalog_images_delete_staff
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'catalog-images'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.has_organization_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'manager']::public.app_role[]
  )
);

comment on column public.ingredients.image_path is
  'Object path in the public catalog-images Storage bucket.';
comment on column public.ingredients.image_url is
  'Optional external HTTPS image used when no uploaded image exists.';
comment on column public.inventory_products.image_path is
  'Object path in the public catalog-images Storage bucket.';
comment on column public.inventory_products.image_url is
  'Optional external HTTPS image used when no uploaded image exists.';
