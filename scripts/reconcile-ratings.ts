#!/usr/bin/env node
/**
 * Backfill ratings for matches whose results were marked `validated` but never
 * received rating snapshots — the consequence of a pre-fix bug where the
 * post-validation writes (snapshots, player ratings, pair ratings) ran outside
 * any transaction and silently failed after the result row was already
 * flipped. See migration 20260506000000_atomic_validate_result.sql.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/reconcile-ratings.ts [--dry-run]
 *
 * The script is idempotent: it skips any result that already has snapshots,
 * and the underlying RPC (apply_validated_result) is itself a no-op on
 * already-reconciled rows.
 */
import { createClient } from '@supabase/supabase-js';
import { applyRating } from '../src/lib/domain/rating';
import type { Match, Pair, Player, Result } from '../src/lib/domain/types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const dryRun = process.argv.includes('--dry-run');
const admin = createClient(url, key, { auth: { persistSession: false } });

async function main(): Promise<void> {
  const { data: validated, error } = await admin
    .from('results')
    .select('id, match_id, sets, winner_pair_id, reported_by, validated_by, validated_at, status, corrects_result_id')
    .eq('status', 'validated')
    .order('validated_at', { ascending: true });
  if (error) throw error;

  const candidates: Result[] = [];
  for (const row of validated ?? []) {
    const { count, error: cErr } = await admin
      .from('rating_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('result_id', row.id);
    if (cErr) throw cErr;
    if ((count ?? 0) === 0) candidates.push(mapResult(row));
  }

  console.log(`Found ${candidates.length} validated result(s) without snapshots.`);
  if (candidates.length === 0) return;

  let applied = 0;
  for (const result of candidates) {
    const match = await fetchMatch(result.matchId);
    const [pairA, pairB] = await Promise.all([
      fetchPair(match.pairAId),
      fetchPair(match.pairBId),
    ]);
    const playersArr = await Promise.all([
      fetchPlayer(pairA.playerAId), fetchPlayer(pairA.playerBId),
      fetchPlayer(pairB.playerAId), fetchPlayer(pairB.playerBId),
    ]);
    const players = Object.fromEntries(playersArr.map((p) => [p.id, p]));
    const pairs = { [pairA.id]: pairA, [pairB.id]: pairB };

    const { snapshots, newPlayerRatings, newPairRatings } = applyRating({
      match, result, players, pairs, now: result.validatedAt ?? new Date().toISOString(),
    });

    console.log(`Match ${match.id} (result ${result.id}):`);
    for (const [pid, rating] of Object.entries(newPlayerRatings)) {
      const before = players[pid].rating;
      console.log(`  player ${pid}: ${before.toFixed(2)} → ${rating.toFixed(2)}`);
    }
    for (const [pid, rating] of Object.entries(newPairRatings)) {
      const before = pairs[pid].rating;
      console.log(`  pair   ${pid}: ${before.toFixed(2)} → ${rating.toFixed(2)}`);
    }

    if (dryRun) continue;

    const { error: rpcErr } = await admin.rpc('apply_validated_result', {
      p_result_id: result.id,
      p_validator: result.validatedBy ?? result.reportedBy,
      p_validated_at: result.validatedAt ?? new Date().toISOString(),
      p_snapshots: snapshots.map((s) => ({
        subject_type: s.subjectType,
        subject_id: s.subjectId,
        before: s.before,
        after: s.after,
        delta: s.delta,
        match_id: s.matchId,
      })),
      p_player_ratings: newPlayerRatings,
      p_pair_ratings: newPairRatings,
    });
    if (rpcErr) throw rpcErr;
    applied += 1;
  }

  console.log(dryRun ? `(dry-run) would reconcile ${candidates.length}` : `Reconciled ${applied} result(s).`);
}

async function fetchMatch(id: string): Promise<Match> {
  const { data, error } = await admin
    .from('matches')
    .select('id, tournament_id, phase, group_id, pair_a_id, pair_b_id, court, scheduled_at')
    .eq('id', id).single();
  if (error) throw error;
  return {
    id: data.id, tournamentId: data.tournament_id, phase: data.phase,
    groupId: data.group_id, pairAId: data.pair_a_id, pairBId: data.pair_b_id,
    court: data.court, scheduledAt: data.scheduled_at,
  };
}

async function fetchPair(id: string): Promise<Pair> {
  const { data, error } = await admin
    .from('pairs')
    .select('id, player_a_id, player_b_id, rating, display_name')
    .eq('id', id).single();
  if (error) throw error;
  return {
    id: data.id, playerAId: data.player_a_id, playerBId: data.player_b_id,
    rating: Number(data.rating), displayName: data.display_name ?? null,
  };
}

async function fetchPlayer(id: string): Promise<Player> {
  const { data, error } = await admin
    .from('players')
    .select('id, profile_id, rating, matches_played, profiles(display_name, avatar_url)')
    .eq('id', id).single();
  if (error) throw error;
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  return {
    id: data.id,
    profileId: data.profile_id,
    displayName: profile?.display_name ?? '',
    avatarUrl: profile?.avatar_url ?? null,
    rating: Number(data.rating),
    matchesPlayed: data.matches_played,
  };
}

function mapResult(row: Record<string, unknown>): Result {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    sets: row.sets as Result['sets'],
    winnerPairId: row.winner_pair_id as string,
    reportedBy: row.reported_by as string,
    validatedBy: (row.validated_by as string | null) ?? null,
    validatedAt: (row.validated_at as string | null) ?? null,
    status: row.status as Result['status'],
    correctsResultId: (row.corrects_result_id as string | null) ?? null,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
