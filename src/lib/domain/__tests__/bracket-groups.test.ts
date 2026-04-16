import { describe, expect, it } from 'vitest';
import { generateGroups, generateRoundRobinMatches } from '../bracket';
import type { Pair } from '../types';

const mkPair = (id: string, rating: number): Pair => ({
  id, playerAId: `${id}-x`, playerBId: `${id}-y`, rating, displayName: null,
});

describe('generateGroups', () => {
  it('returns one group containing all pairs when groupCount=1', () => {
    const pairs = [mkPair('p1', 1200), mkPair('p2', 1300), mkPair('p3', 1100)];
    const groups = generateGroups(pairs, 1, 't1');
    expect(groups).toHaveLength(1);
    expect(groups[0].pairIds).toHaveLength(3);
    expect(groups[0].label).toBe('A');
    expect(groups[0].tournamentId).toBe('t1');
  });
  it('distributes evenly when groupCount divides size', () => {
    const pairs = Array.from({ length: 8 }, (_, i) => mkPair(`p${i}`, 1200 + i * 10));
    const groups = generateGroups(pairs, 2, 't');
    expect(groups).toHaveLength(2);
    expect(groups[0].pairIds).toHaveLength(4);
    expect(groups[1].pairIds).toHaveLength(4);
    expect(groups[0].label).toBe('A');
    expect(groups[1].label).toBe('B');
  });
  it('throws when size is not divisible by groupCount', () => {
    const pairs = [mkPair('a', 1200), mkPair('b', 1200), mkPair('c', 1200)];
    expect(() => generateGroups(pairs, 2, 't')).toThrow();
  });
  it('balances average rating across groups (snake distribution)', () => {
    const pairs = [
      mkPair('a', 1500), mkPair('b', 1400),
      mkPair('c', 1300), mkPair('d', 1200),
    ];
    const groups = generateGroups(pairs, 2, 't');
    const avg = (ids: ReadonlyArray<string>) =>
      ids.reduce((s, id) => s + pairs.find((p) => p.id === id)!.rating, 0) / ids.length;
    expect(Math.abs(avg(groups[0].pairIds) - avg(groups[1].pairIds))).toBeLessThanOrEqual(50);
  });
});

describe('generateRoundRobinMatches', () => {
  it('produces N*(N-1)/2 matches for a group', () => {
    const matches = generateRoundRobinMatches(['p1', 'p2', 'p3', 'p4'], 't1', 'g1');
    expect(matches).toHaveLength(6);
  });
  it('marks every match as phase "group" with tournamentId and groupId', () => {
    const matches = generateRoundRobinMatches(['p1', 'p2'], 't1', 'g1');
    expect(matches).toHaveLength(1);
    expect(matches[0].phase).toBe('group');
    expect(matches[0].tournamentId).toBe('t1');
    expect(matches[0].groupId).toBe('g1');
  });
  it('never pairs a pair with itself', () => {
    const matches = generateRoundRobinMatches(['a', 'b', 'c'], 't', 'g');
    for (const m of matches) expect(m.pairAId).not.toBe(m.pairBId);
  });
});
