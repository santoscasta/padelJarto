import { describe, expect, it } from 'vitest';
import { applyRating, expectedScore } from '../rating';
import type { Match, Pair, Player, Result } from '../types';

const player = (id: string, rating: number, matchesPlayed = 20): Player => ({
  id, profileId: `p-${id}`, displayName: id, avatarUrl: null, rating, matchesPlayed,
});
const pair = (id: string, a: string, b: string, rating: number): Pair => ({
  id, playerAId: a, playerBId: b, rating, displayName: null,
});
const baseMatch: Match = {
  id: 'm1', tournamentId: 't1', phase: 'group', groupId: 'g1',
  pairAId: 'pairA', pairBId: 'pairB', court: null, scheduledAt: null,
};

describe('expectedScore', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
  });
  it('returns > 0.5 when self > opponent', () => {
    expect(expectedScore(1400, 1200)).toBeGreaterThan(0.5);
  });
});

describe('applyRating', () => {
  it('produces exactly 6 snapshots (4 players + 2 pairs)', () => {
    const players = {
      p1: player('p1', 1200), p2: player('p2', 1200),
      p3: player('p3', 1200), p4: player('p4', 1200),
    };
    const pairs = {
      pairA: pair('pairA', 'p1', 'p2', 1200),
      pairB: pair('pairB', 'p3', 'p4', 1200),
    };
    const result: Result = {
      id: 'r1', matchId: 'm1', sets: [{ a: 6, b: 4 }, { a: 6, b: 3 }],
      winnerPairId: 'pairA', reportedBy: 'u1', validatedBy: 'u2',
      validatedAt: '2026-04-14T00:00:00Z', status: 'validated', correctsResultId: null,
    };
    const { snapshots } = applyRating({ match: baseMatch, result, players, pairs, now: '2026-04-14T00:00:00Z' });
    expect(snapshots).toHaveLength(6);
    expect(snapshots.filter((s) => s.subjectType === 'player')).toHaveLength(4);
    expect(snapshots.filter((s) => s.subjectType === 'pair')).toHaveLength(2);
  });

  it('winner gains and loser loses the same magnitude for equal teams (K=32)', () => {
    const players = {
      p1: player('p1', 1200), p2: player('p2', 1200),
      p3: player('p3', 1200), p4: player('p4', 1200),
    };
    const pairs = {
      pairA: pair('pairA', 'p1', 'p2', 1200),
      pairB: pair('pairB', 'p3', 'p4', 1200),
    };
    const result: Result = {
      id: 'r', matchId: 'm1', sets: [{ a: 6, b: 0 }, { a: 6, b: 0 }],
      winnerPairId: 'pairA', reportedBy: 'u', validatedBy: 'u',
      validatedAt: '2026-04-14T00:00:00Z', status: 'validated', correctsResultId: null,
    };
    const { newPairRatings } = applyRating({ match: baseMatch, result, players, pairs, now: '2026-04-14T00:00:00Z' });
    const a = newPairRatings.pairA - 1200;
    const b = 1200 - newPairRatings.pairB;
    expect(a).toBeCloseTo(16, 5);        // 32 * (1 - 0.5) = 16
    expect(b).toBeCloseTo(16, 5);
  });

  it('applies K=48 when a player has fewer than 10 matches played', () => {
    const players = {
      p1: player('p1', 1200, 5), p2: player('p2', 1200, 20),
      p3: player('p3', 1200, 20), p4: player('p4', 1200, 20),
    };
    const pairs = {
      pairA: pair('pairA', 'p1', 'p2', 1200),
      pairB: pair('pairB', 'p3', 'p4', 1200),
    };
    const result: Result = {
      id: 'r', matchId: 'm1', sets: [{ a: 6, b: 0 }, { a: 6, b: 0 }],
      winnerPairId: 'pairA', reportedBy: 'u', validatedBy: 'u',
      validatedAt: 'x', status: 'validated', correctsResultId: null,
    };
    const { snapshots } = applyRating({ match: baseMatch, result, players, pairs, now: 'x' });
    const snapP1 = snapshots.find((s) => s.subjectType === 'player' && s.subjectId === 'p1');
    expect(snapP1).toBeDefined();
    expect(snapP1!.delta).toBeCloseTo(24, 5);     // 48 * 0.5 = 24
  });

  it('underdog pair winning gains more than 16 points', () => {
    const players = {
      p1: player('p1', 1000), p2: player('p2', 1000),
      p3: player('p3', 1400), p4: player('p4', 1400),
    };
    const pairs = {
      pairA: pair('pairA', 'p1', 'p2', 1000),
      pairB: pair('pairB', 'p3', 'p4', 1400),
    };
    const result: Result = {
      id: 'r', matchId: 'm1', sets: [{ a: 6, b: 3 }, { a: 6, b: 2 }],
      winnerPairId: 'pairA', reportedBy: 'u', validatedBy: 'u',
      validatedAt: 'x', status: 'validated', correctsResultId: null,
    };
    const { newPairRatings } = applyRating({ match: baseMatch, result, players, pairs, now: 'x' });
    expect(newPairRatings.pairA - 1000).toBeGreaterThan(16);
  });

  it('favorite pair winning gains fewer than 16 points', () => {
    const players = {
      p1: player('p1', 1400), p2: player('p2', 1400),
      p3: player('p3', 1000), p4: player('p4', 1000),
    };
    const pairs = {
      pairA: pair('pairA', 'p1', 'p2', 1400),
      pairB: pair('pairB', 'p3', 'p4', 1000),
    };
    const result: Result = {
      id: 'r', matchId: 'm1', sets: [{ a: 6, b: 2 }, { a: 6, b: 1 }],
      winnerPairId: 'pairA', reportedBy: 'u', validatedBy: 'u',
      validatedAt: 'x', status: 'validated', correctsResultId: null,
    };
    const { newPairRatings } = applyRating({ match: baseMatch, result, players, pairs, now: 'x' });
    expect(newPairRatings.pairA - 1400).toBeLessThan(16);
    expect(newPairRatings.pairA - 1400).toBeGreaterThan(0);
  });

  it('emits snapshots with deterministic ids derived from matchId + subjectId', () => {
    const players = {
      p1: player('p1', 1200), p2: player('p2', 1200),
      p3: player('p3', 1200), p4: player('p4', 1200),
    };
    const pairs = {
      pairA: pair('pairA', 'p1', 'p2', 1200),
      pairB: pair('pairB', 'p3', 'p4', 1200),
    };
    const result: Result = {
      id: 'r1', matchId: 'm1', sets: [{ a: 6, b: 0 }, { a: 6, b: 0 }],
      winnerPairId: 'pairA', reportedBy: 'u', validatedBy: 'u',
      validatedAt: 'x', status: 'validated', correctsResultId: null,
    };
    const { snapshots } = applyRating({ match: baseMatch, result, players, pairs, now: 'x' });
    const ids = snapshots.map((s) => s.id);
    expect(new Set(ids).size).toBe(6);
    for (const s of snapshots) {
      expect(s.id).toContain('m1');
      expect(s.id).toContain(s.subjectId);
    }
  });
});
