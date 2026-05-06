-- 20260506000000_atomic_validate_result.sql
--
-- Background: the previous validate-result flow performed four separate writes
-- (results.status, rating_snapshots, players, pairs) without a transaction, and
-- snapshot ids were composed strings ("snap-<matchId>-<playerId>") that the
-- uuid-typed `rating_snapshots.id` column rejected. The first write succeeded
-- (status='validated') while the snapshot insert failed, leaving results marked
-- as validated but ratings frozen at 1200.
--
-- This migration adds an atomic RPC that performs all four writes in a single
-- transaction. Snapshot ids are generated server-side (gen_random_uuid). The
-- function is idempotent: if the result already has snapshots it is a no-op,
-- which lets the same code path drive both first-time validation and the
-- reconciliation script for partidos that ended up in the broken state.

create unique index if not exists rating_snapshots_subject_result_uidx
  on rating_snapshots (subject_id, result_id);

create or replace function public.apply_validated_result(
  p_result_id uuid,
  p_validator uuid,
  p_validated_at timestamptz,
  p_snapshots jsonb,
  p_player_ratings jsonb,
  p_pair_ratings jsonb
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  s jsonb;
  kv record;
begin
  if exists (select 1 from rating_snapshots where result_id = p_result_id) then
    return false;
  end if;

  for s in select * from jsonb_array_elements(p_snapshots)
  loop
    insert into rating_snapshots (
      subject_type, subject_id, before, after, delta,
      match_id, result_id, created_at
    ) values (
      (s->>'subject_type')::snapshot_subject,
      (s->>'subject_id')::uuid,
      (s->>'before')::real,
      (s->>'after')::real,
      (s->>'delta')::real,
      (s->>'match_id')::uuid,
      p_result_id,
      p_validated_at
    );
  end loop;

  for kv in select * from jsonb_each_text(p_player_ratings)
  loop
    update players
       set rating = kv.value::real,
           matches_played = matches_played + 1
     where id = kv.key::uuid;
  end loop;

  for kv in select * from jsonb_each_text(p_pair_ratings)
  loop
    update pairs
       set rating = kv.value::real
     where id = kv.key::uuid;
  end loop;

  update results
     set status = 'validated',
         validated_by = coalesce(validated_by, p_validator),
         validated_at = coalesce(validated_at, p_validated_at)
   where id = p_result_id;

  return true;
end;
$$;

grant execute on function public.apply_validated_result(
  uuid, uuid, timestamptz, jsonb, jsonb, jsonb
) to service_role;
