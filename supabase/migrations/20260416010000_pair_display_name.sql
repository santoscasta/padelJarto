-- 20260416010000_pair_display_name.sql
-- Allow each pair to have a custom display name (e.g. "Los Tiburones").
-- The name travels with the pair, so the same combo of two players keeps the
-- name across tournaments.

alter table public.pairs
  add column display_name text;

alter table public.pairs
  add constraint pair_display_name_length
    check (
      display_name is null
      or char_length(btrim(display_name)) between 1 and 40
    );

-- RLS: allow either of the two pair members to UPDATE their pair row. The
-- existing `pairs_authenticated_select` policy keeps SELECT open to all
-- authenticated users; INSERT/DELETE continue to go through the service role.
-- We scope `display_name` writes in app code — the policy gate ensures only
-- members can mutate the row at all.
create policy pairs_member_update on public.pairs
  for update
  using (
    exists (
      select 1 from public.players
      where players.id in (pairs.player_a_id, pairs.player_b_id)
        and players.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.players
      where players.id in (pairs.player_a_id, pairs.player_b_id)
        and players.profile_id = auth.uid()
    )
  );
