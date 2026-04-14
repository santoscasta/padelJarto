import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enqueueNotification } from './enqueue';
import { InMemoryRepository } from '@/lib/repositories/in-memory-repository';

const fetchMock = vi.fn().mockResolvedValue({ ok: true });
beforeEach(() => { fetchMock.mockClear(); (globalThis as any).fetch = fetchMock; });

describe('enqueueNotification', () => {
  it('persists a notification row and calls the dispatcher endpoint', async () => {
    const repo = new InMemoryRepository();
    await enqueueNotification(repo, {
      userId: 'u1',
      kind: 'tournament_open',
      payload: { kind: 'tournament_open', tournamentName: 'T', inviteUrl: 'https://x/i' },
      dispatcherUrl: 'https://edge.fn/notify',
      dispatcherKey: 'k',
    });
    const rows = await repo.listNotifications('u1');
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('tournament_open');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does not throw when dispatcher fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));
    const repo = new InMemoryRepository();
    await expect(enqueueNotification(repo, {
      userId: 'u1',
      kind: 'tournament_open',
      payload: { kind: 'tournament_open', tournamentName: 'T', inviteUrl: 'https://x/i' },
      dispatcherUrl: 'https://edge.fn/notify',
      dispatcherKey: 'k',
    })).resolves.toBeUndefined();
  });
});
