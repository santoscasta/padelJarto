import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryRepository } from '@/lib/repositories/in-memory-repository';
import { __setRepoFactoryForTests } from '@/lib/repositories/provider';

const sessionMock = vi.hoisted(() => ({ current: null as any }));

vi.mock('@/lib/auth/session', () => ({
  requireSession: async () => {
    if (!sessionMock.current) throw new Error('NOT_AUTHORIZED');
    return sessionMock.current;
  },
  getSession: async () => sessionMock.current,
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

describe('createTournamentAction', () => {
  let repo: InMemoryRepository;
  beforeEach(() => {
    repo = new InMemoryRepository();
    __setRepoFactoryForTests(async () => repo);
    sessionMock.current = {
      userId: 'owner-profile',
      email: 'o@x.com',
      displayName: 'Owner',
      player: { id: 'player-owner', profileId: 'owner-profile', displayName: 'Owner', rating: 1200, matchesPlayed: 0 },
    };
  });

  it('creates a draft tournament with valid input', async () => {
    const { createTournamentAction } = await import('@/app/app/tournaments/actions');
    const res = await createTournamentAction({
      name: 'Abril',
      pairingMode: 'draw',
      size: 8,
      groupCount: 2,
      playoffCutoff: 4,
      startsAt: '2026-05-01T18:00:00.000Z',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const t = await repo.getTournament(res.data.id);
      expect(t?.status).toBe('draft');
      expect(t?.ownerId).toBe('owner-profile');
    }
  });

  it('rejects invalid cutoff', async () => {
    const { createTournamentAction } = await import('@/app/app/tournaments/actions');
    const res = await createTournamentAction({
      name: 'Bad', pairingMode: 'draw',
      size: 8, groupCount: 2, playoffCutoff: 5, startsAt: null,
    } as any);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('VALIDATION_FAILED');
  });

  it('rejects when no session', async () => {
    sessionMock.current = null;
    const { createTournamentAction } = await import('@/app/app/tournaments/actions');
    const res = await createTournamentAction({
      name: 'x', pairingMode: 'draw',
      size: 8, groupCount: 2, playoffCutoff: 4, startsAt: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('NOT_AUTHORIZED');
  });
});
