-- 20260414000001_init_schema.sql
-- Initial schema for Padeljarto V1.

create extension if not exists "pgcrypto";

-- ENUMS ----------------------------------------------------------------
create type tournament_status as enum ('draft','open','groups','knockout','complete');
create type pairing_mode as enum ('pre_inscribed','draw','mixed');
create type match_phase as enum ('group','R32','R16','QF','SF','F');
create type result_status as enum ('reported','validated','disputed','walkover','corrected');
create type inscription_status as enum ('pending','confirmed');
create type snapshot_subject as enum ('player','pair');
create type notification_kind as enum (
  'inscription_new','tournament_open','tournament_started','result_reported','result_validated'
);

-- TABLES ---------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  email text,
  created_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  rating real not null default 1200,
  matches_played int not null default 0
);

create table pairs (
  id uuid primary key default gen_random_uuid(),
  player_a_id uuid not null references players(id) on delete restrict,
  player_b_id uuid not null references players(id) on delete restrict,
  rating real not null default 1200,
  constraint pair_players_ordered check (player_a_id < player_b_id),
  constraint pair_unique unique (player_a_id, player_b_id)
);

create table tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete restrict,
  name text not null,
  status tournament_status not null default 'draft',
  pairing_mode pairing_mode not null,
  size int not null,
  group_count int not null default 1,
  playoff_cutoff int not null,
  starts_at timestamptz,
  created_at timestamptz not null default now(),
  constraint cutoff_allowed check (playoff_cutoff in (0,1,2,4,8,16)),
  constraint group_divides_size check (group_count >= 1 and size % group_count = 0),
  constraint size_positive check (size > 0)
);

create table inscriptions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  pair_id uuid references pairs(id) on delete set null,
  status inscription_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (tournament_id, player_id)
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  label text not null,
  unique (tournament_id, label)
);

create table group_pairs (
  group_id uuid not null references groups(id) on delete cascade,
  pair_id uuid not null references pairs(id) on delete restrict,
  primary key (group_id, pair_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  phase match_phase not null,
  group_id uuid references groups(id) on delete set null,
  pair_a_id uuid not null references pairs(id) on delete restrict,
  pair_b_id uuid not null references pairs(id) on delete restrict,
  court text,
  scheduled_at timestamptz,
  constraint pair_ab_distinct check (pair_a_id <> pair_b_id)
);

create table results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  sets jsonb not null,
  winner_pair_id uuid not null references pairs(id) on delete restrict,
  reported_by uuid not null references profiles(id) on delete restrict,
  validated_by uuid references profiles(id) on delete set null,
  validated_at timestamptz,
  status result_status not null default 'reported',
  corrects_result_id uuid references results(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Only one non-corrected result per match.
create unique index one_active_result_per_match
  on results (match_id)
  where status <> 'corrected';

create table rating_snapshots (
  id uuid primary key default gen_random_uuid(),
  subject_type snapshot_subject not null,
  subject_id uuid not null,
  before real not null,
  after real not null,
  delta real not null,
  match_id uuid not null references matches(id) on delete cascade,
  result_id uuid not null references results(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index rating_snapshots_subject_idx
  on rating_snapshots (subject_type, subject_id, created_at desc);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind notification_kind not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);
