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
