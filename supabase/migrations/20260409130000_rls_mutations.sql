-- Allow users to insert their own rows where it makes sense and ensure
-- membership-based policies for write operations that should be doable
-- with anon+auth session (not just service role).

-- profiles: insert allowed for matching auth.uid (trigger handles the
-- normal case but this covers self-upsert fallbacks).
drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
for insert to authenticated
with check (auth.uid() = id);

-- tournaments: organizer can create
drop policy if exists "tournaments_organizer_insert" on public.tournaments;
create policy "tournaments_organizer_insert" on public.tournaments
for insert to authenticated
with check (organizer_id = auth.uid());

drop policy if exists "tournaments_organizer_update" on public.tournaments;
create policy "tournaments_organizer_update" on public.tournaments
for update to authenticated
using (organizer_id = auth.uid())
with check (organizer_id = auth.uid());

-- memberships: organizer can insert/delete memberships of its tournament;
-- the user themselves can be inserted via invitation accept flow (admin).
drop policy if exists "memberships_organizer_write" on public.tournament_memberships;
create policy "memberships_organizer_write" on public.tournament_memberships
for all to authenticated
using (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_memberships.tournament_id
      and t.organizer_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.tournaments t
    where t.id = tournament_memberships.tournament_id
      and t.organizer_id = auth.uid()
  )
);

-- score_submissions: any member can submit
drop policy if exists "score_submissions_member_insert" on public.score_submissions;
create policy "score_submissions_member_insert" on public.score_submissions
for insert to authenticated
with check (
  submitted_by = auth.uid()
  and exists (
    select 1
    from public.matches mt
    join public.tournament_memberships m on m.tournament_id = mt.tournament_id
    where mt.id = score_submissions.match_id
      and m.user_id = auth.uid()
      and m.status = 'accepted'
  )
);
