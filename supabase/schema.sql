create extension if not exists pgcrypto;

-- ============================================================
-- Profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key,
  full_name text not null,
  email text not null unique,
  username text unique,
  city text,
  level text,
  dominant_hand text check (dominant_hand in ('right', 'left', 'ambidextrous')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Clubs
-- ============================================================
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

-- ============================================================
-- Tournaments
-- ============================================================
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null check (status in ('draft', 'published', 'in_progress', 'completed', 'cancelled')),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  mode text not null check (mode in ('fixed_pairs', 'individual_ranking')),
  format text not null default 'league_playoff' check (format in ('league', 'playoff', 'league_playoff')),
  pair_mode text not null default 'fixed' check (pair_mode in ('fixed', 'variable')),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  config jsonb not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Tournament Rules
-- ============================================================
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

-- ============================================================
-- Tournament Memberships
-- ============================================================
create table if not exists public.tournament_memberships (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('organizer', 'player')),
  status text not null check (status in ('invited', 'accepted')),
  joined_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

-- ============================================================
-- Tournament Registrations
-- ============================================================
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

-- ============================================================
-- Invitations
-- ============================================================
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  token text not null unique,
  invited_email text,
  status text not null check (status in ('pending', 'accepted', 'revoked', 'expired', 'rejected')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null
);

-- ============================================================
-- Stages (phases)
-- ============================================================
create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  type text not null check (type in ('groups', 'knockout')),
  name text not null,
  sequence integer not null,
  config jsonb,
  unique (tournament_id, sequence)
);

-- ============================================================
-- Groups
-- ============================================================
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  slot integer not null,
  unique (stage_id, slot)
);

-- ============================================================
-- Teams
-- ============================================================
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

-- ============================================================
-- Rounds
-- ============================================================
create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage_id uuid not null references public.stages(id) on delete cascade,
  round_number integer not null,
  name text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  scheduled_date date,
  unique (stage_id, round_number)
);

create index if not exists rounds_tournament_idx on public.rounds (tournament_id);
create index if not exists rounds_stage_idx on public.rounds (stage_id);

-- ============================================================
-- Matches
-- ============================================================
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage_id uuid not null references public.stages(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  round_id uuid references public.rounds(id) on delete set null,
  round_label text,
  bracket_round integer,
  bracket_position integer,
  status text not null check (status in (
    'draft', 'scheduled', 'pending',
    'result_proposed', 'in_validation', 'in_dispute',
    'pending_review', 'validated', 'closed'
  )),
  scheduled_at timestamptz,
  court text,
  court_name text,
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

-- ============================================================
-- Score Submissions (legacy, kept for backward compat)
-- ============================================================
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

-- ============================================================
-- Match Result Proposals (PadelFlow distributed validation)
-- ============================================================
create table if not exists public.match_result_proposals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  proposed_by uuid not null references public.profiles(id) on delete cascade,
  score_json jsonb not null,
  winner_side text check (winner_side in ('home', 'away')),
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'overridden')),
  created_at timestamptz not null default now()
);

create index if not exists proposals_match_idx on public.match_result_proposals (match_id);
create index if not exists proposals_status_idx on public.match_result_proposals (status);

create table if not exists public.match_result_validations (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.match_result_proposals(id) on delete cascade,
  validator_id uuid not null references public.profiles(id) on delete cascade,
  decision text not null check (decision in ('accept', 'reject')),
  reason text,
  created_at timestamptz not null default now(),
  unique (proposal_id, validator_id)
);

create index if not exists validations_proposal_idx on public.match_result_validations (proposal_id);

-- ============================================================
-- Standings
-- ============================================================
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

-- ============================================================
-- Notifications
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

