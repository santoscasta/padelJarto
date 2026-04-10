-- Clubs: optional community entity for grouping tournaments.

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_path text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists clubs_created_by_idx on public.clubs (created_by);

-- Add club reference to tournaments.
alter table public.tournaments
  add column if not exists club_id uuid references public.clubs(id) on delete set null;

-- RLS for clubs.
alter table public.clubs enable row level security;

drop policy if exists "clubs_public_read" on public.clubs;
create policy "clubs_public_read" on public.clubs
for select to authenticated
using (true);

drop policy if exists "clubs_creator_insert" on public.clubs;
create policy "clubs_creator_insert" on public.clubs
for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists "clubs_creator_update" on public.clubs;
create policy "clubs_creator_update" on public.clubs
for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());
