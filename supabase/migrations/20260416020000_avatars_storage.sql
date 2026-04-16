-- 20260416020000_avatars_storage.sql
-- Create the public `avatars` storage bucket and scoped RLS policies so
-- each user can upload/replace/delete only objects under their own prefix
-- (e.g. `avatars/{auth.uid()}/avatar.jpg`).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Users can INSERT objects into their own folder inside the avatars bucket.
create policy "avatars_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can UPDATE (upsert) objects in their own folder.
create policy "avatars_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can DELETE objects in their own folder.
create policy "avatars_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- SELECT stays open: the bucket is public so anyone can fetch avatar images.
