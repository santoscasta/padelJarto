-- Quick events: zero-friction americano/mexicano padel sessions.
-- Separate from the formal tournaments schema so they can evolve independently.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  format text not null check (format in ('americano', 'mexicano')),
  courts integer not null default 1 check (courts > 0),
  points_per_match integer not null default 24 check (points_per_match > 0),
  organizer_id uuid references auth.users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'live', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  unique (event_id, position)
);

create table if not exists public.event_matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  round_number integer not null,
  court integer not null,
  home_player_1 uuid references public.event_players(id) on delete cascade,
  home_player_2 uuid references public.event_players(id) on delete cascade,
  away_player_1 uuid references public.event_players(id) on delete cascade,
  away_player_2 uuid references public.event_players(id) on delete cascade,
  home_score integer,
  away_score integer,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_organizer_idx on public.events (organizer_id);
create index if not exists event_players_event_idx on public.event_players (event_id);
create index if not exists event_matches_event_idx on public.event_matches (event_id, round_number);

alter table public.events enable row level security;
alter table public.event_players enable row level security;
alter table public.event_matches enable row level security;

-- Public read for spectator mode; anyone with the slug can see the board.
drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events for select using (true);

drop policy if exists "event_players_public_read" on public.event_players;
create policy "event_players_public_read" on public.event_players for select using (true);

drop policy if exists "event_matches_public_read" on public.event_matches;
create policy "event_matches_public_read" on public.event_matches for select using (true);

-- Organizer can mutate their own events.
drop policy if exists "events_organizer_write" on public.events;
create policy "events_organizer_write" on public.events
  for all to authenticated
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

drop policy if exists "event_players_organizer_write" on public.event_players;
create policy "event_players_organizer_write" on public.event_players
  for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_players.event_id and e.organizer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_players.event_id and e.organizer_id = auth.uid()
    )
  );

drop policy if exists "event_matches_organizer_write" on public.event_matches;
create policy "event_matches_organizer_write" on public.event_matches
  for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_matches.event_id and e.organizer_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_matches.event_id and e.organizer_id = auth.uid()
    )
  );

-- Enable realtime broadcast.
do $$
begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    begin
      alter publication supabase_realtime add table public.events;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.event_players;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.event_matches;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
