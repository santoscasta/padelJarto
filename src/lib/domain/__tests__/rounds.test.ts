import { describe, it, expect } from 'vitest';
import type { Group, Match } from '../types';
import {
  circleSchedulePairs,
  computeGroupRounds,
  computeTournamentRounds,
} from '../rounds';

function mkMatch(
  tournamentId: string,
  groupId: string,
  a: string,
  b: string,
): Match {
  return {
    id: `m-${a}-${b}`,
    tournamentId,
    phase: 'group',
    groupId,
    pairAId: a,
    pairBId: b,
    court: null,
    scheduledAt: null,
  };
}

function roundRobinMatches(
  tournamentId: string,
  groupId: string,
  pairIds: string[],
): Match[] {
  const out: Match[] = [];
  for (let i = 0; i < pairIds.length; i++) {
    for (let j = i + 1; j < pairIds.length; j++) {
      out.push(mkMatch(tournamentId, groupId, pairIds[i], pairIds[j]));
    }
  }
  return out;
}

describe('circleSchedulePairs', () => {
  it('returns no rounds for fewer than 2 pairs', () => {
    expect(circleSchedulePairs([])).toEqual([]);
    expect(circleSchedulePairs(['a'])).toEqual([]);
  });

  it('schedules 4 pairs into 3 rounds × 2 matches with no conflicts', () => {
    const rounds = circleSchedulePairs(['a', 'b', 'c', 'd']);
    expect(rounds).toHaveLength(3);
    for (const r of rounds) {
      expect(r.matches).toHaveLength(2);
      expect(r.byePairId).toBeNull();
      const seen = new Set<string>();
      for (const [x, y] of r.matches) {
        expect(seen.has(x)).toBe(false);
        expect(seen.has(y)).toBe(false);
        seen.add(x);
        seen.add(y);
      }
    }
  });

  it('schedules 8 pairs into 7 rounds × 4 matches (user scenario)', () => {
    const ids = Array.from({ length: 8 }, (_, i) => `p${i + 1}`);
    const rounds = circleSchedulePairs(ids);
    expect(rounds).toHaveLength(7);
    for (const r of rounds) {
      expect(r.matches).toHaveLength(4);
      const seen = new Set<string>();
      for (const [x, y] of r.matches) {
        expect(seen.has(x)).toBe(false);
        expect(seen.has(y)).toBe(false);
        seen.add(x);
        seen.add(y);
      }
    }
    // Every pair meets every other pair exactly once.
    const met = new Set<string>();
    for (const r of rounds) {
      for (const [x, y] of r.matches) {
        const key = x < y ? `${x}:${y}` : `${y}:${x}`;
        expect(met.has(key)).toBe(false);
        met.add(key);
      }
    }
    expect(met.size).toBe((8 * 7) / 2);
  });

  it('schedules 3 pairs into 3 rounds with one bye each', () => {
    const rounds = circleSchedulePairs(['a', 'b', 'c']);
    expect(rounds).toHaveLength(3);
    const byes = rounds.map((r) => r.byePairId).filter(Boolean);
    expect(byes).toHaveLength(3);
    // Each pair rests exactly once.
    expect(new Set(byes)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('schedules 5 pairs into 5 rounds × 2 matches with no conflicts', () => {
    const rounds = circleSchedulePairs(['a', 'b', 'c', 'd', 'e']);
    expect(rounds).toHaveLength(5);
    for (const r of rounds) {
      expect(r.matches).toHaveLength(2);
      expect(r.byePairId).not.toBeNull();
      const seen = new Set<string>();
      for (const [x, y] of r.matches) {
        expect(seen.has(x)).toBe(false);
        expect(seen.has(y)).toBe(false);
        seen.add(x);
        seen.add(y);
      }
      expect(seen.has(r.byePairId!)).toBe(false);
    }
    // Full round-robin: 5*4/2 = 10 unique matches
    const met = new Set<string>();
    for (const r of rounds) {
      for (const [x, y] of r.matches) {
        const key = x < y ? `${x}:${y}` : `${y}:${x}`;
        met.add(key);
      }
    }
    expect(met.size).toBe(10);
  });

  it('is deterministic for the same input', () => {
    const a = circleSchedulePairs(['a', 'b', 'c', 'd']);
    const b = circleSchedulePairs(['a', 'b', 'c', 'd']);
    expect(a).toEqual(b);
  });
});

describe('computeGroupRounds', () => {
  it('pairs up generated matches with the scheduled slots', () => {
    const pairIds = ['p1', 'p2', 'p3', 'p4'];
    const matches = roundRobinMatches('t1', 'g1', pairIds);
    const group: Group = {
      id: 'g1',
      tournamentId: 't1',
      label: 'A',
      pairIds,
    };
    const rounds = computeGroupRounds(group, matches);
    expect(rounds).toHaveLength(3);
    const matchesCovered = rounds.flatMap((r) => r.matches.map((m) => m.match.id));
    expect(new Set(matchesCovered).size).toBe(matches.length);
  });

  it('respects match direction regardless of pair order', () => {
    const pairIds = ['p1', 'p2', 'p3', 'p4'];
    // Flip pair order in some matches to exercise the unordered lookup.
    const matches = roundRobinMatches('t1', 'g1', pairIds).map((m, i) =>
      i % 2 === 0 ? { ...m, pairAId: m.pairBId, pairBId: m.pairAId } : m,
    );
    const rounds = computeGroupRounds(
      { id: 'g1', tournamentId: 't1', label: 'A', pairIds },
      matches,
    );
    expect(rounds.flatMap((r) => r.matches)).toHaveLength(6);
  });
});

describe('computeTournamentRounds', () => {
  it('aligns rounds across multiple groups into tournament-wide jornadas', () => {
    const t = 't1';
    const gA: Group = {
      id: 'gA',
      tournamentId: t,
      label: 'A',
      pairIds: ['a1', 'a2', 'a3', 'a4'],
    };
    const gB: Group = {
      id: 'gB',
      tournamentId: t,
      label: 'B',
      pairIds: ['b1', 'b2', 'b3', 'b4'],
    };
    const matches = [
      ...roundRobinMatches(t, 'gA', [...gA.pairIds]),
      ...roundRobinMatches(t, 'gB', [...gB.pairIds]),
    ];

    const rounds = computeTournamentRounds([gA, gB], matches);
    expect(rounds).toHaveLength(3);
    for (const r of rounds) {
      expect(r.groupRounds).toHaveLength(2);
      const allMatches = r.groupRounds.flatMap((gr) => gr.matches);
      expect(allMatches).toHaveLength(4); // 2 per group × 2 groups
      // No pair plays twice within the same tournament round.
      const seenPairs = new Set<string>();
      for (const m of allMatches) {
        expect(seenPairs.has(m.pairAId)).toBe(false);
        expect(seenPairs.has(m.pairBId)).toBe(false);
        seenPairs.add(m.pairAId);
        seenPairs.add(m.pairBId);
      }
    }
  });

  it('stretches to the longest group when sizes differ', () => {
    // Group A: 4 pairs → 3 rounds. Group B: 5 pairs → 5 rounds.
    const t = 't1';
    const gA: Group = {
      id: 'gA',
      tournamentId: t,
      label: 'A',
      pairIds: ['a1', 'a2', 'a3', 'a4'],
    };
    const gB: Group = {
      id: 'gB',
      tournamentId: t,
      label: 'B',
      pairIds: ['b1', 'b2', 'b3', 'b4', 'b5'],
    };
    const matches = [
      ...roundRobinMatches(t, 'gA', [...gA.pairIds]),
      ...roundRobinMatches(t, 'gB', [...gB.pairIds]),
    ];
    const rounds = computeTournamentRounds([gA, gB], matches);
    expect(rounds).toHaveLength(5);
    // Rounds 4 and 5 only have group B entries.
    expect(rounds[3].groupRounds).toHaveLength(1);
    expect(rounds[3].groupRounds[0].groupLabel).toBe('B');
    expect(rounds[4].groupRounds).toHaveLength(1);
  });
});
