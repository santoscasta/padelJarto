/**
 * Variable pair assignment strategies per PadelFlow spec.
 *
 * Three strategies:
 * - manual: organizer picks pairs for a round
 * - balanced_shuffle: random but attempts to balance by level
 * - auto_rotation: avoid repeating partner in consecutive rounds
 */

import type { VariablePairStrategy } from "@/lib/domain/types";

export interface PairAssignment {
  playerIds: [string, string];
}

/**
 * Shuffle an array using Fisher-Yates algorithm.
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Assign pairs using balanced shuffle strategy.
 * Shuffles players and pairs them sequentially.
 */
export function assignPairsBalancedShuffle(
  playerIds: string[],
): PairAssignment[] {
  const shuffled = shuffle(playerIds);
  const pairs: PairAssignment[] = [];
  for (let i = 0; i + 1 < shuffled.length; i += 2) {
    pairs.push({ playerIds: [shuffled[i], shuffled[i + 1]] });
  }
  return pairs;
}

/**
 * Assign pairs using auto rotation strategy.
 * Avoids repeating the same partner from the previous round.
 */
export function assignPairsAutoRotation(
  playerIds: string[],
  previousPairs: PairAssignment[],
): PairAssignment[] {
  const previousPartners = new Map<string, string>();
  for (const pair of previousPairs) {
    previousPartners.set(pair.playerIds[0], pair.playerIds[1]);
    previousPartners.set(pair.playerIds[1], pair.playerIds[0]);
  }

  const available = [...playerIds];
  const pairs: PairAssignment[] = [];
  const used = new Set<string>();

  // Try to pair each player with someone who wasn't their partner last round
  for (const playerId of available) {
    if (used.has(playerId)) continue;

    const previousPartner = previousPartners.get(playerId);
    const candidate = available.find(
      (other) =>
        other !== playerId &&
        !used.has(other) &&
        other !== previousPartner,
    );

    if (candidate) {
      pairs.push({ playerIds: [playerId, candidate] });
      used.add(playerId);
      used.add(candidate);
    }
  }

  // Pair any remaining players who couldn't avoid their previous partner
  const remaining = available.filter((id) => !used.has(id));
  for (let i = 0; i + 1 < remaining.length; i += 2) {
    pairs.push({ playerIds: [remaining[i], remaining[i + 1]] });
  }

  return pairs;
}

/**
 * Assign variable pairs for a round based on the chosen strategy.
 */
export function assignVariablePairs(
  playerIds: string[],
  strategy: VariablePairStrategy,
  previousPairs: PairAssignment[] = [],
  manualPairs?: PairAssignment[],
): PairAssignment[] {
  switch (strategy) {
    case "manual":
      if (!manualPairs) throw new Error("Manual pairs must be provided for manual strategy.");
      return manualPairs;
    case "balanced_shuffle":
      return assignPairsBalancedShuffle(playerIds);
    case "auto_rotation":
      return assignPairsAutoRotation(playerIds, previousPairs);
  }
}
