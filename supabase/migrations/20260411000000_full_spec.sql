-- =============================================================================
-- Migration: full_spec
-- Date: 2026-04-11
-- Description: Align schema with the full functional specification.
--   - Extend profiles with player-specific fields
--   - Widen status enums on tournaments, matches, invitations, event_matches
--   - Add tournament_rules, match_result_proposals, match_result_validations,
--     notifications, and audit_log tables
--   - RLS policies for every new table
--   - Realtime publication for new tables
--   - Updated profile trigger to sync new metadata fields
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profile fields
-- ---------------------------------------------------------------------------
-- avatar_url already exists; avatar_path is an additional column for storage
-- object paths (as opposed to full URLs).
-- updated_at already exists from init migration.

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists level text;
alter table public.profiles add column if not exists dominant_hand text;
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists club text;
alter table public.profiles add column if not exists bio text;

-- Add CHECK constraints via a DO block so we can skip if they already exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_level_check'
  ) then
    alter table public.profiles
      add constraint profiles_level_check
      check (level in ('beginner', 'intermediate', 'advanced', 'pro'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_dominant_hand_check'
  ) then
    alter table public.profiles
      add constraint profiles_dominant_hand_check
      check (dominant_hand in ('right', 'left', 'ambidextrous'));
  end if;
end $$;

-- Unique constraint on username (partial -- only when not null).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_username_unique'
  ) then
    alter table public.profiles
      add constraint profiles_username_unique unique (username);
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 2. Tournament status -- widen the CHECK to include new states
-- ---------------------------------------------------------------------------
-- The existing check allows ('draft', 'live', 'completed').
-- We drop it and recreate with the full set, keeping the old values valid.

alter table public.tournaments drop constraint if exists tournaments_status_check;
alter table public.tournaments
  add constraint tournaments_status_check
  check (status in ('draft', 'published', 'live', 'in_progress', 'finished', 'completed', 'cancelled'));


-- ---------------------------------------------------------------------------
-- 3. Matches status -- widen to include result-flow states
-- ---------------------------------------------------------------------------
-- Existing check allows ('draft', 'scheduled', 'pending_review', 'validated').

alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches
  add constraint matches_status_check
  check (status in (
    'draft', 'scheduled', 'pending', 'pending_review',
    'result_proposed', 'in_validation', 'disputed', 'validated', 'closed'
  ));


-- ---------------------------------------------------------------------------
-- 4. Tournament rules table
-- ---------------------------------------------------------------------------

create table if not exists public.tournament_rules (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  points_win int not null default 3,
  points_loss int not null default 0,
  points_walkover int not null default 3,
  best_of_sets int not null default 3,
  tie_break_rule text not null default 'points,head_to_head,set_diff,game_diff,draw',
  validation_mode text not null default 'rival'
    check (validation_mode in ('rival', 'organizer', 'auto')),
  created_at timestamptz not null default now(),
  unique(tournament_id)
);


-- ---------------------------------------------------------------------------
-- 5. Invitations -- add missing columns and widen status CHECK
-- ---------------------------------------------------------------------------
-- invited_email already exists from init migration.

-- Widen the status check to include 'rejected' and 'expired'.
alter table public.invitations drop constraint if exists invitations_status_check;
alter table public.invitations
  add constraint invitations_status_check
  check (status in ('pending', 'accepted', 'rejected', 'expired', 'revoked'));

alter table public.invitations add column if not exists expires_at timestamptz;
alter table public.invitations add column if not exists message text;


-- ---------------------------------------------------------------------------
-- 6. Match result proposals
-- ---------------------------------------------------------------------------

create table if not exists public.match_result_proposals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  proposed_by uuid not null references public.profiles(id),
  score_json jsonb not null,           -- e.g. {"sets": [[6,4],[3,6],[7,5]]}
  winner_side text check (winner_side in ('home', 'away')),
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'superseded')),
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 7. Match result validations
-- ---------------------------------------------------------------------------

create table if not exists public.match_result_validations (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.match_result_proposals(id) on delete cascade,
  validator_id uuid not null references public.profiles(id),
  decision text not null check (decision in ('accept', 'reject', 'correction')),
  reason text,
  created_at timestamptz not null default now(),
  unique(proposal_id, validator_id)
);


-- ---------------------------------------------------------------------------
-- 8. Notifications
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,     -- invitation, match_pending, validation_needed, dispute, result_confirmed, tournament_update
  title text not null,
  body text,
  entity_type text,       -- tournament, match, invitation
  entity_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user
  on public.notifications(user_id, read, created_at desc);


-- ---------------------------------------------------------------------------
-- 9. Audit log
-- ---------------------------------------------------------------------------

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_entity
  on public.audit_log(entity_type, entity_id);


-- ---------------------------------------------------------------------------
-- 10. Event matches -- add status column
-- ---------------------------------------------------------------------------

alter table public.event_matches
  add column if not exists status text not null default 'pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'event_matches_status_check'
  ) then
    alter table public.event_matches
      add constraint event_matches_status_check
      check (status in ('pending', 'result_proposed', 'validated', 'closed'));
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 11. Enable RLS on new tables
-- ---------------------------------------------------------------------------

alter table public.tournament_rules enable row level security;
alter table public.match_result_proposals enable row level security;
alter table public.match_result_validations enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;


-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
-- Notifications RLS
-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