-- ============================================================
-- Audit Log
-- ============================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists tournaments_organizer_idx on public.tournaments (organizer_id);
create index if not exists memberships_tournament_idx on public.tournament_memberships (tournament_id);
create index if not exists memberships_user_idx on public.tournament_memberships (user_id);
create index if not exists matches_tournament_idx on public.matches (tournament_id);
create index if not exists matches_stage_idx on public.matches (stage_id);
create index if not exists score_submissions_match_idx on public.score_submissions (match_id);
create index if not exists standings_tournament_idx on public.standings (tournament_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_memberships enable row level security;
alter table public.tournament_rules enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.invitations enable row level security;
alter table public.stages enable row level security;
alter table public.groups enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.rounds enable row level security;
alter table public.matches enable row level security;
alter table public.match_sides enable row level security;
alter table public.score_submissions enable row level security;
alter table public.match_result_proposals enable row level security;
alter table public.match_result_validations enable row level security;
alter table public.standings enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;
alter table public.clubs enable row level security;

-- Profiles: public limited read for authenticated users.
drop policy if exists "profiles_public_limited_read" on public.profiles;
create policy "profiles_public_limited_read" on public.profiles
for select to authenticated
using (true);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Clubs
drop policy if exists "clubs_public_read" on public.clubs;
create policy "clubs_public_read" on public.clubs
for select to authenticated using (true);

drop policy if exists "clubs_creator_insert" on public.clubs;
create policy "clubs_creator_insert" on public.clubs
for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "clubs_creator_update" on public.clubs;
create policy "clubs_creator_update" on public.clubs
for update to authenticated
using (created_by = auth.uid()) with check (created_by = auth.uid());

-- Tournaments
drop policy if exists "tournaments_member_read" on public.tournaments;
create policy "tournaments_member_read" on public.tournaments
for select to authenticated
using (
  visibility = 'public'
  or exists (
    select 1 from public.tournament_memberships memberships
    where memberships.tournament_id = tournaments.id
      and memberships.user_id = auth.uid()
      and memberships.status = 'accepted'
  )
);

-- Tournament Rules
drop policy if exists "tournament_rules_member_read" on public.tournament_rules;
create policy "tournament_rules_member_read" on public.tournament_rules
for select to authenticated
using (
  exists (
    select 1 from public.tournament_memberships m
    where m.tournament_id = tournament_rules.tournament_id
      and m.user_id = auth.uid() and m.status = 'accepted'
  )
);

drop policy if exists "tournament_rules_organizer_write" on public.tournament_rules;
create policy "tournament_rules_organizer_write" on public.tournament_rules
for all to authenticated
using (exists (select 1 from public.tournaments t where t.id = tournament_rules.tournament_id and t.organizer_id = auth.uid()))
with check (exists (select 1 from public.tournaments t where t.id = tournament_rules.tournament_id and t.organizer_id = auth.uid()));

-- Memberships
drop policy if exists "memberships_own_read" on public.tournament_memberships;
create policy "memberships_own_read" on public.tournament_memberships
for select to authenticated
using (user_id = auth.uid());

-- Registrations
drop policy if exists "registrations_member_read" on public.tournament_registrations;
create policy "registrations_member_read" on public.tournament_registrations
for select to authenticated
using (
  exists (
    select 1 from public.tournament_memberships m
    where m.tournament_id = tournament_registrations.tournament_id
      and m.user_id = auth.uid() and m.status = 'accepted'
  )
);

drop policy if exists "registrations_self_insert" on public.tournament_registrations;
create policy "registrations_self_insert" on public.tournament_registrations
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "registrations_organizer_write" on public.tournament_registrations;
create policy "registrations_organizer_write" on public.tournament_registrations
for all to authenticated
using (exists (select 1 from public.tournaments t where t.id = tournament_registrations.tournament_id and t.organizer_id = auth.uid()))
with check (exists (select 1 from public.tournaments t where t.id = tournament_registrations.tournament_id and t.organizer_id = auth.uid()));

-- Invitations
drop policy if exists "invitations_member_read" on public.invitations;
create policy "invitations_member_read" on public.invitations
for select to authenticated
using (
  exists (
    select 1 from public.tournament_memberships memberships
    where memberships.tournament_id = invitations.tournament_id
      and memberships.user_id = auth.uid() and memberships.status = 'accepted'
  )
);

-- Stages
drop policy if exists "stages_member_read" on public.stages;
create policy "stages_member_read" on public.stages
for select to authenticated
using (
  exists (
    select 1 from public.tournament_memberships memberships
    where memberships.tournament_id = stages.tournament_id
      and memberships.user_id = auth.uid() and memberships.status = 'accepted'
  )
);

-- Groups
drop policy if exists "groups_member_read" on public.groups;
create policy "groups_member_read" on public.groups
for select to authenticated
using (
  exists (
    select 1 from public.tournament_memberships memberships
    where memberships.tournament_id = groups.tournament_id
      and memberships.user_id = auth.uid() and memberships.status = 'accepted'
  )
);

-- Teams
drop policy if exists "teams_member_read" on public.teams;
create policy "teams_member_read" on public.teams
for select to authenticated
using (
  exists (
    select 1 from public.tournament_memberships memberships
    where memberships.tournament_id = teams.tournament_id
      and memberships.user_id = auth.uid() and memberships.status = 'accepted'
  )
);

drop policy if exists "team_members_member_read" on public.team_members;
create policy "team_members_member_read" on public.team_members
for select to authenticated
using (
  exists (
    select 1 from public.teams
    join public.tournament_memberships memberships on memberships.tournament_id = teams.tournament_id
    where teams.id = team_members.team_id
      and memberships.user_id = auth.uid() and memberships.status = 'accepted'
  )
);

-- Rounds
drop policy if exists "rounds_member_read" on public.rounds;
create policy "rounds_member_read" on public.rounds
for select to authenticated
using (
  exists (
    select 1 from public.tournament_memberships m
    where m.tournament_id = rounds.tournament_id
      and m.user_id = auth.uid() and m.status = 'accepted'
  )
);

drop policy if exists "rounds_organizer_write" on public.rounds;
create policy "rounds_organizer_write" on public.rounds
for all to authenticated
using (exists (select 1 from public.tournaments t where t.id = rounds.tournament_id and t.organizer_id = auth.uid()))
with check (exists (select 1 from public.tournaments t where t.id = rounds.tournament_id and t.organizer_id = auth.uid()));

-- Matches
drop policy if exists "matches_member_read" on public.matches;
create policy "matches_member_read" on public.matches
for select to authenticated
using (
  exists (
    select 1 from public.tournament_memberships memberships
    where memberships.tournament_id = matches.tournament_id
      and memberships.user_id = auth.uid() and memberships.status = 'accepted'
  )
);

drop policy if exists "match_sides_member_read" on public.match_sides;
create policy "match_sides_member_read" on public.match_sides
for select to authenticated
using (
  exists (
    select 1 from public.matches
    join public.tournament_memberships memberships on memberships.tournament_id = matches.tournament_id
    where matches.id = match_sides.match_id
      and memberships.user_id = auth.uid() and memberships.status = 'accepted'
  )
);

-- Score submissions (legacy)
drop policy if exists "score_submissions_member_read" on public.score_submissions;
create policy "score_submissions_member_read" on public.score_submissions
for select to authenticated
using (
  exists (
    select 1 from public.matches
    join public.tournament_memberships memberships on memberships.tournament_id = matches.tournament_id
    where matches.id = score_submissions.match_id
      and memberships.user_id = auth.uid() and memberships.status = 'accepted'
  )
);

-- Match Result Proposals
drop policy if exists "proposals_member_read" on public.match_result_proposals;
create policy "proposals_member_read" on public.match_result_proposals
for select to authenticated
using (
  exists (
    select 1 from public.matches mt
    join public.tournament_memberships m on m.tournament_id = mt.tournament_id
    where mt.id = match_result_proposals.match_id
      and m.user_id = auth.uid() and m.status = 'accepted'
  )
);

drop policy if exists "proposals_participant_insert" on public.match_result_proposals;
create policy "proposals_participant_insert" on public.match_result_proposals
for insert to authenticated
with check (
  proposed_by = auth.uid()
  and exists (
    select 1 from public.matches mt
    join public.tournament_memberships m on m.tournament_id = mt.tournament_id
    where mt.id = match_result_proposals.match_id
      and m.user_id = auth.uid() and m.status = 'accepted'
  )
);

-- Match Result Validations
drop policy if exists "validations_member_read" on public.match_result_validations;
create policy "validations_member_read" on public.match_result_validations
for select to authenticated
using (
  exists (
    select 1 from public.match_result_proposals p
    join public.matches mt on mt.id = p.match_id
    join public.tournament_memberships m on m.tournament_id = mt.tournament_id
    where p.id = match_result_validations.proposal_id
      and m.user_id = auth.uid() and m.status = 'accepted'
  )
);

drop policy if exists "validations_rival_insert" on public.match_result_validations;
create policy "validations_rival_insert" on public.match_result_validations
for insert to authenticated
with check (
  validator_id = auth.uid()
  and exists (
    select 1 from public.match_result_proposals p
    join public.matches mt on mt.id = p.match_id
    join public.tournament_memberships m on m.tournament_id = mt.tournament_id
    where p.id = match_result_validations.proposal_id
      and m.user_id = auth.uid() and m.status = 'accepted'
      and p.proposed_by != auth.uid()
  )
);

-- Standings
drop policy if exists "standings_member_read" on public.standings;
create policy "standings_member_read" on public.standings
for select to authenticated
using (
  exists (
    select 1 from public.tournament_memberships memberships
    where memberships.tournament_id = standings.tournament_id
      and memberships.user_id = auth.uid() and memberships.status = 'accepted'
  )
);

-- Notifications
drop policy if exists "notifications_own_read" on public.notifications;
create policy "notifications_own_read" on public.notifications
for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_own_update" on public.notifications;
create policy "notifications_own_update" on public.notifications
for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Audit Log
drop policy if exists "audit_log_organizer_read" on public.audit_log;
create policy "audit_log_organizer_read" on public.audit_log
for select to authenticated
using (
  actor_id = auth.uid()
  or exists (
    select 1 from public.tournaments t
    where t.id = audit_log.entity_id
      and t.organizer_id = auth.uid()
      and audit_log.entity_type in ('tournament', 'match', 'match_result')
  )
);
