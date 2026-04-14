import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryRepository } from '@/lib/repositories/in-memory-repository';
import { __setRepoFactoryForTests } from '@/lib/repositories/provider';

const sessionMock = vi.hoisted(() => ({ current: null as any }));
vi.mock('@/lib/auth/session', () => ({
  requireSession: async () => {
    if (!sessionMock.current) throw new Error('NOT_AUTHORIZED');
    return sessionMock.current;
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

describe('result actions', () => {
  let repo: InMemoryRepository;

  async function setupTournament() {
    const [p1, p2, p3, p4] = await Promise.all([
      repo.ensurePlayerForProfile('prof-1', 'A'),
      repo.ensurePlayerForProfile('prof-2', 'B'),
      repo.ensurePlayerForProfile('prof-3', 'C'),
      repo.ensurePlayerForProfile('prof-4', 'D'),
    ]);
    const pairA = await repo.upsertPair(p1.id, p2.id);
    const pairB = await repo.upsertPair(p3.id, p4.id);
    const t = await repo.createTournament({
      ownerId: 'prof-owner', name: 't', pairingMode: 'draw',
      size: 4, groupCount: 1, playoffCutoff: 2, startsAt: null,
    });
    const [m] = await repo.createMatches([{
      id: 'm1', tournamentId: t.id, phase: 'group', groupId: null,
      pairAId: pairA.id, pairBId: pairB.id, court: null, scheduledAt: null,
    }]);
    return { t, m, p1, pairA, pairB };
  }

  beforeEach(() => {
    repo = new InMemoryRepository();
    __setRepoFactoryForTests(async () => repo);
  });

  it('reports, then validates, then blocks re-validation', async () => {
    const { t, m, p1, pairA } = await setupTournament();
    sessionMock.current = { userId: 'prof-1', email: null, displayName: 'A', player: p1 };
    const { reportResultAction } = await import('@/app/app/tournaments/[tournamentId]/matches/[matchId]/actions');
    const rep = await reportResultAction({
      matchId: m.id,
      sets: [{ a: 6, b: 2 }, { a: 6, b: 3 }],
    });
    expect(rep.ok).toBe(true);

    sessionMock.current = { userId: 'prof-owner', email: null, displayName: 'O', player: { ...p1, id: 'player-owner', profileId: 'prof-owner' } };
    const { validateResultAction } = await import('@/app/app/tournaments/[tournamentId]/matches/[matchId]/actions');
    const v1 = await validateResultAction({ tournamentId: t.id, matchId: m.id });
    expect(v1.ok).toBe(true);

    const v2 = await validateResultAction({ tournamentId: t.id, matchId: m.id });
    expect(v2.ok).toBe(false);
    if (!v2.ok) expect(v2.code).toBe('RESULT_ALREADY_VALIDATED');

    expect((await repo.getPair(pairA.id))!.rating).toBeGreaterThan(1200);
  });

  it('rejects invalid sets', async () => {
    const { m, p1 } = await setupTournament();
    sessionMock.current = { userId: 'prof-1', email: null, displayName: 'A', player: p1 };
    const { reportResultAction } = await import('@/app/app/tournaments/[tournamentId]/matches/[matchId]/actions');
    const r = await reportResultAction({ matchId: m.id, sets: [{ a: 5, b: 3 }, { a: 6, b: 2 }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('VALIDATION_FAILED');
  });
});
