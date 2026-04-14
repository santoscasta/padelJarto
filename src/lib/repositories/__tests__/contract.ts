import { describe, expect, it, beforeEach } from 'vitest';
import type { Repository } from '../types';

export function runRepositoryContract(
  name: string,
  makeRepo: () => Promise<Repository> | Repository,
): void {
  describe(`[contract] ${name}`, () => {
    let repo: Repository;
    beforeEach(async () => { repo = await makeRepo(); });

    it('creates a tournament in draft status', async () => {
      const t = await repo.createTournament({
        ownerId: 'owner-1', name: 'Abril', pairingMode: 'draw',
        size: 8, groupCount: 2, playoffCutoff: 4, startsAt: null,
      });
      expect(t.status).toBe('draft');
      expect((await repo.getTournament(t.id))?.name).toBe('Abril');
    });

    it('upsertPair returns the same pair for reversed player ids', async () => {
      const p1 = await repo.ensurePlayerForProfile('prof-1', 'Ana');
      const p2 = await repo.ensurePlayerForProfile('prof-2', 'Bea');
      const a = await repo.upsertPair(p1.id, p2.id);
      const b = await repo.upsertPair(p2.id, p1.id);
      expect(a.id).toBe(b.id);
      expect(a.playerAId < a.playerBId).toBe(true);
    });

    it('rejects a duplicate inscription for the same player + tournament', async () => {
      const t = await repo.createTournament({
        ownerId: 'o', name: 't', pairingMode: 'draw',
        size: 8, groupCount: 2, playoffCutoff: 4, startsAt: null,
      });
      const p = await repo.ensurePlayerForProfile('prof', 'P');
      await repo.createInscription({ tournamentId: t.id, playerId: p.id, pairId: null });
      await expect(
        repo.createInscription({ tournamentId: t.id, playerId: p.id, pairId: null }),
      ).rejects.toThrow();
    });

    it('reportResult blocks a second report for the same match', async () => {
      const t = await repo.createTournament({
        ownerId: 'o', name: 't', pairingMode: 'draw',
        size: 4, groupCount: 1, playoffCutoff: 2, startsAt: null,
      });
      const p1 = await repo.ensurePlayerForProfile('a', 'A');
      const p2 = await repo.ensurePlayerForProfile('b', 'B');
      const p3 = await repo.ensurePlayerForProfile('c', 'C');
      const p4 = await repo.ensurePlayerForProfile('d', 'D');
      const pairA = await repo.upsertPair(p1.id, p2.id);
      const pairB = await repo.upsertPair(p3.id, p4.id);
      const [m] = await repo.createMatches([{
        id: 'm1', tournamentId: t.id, phase: 'group', groupId: null,
        pairAId: pairA.id, pairBId: pairB.id, court: null, scheduledAt: null,
      }]);
      await repo.reportResult({
        matchId: m.id, sets: [{ a: 6, b: 2 }, { a: 6, b: 3 }],
        winnerPairId: pairA.id, reportedBy: 'u', status: 'reported', correctsResultId: null,
      });
      await expect(repo.reportResult({
        matchId: m.id, sets: [{ a: 6, b: 0 }, { a: 6, b: 0 }],
        winnerPairId: pairB.id, reportedBy: 'u2', status: 'reported', correctsResultId: null,
      })).rejects.toThrow();
    });

    it('validateResult updates player and pair ratings and writes snapshots', async () => {
      const t = await repo.createTournament({
        ownerId: 'o', name: 't', pairingMode: 'draw',
        size: 4, groupCount: 1, playoffCutoff: 2, startsAt: null,
      });
      const p1 = await repo.ensurePlayerForProfile('a', 'A');
      const p2 = await repo.ensurePlayerForProfile('b', 'B');
      const p3 = await repo.ensurePlayerForProfile('c', 'C');
      const p4 = await repo.ensurePlayerForProfile('d', 'D');
      const pairA = await repo.upsertPair(p1.id, p2.id);
      const pairB = await repo.upsertPair(p3.id, p4.id);
      const [m] = await repo.createMatches([{
        id: 'm-val', tournamentId: t.id, phase: 'group', groupId: null,
        pairAId: pairA.id, pairBId: pairB.id, court: null, scheduledAt: null,
      }]);
      const reported = await repo.reportResult({
        matchId: m.id, sets: [{ a: 6, b: 2 }, { a: 6, b: 3 }],
        winnerPairId: pairA.id, reportedBy: 'u', status: 'reported', correctsResultId: null,
      });
      await repo.validateResult({
        resultId: reported.id, matchId: m.id,
        validatorId: 'o', validatedAt: '2026-04-14T10:00:00Z',
        snapshots: [{
          id: `s-${m.id}-${pairA.id}`, subjectType: 'pair', subjectId: pairA.id,
          before: 1200, after: 1216, delta: 16,
          matchId: m.id, resultId: reported.id, createdAt: '2026-04-14T10:00:00Z',
        }],
        newPlayerRatings: { [p1.id]: 1208, [p2.id]: 1208, [p3.id]: 1192, [p4.id]: 1192 },
        newPairRatings: { [pairA.id]: 1216, [pairB.id]: 1184 },
      });
      expect((await repo.getPair(pairA.id))?.rating).toBeCloseTo(1216);
      expect((await repo.getPlayer(p1.id))?.rating).toBeCloseTo(1208);
      const snaps = await repo.listRatingSnapshotsForSubject('pair', pairA.id);
      expect(snaps).toHaveLength(1);
    });

    it('getInvitationByToken round-trips', async () => {
      const t = await repo.createTournament({
        ownerId: 'o', name: 't', pairingMode: 'draw',
        size: 4, groupCount: 1, playoffCutoff: 2, startsAt: null,
      });
      await repo.createInvitation(t.id, 'token-abc', '2030-01-01T00:00:00Z', 'o');
      const found = await repo.getInvitationByToken('token-abc');
      expect(found?.tournamentId).toBe(t.id);
    });
  });
}
