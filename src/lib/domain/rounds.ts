import type { Group, Match } from './types';

/** One match slot inside a scheduled round. */
export type ScheduledMatch = Readonly<{
  match: Match;
  pairAId: string;
  pairBId: string;
}>;

/** Sub-round inside a single group (jornada N restricted to one group). */
export type GroupRound = Readonly<{
  groupId: string;
  groupLabel: string;
  matches: ReadonlyArray<ScheduledMatch>;
  /** When a group has an odd number of pairs, one pair rests each round. */
  byePairId: string | null;
}>;

/** Tournament-wide jornada — same round number aligned across every group. */
export type TournamentRound = Readonly<{
  number: number;
  groupRounds: ReadonlyArray<GroupRound>;
}>;

const BYE = '__BYE__';

/**
 * Round-robin scheduler using the classic circle method. For even N pairs it
 * produces N-1 rounds with N/2 matches each; for odd N it produces N rounds
 * with (N-1)/2 matches and one pair resting per round. Deterministic given
 * the input pair order.
 */
export function circleSchedulePairs(
  pairIds: ReadonlyArray<string>,
): ReadonlyArray<
  Readonly<{
    matches: ReadonlyArray<readonly [string, string]>;
    byePairId: string | null;
  }>
> {
  if (pairIds.length < 2) return [];
  const working = [...pairIds];
  const oddAugment = working.length % 2 === 1;
  if (oddAugment) working.push(BYE);
  const n = working.length;
  const rounds: Array<{
    matches: Array<readonly [string, string]>;
    byePairId: string | null;
  }> = [];

  for (let r = 0; r < n - 1; r++) {
    const matches: Array<readonly [string, string]> = [];
    let bye: string | null = null;
    for (let i = 0; i < n / 2; i++) {
      const a = working[i];
      const b = working[n - 1 - i];
      if (a === BYE) {
        bye = b;
        continue;
      }
      if (b === BYE) {
        bye = a;
        continue;
      }
      matches.push([a, b] as const);
    }
    rounds.push({ matches, byePairId: bye });
    // Rotate everything except index 0.
    const rest = working.slice(1);
    const last = rest.pop();
    if (last !== undefined) rest.unshift(last);
    working.splice(1, working.length - 1, ...rest);
  }
  return rounds;
}

/**
 * Given a group's pair roster + the already-generated round-robin matches,
 * assign each match to a round so no pair plays twice in the same round.
 * Matches that can't be matched back to a generated Match record are dropped
 * silently (shouldn't happen in practice, but keeps the UI robust).
 */
export function computeGroupRounds(
  group: Group,
  matches: ReadonlyArray<Match>,
): ReadonlyArray<GroupRound> {
  const schedule = circleSchedulePairs(group.pairIds);
  const pool = [...matches];
  const takeMatch = (x: string, y: string): Match | null => {
    const idx = pool.findIndex(
      (m) =>
        (m.pairAId === x && m.pairBId === y) ||
        (m.pairAId === y && m.pairBId === x),
    );
    if (idx === -1) return null;
    const [m] = pool.splice(idx, 1);
    return m;
  };

  return schedule.map((round) => {
    const scheduled: ScheduledMatch[] = [];
    for (const [x, y] of round.matches) {
      const m = takeMatch(x, y);
      if (!m) continue;
      scheduled.push({ match: m, pairAId: x, pairBId: y });
    }
    return {
      groupId: group.id,
      groupLabel: group.label,
      matches: scheduled,
      byePairId: round.byePairId,
    };
  });
}

/**
 * Align rounds across every group into tournament-wide jornadas. Jornada N
 * collects round N from every group; the total count is the max rounds across
 * any single group (groups of 3 pairs have 3 rounds, groups of 4 have 3,
 * groups of 5 have 5, ...).
 */
export function computeTournamentRounds(
  groups: ReadonlyArray<Group>,
  matches: ReadonlyArray<Match>,
): ReadonlyArray<TournamentRound> {
  const groupMatches = new Map<string, Match[]>();
  for (const m of matches) {
    if (!m.groupId) continue;
    const list = groupMatches.get(m.groupId);
    if (list) list.push(m);
    else groupMatches.set(m.groupId, [m]);
  }

  const perGroup = groups.map((g) =>
    computeGroupRounds(g, groupMatches.get(g.id) ?? []),
  );
  const maxRounds = perGroup.reduce((max, gr) => Math.max(max, gr.length), 0);
  const rounds: TournamentRound[] = [];
  for (let i = 0; i < maxRounds; i++) {
    const groupRounds = perGroup
      .map((gr) => gr[i])
      .filter((gr): gr is GroupRound => !!gr);
    rounds.push({ number: i + 1, groupRounds });
  }
  return rounds;
}
