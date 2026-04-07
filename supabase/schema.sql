create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null check (status in ('draft', 'live', 'completed')),
  visibility text not null default 'private' check (visibility in ('private')),
  mode text not null check (mode in ('fixed_pairs', 'individual_ranking')),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  config jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tournament_memberships (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('organizer', 'player')),
  status text not null check (status in ('invited', 'accepted')),
  joined_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  token text not null unique,
  invited_email text,
  status text not null check (status in ('pending', 'accepted', 'revoked')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  type text not null check (type in ('groups', 'knockout')),
  name text not null,
  sequence integer not null,
  config jsonb,
  unique (tournament_id, sequence)
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  slot integer not null,
  unique (stage_id, slot)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  seed integer,
  unique (tournament_id, name)
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  unique (team_id, user_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage_id uuid not null references public.stages(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  round_label text,
  bracket_round integer,
  bracket_position integer,
  status text not null check (status in ('draft', 'scheduled', 'pending_review', 'validated')),
  scheduled_at timestamptz,
  court text,
  validated_submission_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_sides (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  side text not null check (side in ('home', 'away')),
  team_id uuid references public.teams(id) on delete set null,
  player_ids uuid[] not null default '{}',
  unique (match_id, side)
);

create table if not exists public.score_submissions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  sets jsonb not null,
  status text not null check (status in ('pending_review', 'validated', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz
);

create table if not exists public.standings (
  id text primary key,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage_id uuid not null references public.stages(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  entity_type text not null check (entity_type in ('team', 'player')),
  entity_id uuid not null,
  rank integer not null,
  played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  sets_for integer not null default 0,
  sets_against integer not null default 0,
  games_for integer not null default 0,
  games_against integer not null default 0
);

create index if not exists tournaments_organizer_idx on public.tournaments (organizer_id);
create index if not exists memberships_tournament_idx on public.tournament_memberships (tournament_id);
create index if not exists memberships_user_idx on public.tournament_memberships (user_id);
create index if not exists matches_tournament_idx on public.matches (tournament_id);
create index if not exists matches_stage_idx on public.matches (stage_id);
create index if not exists score_submissions_match_idx on public.score_submissions (match_id);
create index if not exists standings_tournament_idx on public.standings (tournament_id);

alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.stages enable row level security;
alter table public.groups enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.matches enable row level security;
alter table public.match_sides enable row level security;
alter table public.score_submissions enable row level security;
alter table public.standings enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
for select to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "tournaments_member_read" on public.tournaments;
create policy "tournaments_member_read" on public.tournaments
for select to authenticated
using (
  exists (
    select 1
    from public.tournament_memberships memberships
    where memberships.tournament_id = tournaments.id
      and memberships.user_id = auth.uid()
      and memberships.status = 'accepted'
  )
);

drop policy if exists "memberships_own_read" on public.tournament_memberships;
create policy "memberships_own_read" on public.tournament_memberships
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "invitations_member_read" on public.invitations;
create policy "invitations_member_read" on public.invitations
for select to authenticated
using (
  exists (
    select 1
    from public.tournament_memberships memberships
    where memberships.tournament_id = invitations.tournament_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'accepted'
  )
);

drop policy if exists "stages_member_read" on public.stages;
create policy "stages_member_read" on public.stages
for select to authenticated
using (
  exists (
    select 1
    from public.tournament_memberships memberships
    where memberships.tournament_id = stages.tournament_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'accepted'
  )
);

drop policy if exists "groups_member_read" on public.groups;
create policy "groups_member_read" on public.groups
for select to authenticated
using (
  exists (
    select 1
    from public.tournament_memberships memberships
    where memberships.tournament_id = groups.tournament_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'accepted'
  )
);

drop policy if exists "teams_member_read" on public.teams;
create policy "teams_member_read" on public.teams
for select to authenticated
using (
  exists (
    select 1
    from public.tournament_memberships memberships
    where memberships.tournament_id = teams.tournament_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'accepted'
  )
);

drop policy if exists "team_members_member_read" on public.team_members;
create policy "team_members_member_read" on public.team_members
for select to authenticated
using (
  exists (
    select 1
    from public.teams
    join public.tournament_memberships memberships on memberships.tournament_id = teams.tournament_id
    where teams.id = team_members.team_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'accepted'
  )
);

drop policy if exists "matches_member_read" on public.matches;
create policy "matches_member_read" on public.matches
for select to authenticated
using (
  exists (
    select 1
    from public.tournament_memberships memberships
    where memberships.tournament_id = matches.tournament_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'accepted'
  )
);

drop policy if exists "match_sides_member_read" on public.match_sides;
create policy "match_sides_member_read" on public.match_sides
for select to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.tournament_memberships memberships on memberships.tournament_id = matches.tournament_id
    where matches.id = match_sides.match_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'accepted'
  )
);

drop policy if exists "score_submissions_member_read" on public.score_submissions;
create policy "score_submissions_member_read" on public.score_submissions
for select to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.tournament_memberships memberships on memberships.tournament_id = matches.tournament_id
    where matches.id = score_submissions.match_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'accepted'
  )
);

drop policy if exists "standings_member_read" on public.standings;
create policy "standings_member_read" on public.standings
for select to authenticated
using (
  exists (
    select 1
    from public.tournament_memberships memberships
    where memberships.tournament_id = standings.tournament_id
      and memberships.user_id = auth.uid()
      and memberships.status = 'accepted'
  )
);
