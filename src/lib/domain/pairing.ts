import type { Pair, Player } from './types';
import { seededShuffle } from './rng';
import { ELO_BASE } from '../utils/constants';

export type DrawPairsOutput = Readonly<{
  pairs: ReadonlyArray<Pair>;
  leftover: ReadonlyArray<Player>;
}>;

export function drawPairs(singles: ReadonlyArray<Player>, seed: number): DrawPairsOutput {
  // Shuffle within same rating to avoid ties producing identical outputs across runs.
  const shuffled = seededShuffle(singles, seed);
  const sorted = [...shuffled].sort((a, b) => b.rating - a.rating);
  const n = sorted.length;
  const pairCount = Math.floor(n / 2);

  const pairs: Pair[] = [];
  for (let i = 0; i < pairCount; i++) {
    // Snake: strongest with weakest remaining.
    const top = sorted[i];
    const bot = sorted[n - 1 - i];
    const [a, b] = top.id < bot.id ? [top.id, bot.id] : [bot.id, top.id];
    pairs.push({
      id: `pair-${a}-${b}`,
      playerAId: a,
      playerBId: b,
      rating: (top.rating + bot.rating) / 2 || ELO_BASE,
      displayName: null,
    });
  }
  const leftover = n % 2 === 1 ? [sorted[Math.floor(n / 2)]] : [];
  return { pairs, leftover };
}
