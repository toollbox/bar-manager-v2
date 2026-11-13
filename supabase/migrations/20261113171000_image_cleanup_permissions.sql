-- Storage's remove API needs SELECT as well as DELETE on the object's row.
create policy catalog_images_select_staff on storage.objects
for select to authenticated
using (
  bucket_id = 'catalog-images'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and public.has_organization_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner','manager']::public.app_role[]
  )
);
