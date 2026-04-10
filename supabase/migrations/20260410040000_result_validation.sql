-- Distributed result validation model per PadelFlow spec.
-- Players propose results; rivals validate; disputes go to organizer.

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

-- RLS
alter table public.match_result_proposals enable row level security;
alter table public.match_result_validations enable row level security;

-- Proposals: readable by tournament members.
drop policy if exists "proposals_member_read" on public.match_result_proposals;
create policy "proposals_member_read" on public.match_result_proposals
for select to authenticated
using (
  exists (
    select 1 from public.matches mt
    join public.tournament_memberships m on m.tournament_id = mt.tournament_id
    where mt.id = match_result_proposals.match_id
      and m.user_id = auth.uid()
      and m.status = 'accepted'
  )
);

-- Proposals: writable by match participants.
drop policy if exists "proposals_participant_insert" on public.match_result_proposals;
create policy "proposals_participant_insert" on public.match_result_proposals
for insert to authenticated
with check (
  proposed_by = auth.uid()
  and exists (
    select 1 from public.matches mt
    join public.tournament_memberships m on m.tournament_id = mt.tournament_id
    where mt.id = match_result_proposals.match_id
      and m.user_id = auth.uid()
      and m.status = 'accepted'
  )
);

-- Validations: readable by tournament members.
drop policy if exists "validations_member_read" on public.match_result_validations;
create policy "validations_member_read" on public.match_result_validations
for select to authenticated
using (
  exists (
    select 1 from public.match_result_proposals p
    join public.matches mt on mt.id = p.match_id
    join public.tournament_memberships m on m.tournament_id = mt.tournament_id
    where p.id = match_result_validations.proposal_id
      and m.user_id = auth.uid()
      and m.status = 'accepted'
  )
);

-- Validations: writable by rival participants only.
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
      and m.user_id = auth.uid()
      and m.status = 'accepted'
      -- Ensure validator is not the proposer (must be from rival side).
      and p.proposed_by != auth.uid()
  )
);
