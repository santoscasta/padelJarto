-- Tournament expansion: more statuses, format, pair_mode, rules table, registrations.

-- Expand tournament statuses.
alter table public.tournaments
  drop constraint if exists tournaments_status_check;
alter table public.tournaments
  add constraint tournaments_status_check
  check (status in ('draft', 'published', 'in_progress', 'completed', 'cancelled'));

-- Add format and pair_mode columns.
alter table public.tournaments
  add column if not exists format text not null default 'league_playoff'
    check (format in ('league', 'playoff', 'league_playoff')),
  add column if not exists pair_mode text not null default 'fixed'
    check (pair_mode in ('fixed', 'variable'));

-- Expand visibility to allow public tournaments.
alter table public.tournaments
  drop constraint if exists tournaments_visibility_check;
alter table public.tournaments
  add constraint tournaments_visibility_check
  check (visibility in ('private', 'public'));

-- Tournament rules: dedicated table for frozen rules.
create table if not exists public.tournament_rules (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null unique references public.tournaments(id) on delete cascade,
  points_win integer not null default 3,
  points_loss integer not null default 0,
  best_of_sets integer not null default 3,
  tie_break_rule jsonb not null default '["points","head_to_head","set_diff","game_diff","manual"]'::jsonb,
  validation_mode text not null default 'player' check (validation_mode in ('player', 'organizer'))
);

create index if not exists tournament_rules_tournament_idx on public.tournament_rules (tournament_id);

alter table public.tournament_rules enable row level security;

drop policy if exists "tournament_rules_member_read" on public.tournament_rules;
create policy "tournament_rules_member_read" on public.tournament_rules
for select to authenticated
using (
  exists (
    select 1 from public.tournament_memberships m
    where m.tournament_id = tournament_rules.tournament_id
      and m.user_id = auth.uid()
      and m.status = 'accepted'
  )
);

drop policy if exists "tournament_rules_organizer_write" on public.tournament_rules;
create policy "tournament_rules_organizer_write" on public.tournament_rules
for all to authenticated
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_rules.tournament_id
      and t.organizer_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_rules.tournament_id
      and t.organizer_id = auth.uid()
  )
);

-- Tournament registrations: formal inscription tracking.
create table if not exists public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'voluntary_withdrawal', 'expelled')),
  registered_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (tournament_id, user_id)
);

create index if not exists registrations_tournament_idx on public.tournament_registrations (tournament_id);
create index if not exists registrations_user_idx on public.tournament_registrations (user_id);

alter table public.tournament_registrations enable row level security;

drop policy if exists "registrations_member_read" on public.tournament_registrations;
create policy "registrations_member_read" on public.tournament_registrations
for select to authenticated
using (
  exists (
    select 1 from public.tournament_memberships m
    where m.tournament_id = tournament_registrations.tournament_id
      and m.user_id = auth.uid()
      and m.status = 'accepted'
  )
);

drop policy if exists "registrations_self_insert" on public.tournament_registrations;
create policy "registrations_self_insert" on public.tournament_registrations
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "registrations_organizer_write" on public.tournament_registrations;
create policy "registrations_organizer_write" on public.tournament_registrations
for all to authenticated
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_registrations.tournament_id
      and t.organizer_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_registrations.tournament_id
      and t.organizer_id = auth.uid()
  )
);
