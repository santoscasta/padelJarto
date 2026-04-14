import { describe, expect, it } from 'vitest';
import { seedKnockout, knockoutPhaseFor } from '../bracket';
import type { Pair } from '../types';

const P = (id: string, r = 1200): Pair => ({
  id, playerAId: `${id}-a`, playerBId: `${id}-b`, rating: r,
});

describe('knockoutPhaseFor', () => {
  it('maps cutoffs to phases', () => {
    expect(knockoutPhaseFor(2)).toBe('F');
    expect(knockoutPhaseFor(4)).toBe('SF');
    expect(knockoutPhaseFor(8)).toBe('QF');
    expect(knockoutPhaseFor(16)).toBe('R16');
  });
  it('throws for cutoffs that do not start a knockout', () => {
    expect(() => knockoutPhaseFor(0)).toThrow();
    expect(() => knockoutPhaseFor(1)).toThrow();
    expect(() => knockoutPhaseFor(3)).toThrow();
  });
});

describe('seedKnockout — single group', () => {
  it('cutoff=4: seeds 1 vs 4, 2 vs 3', () => {
    const standings = [[P('p1'), P('p2'), P('p3'), P('p4')]];
    const matches = seedKnockout(standings, 4, 't1');
    expect(matches).toHaveLength(2);
    expect(matches[0].pairAId).toBe('p1');
    expect(matches[0].pairBId).toBe('p4');
    expect(matches[1].pairAId).toBe('p2');
    expect(matches[1].pairBId).toBe('p3');
    expect(matches.every((m) => m.phase === 'SF')).toBe(true);
  });
  it('cutoff=2: single final 1 vs 2', () => {
    const standings = [[P('top'), P('runner')]];
    const matches = seedKnockout(standings, 2, 't');
    expect(matches).toHaveLength(1);
    expect(matches[0].phase).toBe('F');
    expect(matches[0].pairAId).toBe('top');
    expect(matches[0].pairBId).toBe('runner');
  });
});

describe('seedKnockout — multi group', () => {
  it('cutoff=4 groupCount=2: 1A vs 2B, 1B vs 2A in SF', () => {
    const standingsByGroup = [
      [P('a1'), P('a2')],
      [P('b1'), P('b2')],
    ];
    const matches = seedKnockout(standingsByGroup, 4, 't');
    expect(matches).toHaveLength(2);
    expect(matches[0].pairAId).toBe('a1');
    expect(matches[0].pairBId).toBe('b2');
    expect(matches[1].pairAId).toBe('b1');
    expect(matches[1].pairBId).toBe('a2');
    expect(matches.every((m) => m.phase === 'SF')).toBe(true);
  });
  it('cutoff=8 groupCount=4: QF matchups cross-seeded per group', () => {
    const standings = [
      [P('a1'), P('a2')],
      [P('b1'), P('b2')],
      [P('c1'), P('c2')],
      [P('d1'), P('d2')],
    ];
    const matches = seedKnockout(standings, 8, 't');
    expect(matches).toHaveLength(4);
    expect(matches.every((m) => m.phase === 'QF')).toBe(true);
  });
});
