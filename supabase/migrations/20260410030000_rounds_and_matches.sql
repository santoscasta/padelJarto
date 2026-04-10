-- Rounds table and match status expansion.

-- Rounds / jornadas as first-class entity.
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

alter table public.rounds enable row level security;

drop policy if exists "rounds_member_read" on public.rounds;
create policy "rounds_member_read" on public.rounds
for select to authenticated
using (
  exists (
    select 1 from public.tournament_memberships m
    where m.tournament_id = rounds.tournament_id
      and m.user_id = auth.uid()
      and m.status = 'accepted'
  )
);

drop policy if exists "rounds_organizer_write" on public.rounds;
create policy "rounds_organizer_write" on public.rounds
for all to authenticated
using (
  exists (
    select 1 from public.tournaments t
    where t.id = rounds.tournament_id
      and t.organizer_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.tournaments t
    where t.id = rounds.tournament_id
      and t.organizer_id = auth.uid()
  )
);

-- Add round reference to matches.
alter table public.matches
  add column if not exists round_id uuid references public.rounds(id) on delete set null;

-- Expand match statuses per PadelFlow spec.
alter table public.matches
  drop constraint if exists matches_status_check;
alter table public.matches
  add constraint matches_status_check
  check (status in (
    'draft', 'scheduled', 'pending',
    'result_proposed', 'in_validation', 'in_dispute',
    'pending_review', 'validated', 'closed'
  ));

-- Add court_name field (coexists with existing court column).
alter table public.matches
  add column if not exists court_name text;