-- Users can read their own notifications.
drop policy if exists "notifications_self_read" on public.notifications;
create policy "notifications_self_read" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

-- Users can mark their own notifications as read (update).
drop policy if exists "notifications_self_update" on public.notifications;
create policy "notifications_self_update" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Only the server (service_role) inserts notifications; no client insert policy.
-- If your app needs client-side insert, uncomment below:
-- create policy "notifications_self_insert" on public.notifications
--   for insert to authenticated
--   with check (user_id = auth.uid());


-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
-- Match result proposals RLS
-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

-- Tournament members can read proposals for matches in their tournaments.
drop policy if exists "match_result_proposals_member_read" on public.match_result_proposals;
create policy "match_result_proposals_member_read" on public.match_result_proposals
  for select to authenticated
  using (
    exists (
      select 1
      from public.matches m
      join public.tournament_memberships tm on tm.tournament_id = m.tournament_id
      where m.id = match_result_proposals.match_id
        and tm.user_id = auth.uid()
        and tm.status = 'accepted'
    )
  );

-- Match participants can insert proposals (must be the proposer).
drop policy if exists "match_result_proposals_participant_insert" on public.match_result_proposals;
create policy "match_result_proposals_participant_insert" on public.match_result_proposals
  for insert to authenticated
  with check (
    proposed_by = auth.uid()
    and exists (
      select 1
      from public.matches m
      join public.tournament_memberships tm on tm.tournament_id = m.tournament_id
      where m.id = match_result_proposals.match_id
        and tm.user_id = auth.uid()
        and tm.status = 'accepted'
    )
  );


-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
-- Match result validations RLS
-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

-- Tournament members can read validations.
drop policy if exists "match_result_validations_member_read" on public.match_result_validations;
create policy "match_result_validations_member_read" on public.match_result_validations
  for select to authenticated
  using (
    exists (
      select 1
      from public.match_result_proposals mrp
      join public.matches m on m.id = mrp.match_id
      join public.tournament_memberships tm on tm.tournament_id = m.tournament_id
      where mrp.id = match_result_validations.proposal_id
        and tm.user_id = auth.uid()
        and tm.status = 'accepted'
    )
  );

-- Participants can insert validations (must be the validator).
drop policy if exists "match_result_validations_participant_insert" on public.match_result_validations;
create policy "match_result_validations_participant_insert" on public.match_result_validations
  for insert to authenticated
  with check (
    validator_id = auth.uid()
    and exists (
      select 1
      from public.match_result_proposals mrp
      join public.matches m on m.id = mrp.match_id
      join public.tournament_memberships tm on tm.tournament_id = m.tournament_id
      where mrp.id = match_result_validations.proposal_id
        and tm.user_id = auth.uid()
        and tm.status = 'accepted'
    )
  );


-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
-- Tournament rules RLS
-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

-- Public read: any authenticated member of the tournament can see rules.
drop policy if exists "tournament_rules_member_read" on public.tournament_rules;
create policy "tournament_rules_member_read" on public.tournament_rules
  for select to authenticated
  using (
    exists (
      select 1
      from public.tournament_memberships tm
      where tm.tournament_id = tournament_rules.tournament_id
        and tm.user_id = auth.uid()
        and tm.status = 'accepted'
    )
  );

-- Only the organizer can insert/update/delete rules.
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


-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
-- Audit log RLS
-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

-- Organizers/admins can read audit entries for their tournaments.
-- For simplicity we allow read if the actor is the current user OR the user
-- is an organizer of the referenced tournament entity.
drop policy if exists "audit_log_read" on public.audit_log;
create policy "audit_log_read" on public.audit_log
  for select to authenticated
  using (
    actor_id = auth.uid()
    or exists (
      select 1 from public.tournaments t
      where t.id = audit_log.entity_id
        and t.organizer_id = auth.uid()
    )
  );

-- No client-side insert -- audit_log is written by server/triggers only.


-- ---------------------------------------------------------------------------
-- 12. Realtime publication for new tables
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.match_result_proposals;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.match_result_validations;
    exception when duplicate_object then null;
    end;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 13. Update profile trigger to handle new metadata fields
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, username, city, level, dominant_hand, avatar_path, club, bio)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'city',
    case
      when new.raw_user_meta_data->>'level' in ('beginner','intermediate','advanced','pro')
      then new.raw_user_meta_data->>'level'
      else null
    end,
    case
      when new.raw_user_meta_data->>'dominant_hand' in ('right','left','ambidextrous')
      then new.raw_user_meta_data->>'dominant_hand'
      else null
    end,
    new.raw_user_meta_data->>'avatar_path',
    new.raw_user_meta_data->>'club',
    new.raw_user_meta_data->>'bio'
  )
  on conflict (id) do update set
    email      = excluded.email,
    full_name  = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    username   = coalesce(excluded.username, public.profiles.username),
    city       = coalesce(excluded.city, public.profiles.city),
    level      = coalesce(excluded.level, public.profiles.level),
    dominant_hand = coalesce(excluded.dominant_hand, public.profiles.dominant_hand),
    avatar_path = coalesce(excluded.avatar_path, public.profiles.avatar_path),
    club       = coalesce(excluded.club, public.profiles.club),
    bio        = coalesce(excluded.bio, public.profiles.bio),
    updated_at = now();
  return new;
end;
$$;

-- The trigger itself doesn't need re-creating -- it already calls handle_new_user().
-- But we re-create it to be safe (idempotent).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
