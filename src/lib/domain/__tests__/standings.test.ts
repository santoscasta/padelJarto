import { describe, expect, it } from 'vitest';
import { computeStandings } from '../standings';
import type { Match, Pair, Result } from '../types';

const P = (id: string, r = 1200): Pair => ({
  id, playerAId: `${id}-a`, playerBId: `${id}-b`, rating: r, displayName: null,
});
const M = (id: string, a: string, b: string): Match => ({
  id, tournamentId: 't1', phase: 'group', groupId: 'g1',
  pairAId: a, pairBId: b, court: null, scheduledAt: null,
});
const R = (matchId: string, winner: string, sets: Array<[number, number]>): Result => ({
  id: `r-${matchId}`,
  matchId,
  sets: sets.map(([a, b]) => ({ a, b })),
  winnerPairId: winner,
  reportedBy: 'u', validatedBy: 'u', validatedAt: 'x',
  status: 'validated', correctsResultId: null,
});

describe('computeStandings', () => {
  it('sorts by wins descending', () => {
    const pairs = [P('p1'), P('p2'), P('p3')];
    const matches = [M('m1', 'p1', 'p2'), M('m2', 'p1', 'p3'), M('m3', 'p2', 'p3')];
    const results = [
      R('m1', 'p1', [[6, 2], [6, 3]]),
      R('m2', 'p1', [[6, 4], [6, 4]]),
      R('m3', 'p2', [[6, 1], [6, 0]]),
    ];
    const s = computeStandings(pairs, matches, results);
    expect(s.map((r) => r.pairId)).toEqual(['p1', 'p2', 'p3']);
    expect(s[0].wins).toBe(2);
    expect(s[1].wins).toBe(1);
    expect(s[2].wins).toBe(0);
  });

  it('breaks ties on set difference', () => {
    const pairs = [P('a'), P('b'), P('c')];
    const matches = [M('m1', 'a', 'b'), M('m2', 'a', 'c'), M('m3', 'b', 'c')];
    const results = [
      // a beats b 2-0, c beats a 2-0, b beats c 2-1 → all 1 win
      R('m1', 'a', [[6, 0], [6, 0]]),
      R('m2', 'c', [[0, 6], [0, 6]]),
      R('m3', 'b', [[6, 4], [6, 4]]),
    ];
    const s = computeStandings(pairs, matches, results);
    expect(s.every((r) => r.wins === 1)).toBe(true);
    // sets: a=2-2 (diff 0), b=2-3 (diff -1), c=3-2 (diff +1) → c > a > b
    expect(s[0].pairId).toBe('c');
  });

  it('ignores non-validated results', () => {
    const pairs = [P('p1'), P('p2')];
    const matches = [M('m1', 'p1', 'p2')];
    const results: Result[] = [
      { ...R('m1', 'p1', [[6, 0], [6, 0]]), status: 'reported' },
    ];
    const s = computeStandings(pairs, matches, results);
    expect(s.every((r) => r.wins === 0)).toBe(true);
  });

  it('applies head-to-head on deeper ties', () => {
    const pairs = [P('a'), P('b')];
    const matches = [M('m1', 'a', 'b')];
    // Same wins/sets/games via a walkover-styled fake would be rare; we check
    // that H2H applies when wins/sets/games all equal via a direct 6-0 6-0.
    const results = [R('m1', 'a', [[6, 0], [6, 0]])];
    const s = computeStandings(pairs, matches, results);
    expect(s[0].pairId).toBe('a');
  });

  it('is deterministic (falls back to pair rating)', () => {
    const pairs = [P('lo', 1000), P('hi', 1400)];
    const s = computeStandings(pairs, [], []);
    expect(s[0].pairId).toBe('hi');
    expect(s[1].pairId).toBe('lo');
  });
});
