-- 20260415120000_sync_avatar_from_google.sql
-- Populate profiles.avatar_url from the Google OAuth metadata attached to
-- each auth.users row. Google returns the profile picture under either
-- `avatar_url` or `picture` inside raw_user_meta_data, so we coalesce both.

-- 1) Replace the new-user trigger so new signups get their avatar wired in
--    from the start (instead of a null row that has to be patched later).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_avatar_url   text;
begin
  v_display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1),
    'Jugador'
  );

  v_avatar_url := coalesce(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture'
  );

  insert into profiles (id, display_name, email, avatar_url)
  values (new.id, v_display_name, new.email, v_avatar_url)
  on conflict (id) do nothing;

  insert into players (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

-- 2) Backfill existing profiles whose avatar_url is still null.
--    Pulls from auth.users so users who already signed in with Google get
--    their picture without having to log in again.
update public.profiles p
set avatar_url = coalesce(
  u.raw_user_meta_data ->> 'avatar_url',
  u.raw_user_meta_data ->> 'picture'
)
from auth.users u
where u.id = p.id
  and p.avatar_url is null
  and (
    u.raw_user_meta_data ? 'avatar_url'
    or u.raw_user_meta_data ? 'picture'
  );
