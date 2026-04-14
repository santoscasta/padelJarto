import {
  ELO_BASE,
  ELO_K,
  ELO_K_NEWCOMER,
  ELO_NEWCOMER_THRESHOLD,
} from '../utils/constants';
import type { Match, Pair, Player, RatingSnapshot, Result } from './types';

export function expectedScore(self: number, opp: number): number {
  return 1 / (1 + 10 ** ((opp - self) / 400));
}

type PlayersById = Readonly<Record<string, Player>>;
type PairsById = Readonly<Record<string, Pair>>;

export type ApplyRatingInput = {
  match: Match;
  result: Result;
  players: PlayersById;
  pairs: PairsById;
  now: string;
};

export type ApplyRatingOutput = Readonly<{
  snapshots: ReadonlyArray<RatingSnapshot>;
  newPlayerRatings: Readonly<Record<string, number>>;
  newPairRatings: Readonly<Record<string, number>>;
}>;

function kFor(p: Player): number {
  return p.matchesPlayed < ELO_NEWCOMER_THRESHOLD ? ELO_K_NEWCOMER : ELO_K;
}

export function applyRating(input: ApplyRatingInput): ApplyRatingOutput {
  const { match, result, players, pairs, now } = input;
  const pairA = pairs[match.pairAId];
  const pairB = pairs[match.pairBId];
  if (!pairA || !pairB) throw new Error('applyRating: missing pair');
  const pA = [players[pairA.playerAId], players[pairA.playerBId]];
  const pB = [players[pairB.playerAId], players[pairB.playerBId]];
  if (pA.some((x) => !x) || pB.some((x) => !x)) throw new Error('applyRating: missing player');

  const aWon = result.winnerPairId === pairA.id;
  const scoreA = aWon ? 1 : 0;
  const scoreB = 1 - scoreA;

  // Pair ratings
  const expPairA = expectedScore(pairA.rating, pairB.rating);
  const pairDelta = ELO_K * (scoreA - expPairA);
  const newPairARating = pairA.rating + pairDelta;
  const newPairBRating = pairB.rating - pairDelta;

  // Player ratings — per-partner, using team avg vs opponent avg
  const avgA = (pA[0].rating + pA[1].rating) / 2;
  const avgB = (pB[0].rating + pB[1].rating) / 2;
  const expA = expectedScore(avgA, avgB);

  const snapshots: RatingSnapshot[] = [];
  const newPlayerRatings: Record<string, number> = {};

  const sidePlayers: Array<{ p: Player; exp: number; score: number }> = [
    { p: pA[0], exp: expA, score: scoreA },
    { p: pA[1], exp: expA, score: scoreA },
    { p: pB[0], exp: 1 - expA, score: scoreB },
    { p: pB[1], exp: 1 - expA, score: scoreB },
  ];

  for (const { p, exp, score } of sidePlayers) {
    const k = kFor(p);
    const delta = k * (score - exp);
    const after = p.rating + delta;
    newPlayerRatings[p.id] = after;
    snapshots.push({
      id: `snap-${match.id}-${p.id}`,
      subjectType: 'player',
      subjectId: p.id,
      before: p.rating,
      after,
      delta,
      matchId: match.id,
      resultId: result.id,
      createdAt: now,
    });
  }

  snapshots.push({
    id: `snap-${match.id}-${pairA.id}`,
    subjectType: 'pair',
    subjectId: pairA.id,
    before: pairA.rating,
    after: newPairARating,
    delta: newPairARating - pairA.rating,
    matchId: match.id,
    resultId: result.id,
    createdAt: now,
  });
  snapshots.push({
    id: `snap-${match.id}-${pairB.id}`,
    subjectType: 'pair',
    subjectId: pairB.id,
    before: pairB.rating,
    after: newPairBRating,
    delta: newPairBRating - pairB.rating,
    matchId: match.id,
    resultId: result.id,
    createdAt: now,
  });

  return {
    snapshots,
    newPlayerRatings,
    newPairRatings: { [pairA.id]: newPairARating, [pairB.id]: newPairBRating },
  };
}
