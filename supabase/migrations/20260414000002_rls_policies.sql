-- 20260414000002_rls_policies.sql

alter table profiles           enable row level security;
alter table players            enable row level security;
alter table pairs              enable row level security;
alter table tournaments        enable row level security;
alter table inscriptions       enable row level security;
alter table invitations        enable row level security;
alter table groups             enable row level security;
alter table group_pairs        enable row level security;
alter table matches            enable row level security;
alter table results            enable row level security;
alter table rating_snapshots   enable row level security;
alter table notifications      enable row level security;

-- profiles
create policy profiles_self_select on profiles for select
  using (auth.role() = 'authenticated');
create policy profiles_self_insert on profiles for insert
  with check (auth.uid() = id);
create policy profiles_self_update on profiles for update
  using (auth.uid() = id);

-- players
create policy players_authenticated_select on players for select
  using (auth.role() = 'authenticated');
create policy players_self_insert on players for insert
  with check (profile_id = auth.uid());
create policy players_self_update on players for update
  using (profile_id = auth.uid());

-- pairs (read open to authenticated; writes only via service role)
create policy pairs_authenticated_select on pairs for select
  using (auth.role() = 'authenticated');

-- tournaments
create policy tournaments_authenticated_select on tournaments for select
  using (auth.role() = 'authenticated');
create policy tournaments_authenticated_insert on tournaments for insert
  with check (owner_id = auth.uid());
create policy tournaments_owner_update on tournaments for update
  using (owner_id = auth.uid());
create policy tournaments_owner_delete on tournaments for delete
  using (owner_id = auth.uid());

-- inscriptions
create policy inscriptions_authenticated_select on inscriptions for select
  using (auth.role() = 'authenticated');
create policy inscriptions_self_insert on inscriptions for insert
  with check (
    exists (
      select 1 from players p
      where p.id = inscriptions.player_id and p.profile_id = auth.uid()
    )
    and exists (
      select 1 from tournaments t
      where t.id = inscriptions.tournament_id and t.status = 'open'
    )
  );
create policy inscriptions_owner_update on inscriptions for update
  using (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));
create policy inscriptions_owner_delete on inscriptions for delete
  using (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));

-- invitations (read by RPC by token; direct write by owner only)
create policy invitations_owner_select on invitations for select
  using (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));
create policy invitations_owner_insert on invitations for insert
  with check (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));
create policy invitations_owner_delete on invitations for delete
  using (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));

-- groups + group_pairs
create policy groups_authenticated_select on groups for select
  using (auth.role() = 'authenticated');
create policy groups_owner_write on groups for all
  using (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));

create policy group_pairs_authenticated_select on group_pairs for select
  using (auth.role() = 'authenticated');
create policy group_pairs_owner_write on group_pairs for all
  using (exists (
    select 1 from groups g
      join tournaments t on t.id = g.tournament_id
      where g.id = group_pairs.group_id and t.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from groups g
      join tournaments t on t.id = g.tournament_id
      where g.id = group_pairs.group_id and t.owner_id = auth.uid()
  ));

-- matches
create policy matches_authenticated_select on matches for select
  using (auth.role() = 'authenticated');
create policy matches_owner_write on matches for all
  using (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from tournaments t where t.id = tournament_id and t.owner_id = auth.uid()
  ));

-- results
create policy results_authenticated_select on results for select
  using (auth.role() = 'authenticated');

-- Only a player of the match may insert a report.
create policy results_player_insert on results for insert
  with check (
    exists (
      select 1 from matches m
      join pairs pa on pa.id = m.pair_a_id
      join pairs pb on pb.id = m.pair_b_id
      join players pla on pla.id in (pa.player_a_id, pa.player_b_id, pb.player_a_id, pb.player_b_id)
      where m.id = results.match_id
        and pla.profile_id = auth.uid()
    )
  );

-- Only owner of tournament may update (validation).
create policy results_owner_update on results for update
  using (exists (
    select 1 from matches m
    join tournaments t on t.id = m.tournament_id
    where m.id = results.match_id and t.owner_id = auth.uid()
  ));

-- rating_snapshots: authenticated read, writes only via service role.
create policy snapshots_authenticated_select on rating_snapshots for select
  using (auth.role() = 'authenticated');

-- notifications
create policy notifications_self_select on notifications for select
  using (user_id = auth.uid());
create policy notifications_self_update on notifications for update
  using (user_id = auth.uid());
create policy notifications_self_delete on notifications for delete
  using (user_id = auth.uid());
