-- 20260414000000_drop_legacy_schema.sql
-- Drop legacy tables from a previous schema iteration before the V1 init
-- migration runs. The remote database `qneatrfosytmjawgarfl` was bootstrapped
-- with an older prototype design (events/teams/stages) and contains only test
-- data. Auth users are preserved (auth schema untouched).

drop table if exists public.audit_log cascade;
drop table if exists public.event_matches cascade;
drop table if exists public.event_players cascade;
drop table if exists public.events cascade;
drop table if exists public.match_result_proposals cascade;
drop table if exists public.match_result_validations cascade;
drop table if exists public.match_sides cascade;
drop table if exists public.matches cascade;
drop table if exists public.notifications cascade;
drop table if exists public.score_submissions cascade;
drop table if exists public.stages cascade;
drop table if exists public.standings cascade;
drop table if exists public.team_members cascade;
drop table if exists public.teams cascade;
drop table if exists public.tournament_memberships cascade;
drop table if exists public.tournament_rules cascade;
drop table if exists public.tournaments cascade;
drop table if exists public.invitations cascade;
drop table if exists public.groups cascade;
drop table if exists public.profiles cascade;

-- Drop legacy enums if they exist under the same names. The V1 init migration
-- recreates them with their canonical definitions.
drop type if exists public.tournament_status cascade;
drop type if exists public.pairing_mode cascade;
drop type if exists public.match_phase cascade;
drop type if exists public.result_status cascade;
drop type if exists public.inscription_status cascade;
drop type if exists public.snapshot_subject cascade;
drop type if exists public.notification_kind cascade;
