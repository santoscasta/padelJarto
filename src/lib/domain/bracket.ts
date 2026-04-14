import type { Group, Match, MatchPhase, Pair } from './types';

function groupLabel(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C...
}

export function generateGroups(
  pairs: ReadonlyArray<Pair>,
  groupCount: number,
  tournamentId: string,
): ReadonlyArray<Group> {
  if (groupCount < 1) throw new Error('groupCount must be >= 1');
  if (pairs.length % groupCount !== 0) {
    throw new Error(`size (${pairs.length}) must be divisible by groupCount (${groupCount})`);
  }
  const sorted = [...pairs].sort((a, b) => b.rating - a.rating);
  const buckets: string[][] = Array.from({ length: groupCount }, () => []);
  // Snake distribution: 0..N-1, N-1..0, 0..N-1, ...
  sorted.forEach((p, i) => {
    const row = Math.floor(i / groupCount);
    const col = i % groupCount;
    const target = row % 2 === 0 ? col : groupCount - 1 - col;
    buckets[target].push(p.id);
  });
  return buckets.map((pairIds, i) => ({
    id: `group-${tournamentId}-${groupLabel(i)}`,
    tournamentId,
    label: groupLabel(i),
    pairIds,
  }));
}

export function generateRoundRobinMatches(
  pairIds: ReadonlyArray<string>,
  tournamentId: string,
  groupId: string,
): ReadonlyArray<Match> {
  const matches: Match[] = [];
  for (let i = 0; i < pairIds.length; i++) {
    for (let j = i + 1; j < pairIds.length; j++) {
      matches.push({
        id: `match-${groupId}-${pairIds[i]}-${pairIds[j]}`,
        tournamentId,
        phase: 'group' satisfies MatchPhase,
        groupId,
        pairAId: pairIds[i],
        pairBId: pairIds[j],
        court: null,
        scheduledAt: null,
      });
    }
  }
  return matches;
}

const PHASE_BY_CUTOFF: Readonly<Record<number, MatchPhase>> = {
  2: 'F',
  4: 'SF',
  8: 'QF',
  16: 'R16',
};

export function knockoutPhaseFor(cutoff: number): MatchPhase {
  const phase = PHASE_BY_CUTOFF[cutoff];
  if (!phase) throw new Error(`No knockout phase for cutoff=${cutoff}`);
  return phase;
}

/**
 * Generates the initial knockout round matches.
 * `standingsPerGroup[g][i]` is the i-th qualifier of group g (0-indexed).
 * `groupCount === 1` → single-group seeding: 1 vs cutoff, 2 vs cutoff-1, …
 * `groupCount > 1`   → multi-group seeding: 1A vs 2B, 1B vs 2A, and so on.
 */
export function seedKnockout(
  standingsPerGroup: ReadonlyArray<ReadonlyArray<Pair>>,
  cutoff: number,
  tournamentId: string,
): ReadonlyArray<Match> {
  const phase = knockoutPhaseFor(cutoff);
  const groupCount = standingsPerGroup.length;

  if (groupCount === 1) {
    const qualified = standingsPerGroup[0].slice(0, cutoff);
    if (qualified.length !== cutoff) throw new Error(`expected ${cutoff} qualifiers, got ${qualified.length}`);
    const matches: Match[] = [];
    for (let i = 0; i < cutoff / 2; i++) {
      const a = qualified[i];
      const b = qualified[cutoff - 1 - i];
      matches.push(mkKnockoutMatch(tournamentId, phase, a.id, b.id, i));
    }
    return matches;
  }

  // Multi-group: take top N per group where N = cutoff / groupCount
  const perGroup = cutoff / groupCount;
  if (!Number.isInteger(perGroup) || perGroup < 1) {
    throw new Error(`cutoff (${cutoff}) must be a positive multiple of groupCount (${groupCount})`);
  }
  const qualifiersPerGroup = standingsPerGroup.map((s) => s.slice(0, perGroup));

  // Cross-seed by position: for each seed position s (0..perGroup-1),
  //   pair group g seed s with group (g+1 mod groupCount) seed (perGroup-1-s).
  const matches: Match[] = [];
  let idx = 0;
  for (let s = 0; s < perGroup; s++) {
    for (let g = 0; g < groupCount; g++) {
      const a = qualifiersPerGroup[g][s];
      const oppGroup = (g + 1) % groupCount;
      const b = qualifiersPerGroup[oppGroup][perGroup - 1 - s];
      if (!a || !b) continue;
      matches.push(mkKnockoutMatch(tournamentId, phase, a.id, b.id, idx++));
    }
  }
  // For a clean bracket we want exactly cutoff / 2 matches.
  return matches.slice(0, cutoff / 2);
}

function mkKnockoutMatch(
  tournamentId: string,
  phase: MatchPhase,
  pairA: string,
  pairB: string,
  slot: number,
): Match {
  return {
    id: `match-${tournamentId}-${phase}-${slot}`,
    tournamentId,
    phase,
    groupId: null,
    pairAId: pairA,
    pairBId: pairB,
    court: null,
    scheduledAt: null,
  };
}
