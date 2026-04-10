-- Profile enhancements: add username, city, level, dominant hand per PadelFlow spec.

alter table public.profiles
  add column if not exists username text unique,
  add column if not exists city text,
  add column if not exists level text,
  add column if not exists dominant_hand text check (dominant_hand in ('right', 'left', 'ambidextrous'));

-- Allow public limited reads for profiles (search by username, display in matches).
drop policy if exists "profiles_public_limited_read" on public.profiles;
create policy "profiles_public_limited_read" on public.profiles
for select to authenticated
using (true);

-- Drop the old self-read policy since the new one is broader.
drop policy if exists "profiles_self_read" on public.profiles;
