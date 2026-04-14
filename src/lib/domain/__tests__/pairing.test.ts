import { describe, expect, it } from 'vitest';
import { drawPairs } from '../pairing';
import type { Player } from '../types';

const P = (id: string, r: number): Player => ({
  id, profileId: `pro-${id}`, displayName: id, rating: r, matchesPlayed: 20,
});

describe('drawPairs', () => {
  it('is deterministic for the same seed', () => {
    const singles = [P('a', 1300), P('b', 1100), P('c', 1250), P('d', 1150)];
    const first = drawPairs(singles, 7);
    const second = drawPairs(singles, 7);
    expect(first).toEqual(second);
  });
  it('produces exactly floor(N/2) pairs with leftover returned', () => {
    const singles = [P('a', 1200), P('b', 1200), P('c', 1200)];
    const { pairs, leftover } = drawPairs(singles, 1);
    expect(pairs).toHaveLength(1);
    expect(leftover).toHaveLength(1);
  });
  it('balances highest with lowest (snake draft)', () => {
    const singles = [P('top', 1400), P('mid1', 1250), P('mid2', 1150), P('low', 1000)];
    const { pairs } = drawPairs(singles, 1);
    // The top and the low should end up on the same pair
    const pairWithTop = pairs.find((p) => p.playerAId === 'top' || p.playerBId === 'top');
    expect(pairWithTop).toBeDefined();
    expect(pairWithTop!.playerAId === 'low' || pairWithTop!.playerBId === 'low').toBe(true);
  });
  it('orders playerAId < playerBId (canonical)', () => {
    const singles = [P('zz', 1300), P('aa', 1100)];
    const { pairs } = drawPairs(singles, 1);
    expect(pairs[0].playerAId < pairs[0].playerBId).toBe(true);
  });
  it('does not mutate input', () => {
    const singles = [P('a', 1200), P('b', 1300)];
    const snapshot = JSON.parse(JSON.stringify(singles));
    drawPairs(singles, 5);
    expect(singles).toEqual(snapshot);
  });
});
