'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'node:crypto';
import { addDays } from 'date-fns';
import {
  ALLOWED_PLAYOFF_CUTOFFS,
  INVITATION_TOKEN_BYTES,
  INVITATION_TTL_DAYS,
  PAIRING_MODE,
} from '@/lib/utils/constants';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { fail, ok, type ActionResult } from '@/lib/domain/action-result';
import type { Tournament } from '@/lib/domain/types';
import { generateGroups, generateRoundRobinMatches, knockoutPhaseFor, seedKnockout } from '@/lib/domain/bracket';
import { drawPairs } from '@/lib/domain/pairing';
import { computeStandings } from '@/lib/domain/standings';

const CreateTournamentSchema = z.object({
  name: z.string().trim().min(3).max(80),
  pairingMode: z.enum(PAIRING_MODE),
  size: z.number().int().positive().max(64),
  groupCount: z.number().int().min(1).max(8),
  playoffCutoff: z.number().int().refine(
    (v) => (ALLOWED_PLAYOFF_CUTOFFS as readonly number[]).includes(v),
    { message: 'cutoff no permitido' },
  ),
  startsAt: z.string().datetime().nullable(),
}).refine(
  (v) => v.size % v.groupCount === 0,
  { message: 'size debe ser múltiplo de groupCount', path: ['size'] },
);

export type CreateTournamentInput = z.input<typeof CreateTournamentSchema>;

async function withAuth<T>(fn: (session: Awaited<ReturnType<typeof requireSession>>) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const session = await requireSession();
    return await fn(session);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_AUTHORIZED') {
      return fail('NOT_AUTHORIZED', 'Debes iniciar sesión');
    }
    return fail('UNEXPECTED', err instanceof Error ? err.message : 'Error inesperado');
  }
}

function fieldsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[i.path.join('.') || '_'] = i.message;
  return out;
}

export async function createTournamentAction(input: CreateTournamentInput): Promise<ActionResult<Tournament>> {
  return withAuth(async (session) => {
    const parsed = CreateTournamentSchema.safeParse(input);
    if (!parsed.success) {
      return fail('VALIDATION_FAILED', 'Datos inválidos', fieldsFromZod(parsed.error));
    }
    const repo = await getRepo();
    const t = await repo.createTournament({
      ownerId: session.userId,
      name: parsed.data.name,
      pairingMode: parsed.data.pairingMode,
      size: parsed.data.size,
      groupCount: parsed.data.groupCount,
      playoffCutoff: parsed.data.playoffCutoff,
      startsAt: parsed.data.startsAt,
    });
    revalidatePath('/app/tournaments');
    return ok(t);
  });
}

export async function openTournamentAction(tournamentId: string): Promise<ActionResult<Tournament>> {
  return withAuth(async (session) => {
    const repo = await getRepo();
    const t = await repo.getTournament(tournamentId);
    if (!t) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (t.ownerId !== session.userId) return fail('NOT_AUTHORIZED', 'No eres el organizador');
    if (t.status !== 'draft') return fail('CONFLICT', 'El torneo ya no está en borrador');
    const updated = await repo.updateTournamentStatus(tournamentId, 'open');
    revalidatePath(`/app/tournaments/${tournamentId}`);
    return ok(updated);
  });
}

export async function createInvitationAction(tournamentId: string): Promise<ActionResult<{ token: string }>> {
  return withAuth(async (session) => {
    const repo = await getRepo();
    const t = await repo.getTournament(tournamentId);
    if (!t) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (t.ownerId !== session.userId) return fail('NOT_AUTHORIZED', 'Solo el organizador puede invitar');
    const token = randomBytes(INVITATION_TOKEN_BYTES).toString('base64url');
    const expiresAt = addDays(new Date(), INVITATION_TTL_DAYS).toISOString();
    await repo.createInvitation(tournamentId, token, expiresAt, session.userId);
    revalidatePath(`/app/tournaments/${tournamentId}`);
    return ok({ token });
  });
}

export async function startTournamentAction(tournamentId: string, seed = Date.now()): Promise<ActionResult<Tournament>> {
  return withAuth(async (session) => {
    const repo = await getRepo();
    const t = await repo.getTournament(tournamentId);
    if (!t) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (t.ownerId !== session.userId) return fail('NOT_AUTHORIZED', 'No eres el organizador');
    if (t.status !== 'open') return fail('CONFLICT', `Status actual: ${t.status}`);

    const inscriptions = await repo.listInscriptions(tournamentId);
    const withPair = inscriptions.filter((i) => i.pairId);
    const singles = inscriptions.filter((i) => !i.pairId);

    // 1. Build pairs from singles.
    const singlePlayers = await Promise.all(singles.map((i) => repo.getPlayer(i.playerId)));
    const validSinglePlayers = singlePlayers.filter((p): p is NonNullable<typeof p> => !!p);
    const { pairs: drawnPairs } = drawPairs(validSinglePlayers, seed);
    for (const dp of drawnPairs) {
      await repo.upsertPair(dp.playerAId, dp.playerBId);
    }
    const allPairs = await repo.listPairsForTournament(tournamentId);
    if (allPairs.length < 2) return fail('CONFLICT', 'No hay parejas suficientes');

    // 2. Groups + matches.
    const groups = generateGroups(allPairs, t.groupCount, tournamentId);
    await repo.createGroups(groups);
    const rrMatches = groups.flatMap((g) => generateRoundRobinMatches(g.pairIds, tournamentId, g.id));
    await repo.createMatches(rrMatches);

    const updated = await repo.updateTournamentStatus(tournamentId, 'groups');
    revalidatePath(`/app/tournaments/${tournamentId}`);
    return ok(updated);
  });
}

export async function advanceToKnockoutAction(tournamentId: string): Promise<ActionResult<Tournament>> {
  return withAuth(async (session) => {
    const repo = await getRepo();
    const t = await repo.getTournament(tournamentId);
    if (!t) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (t.ownerId !== session.userId) return fail('NOT_AUTHORIZED', 'No eres el organizador');
    if (t.status !== 'groups') return fail('CONFLICT', `Status actual: ${t.status}`);
    if (t.playoffCutoff < 2) {
      const done = await repo.updateTournamentStatus(tournamentId, 'complete');
      revalidatePath(`/app/tournaments/${tournamentId}`);
      return ok(done);
    }

    const [groups, matches, pairs] = await Promise.all([
      repo.listGroups(tournamentId),
      repo.listMatches(tournamentId),
      repo.listPairsForTournament(tournamentId),
    ]);

    const resultsByMatch = await Promise.all(
      matches.filter((m) => m.phase === 'group').map((m) => repo.getResultForMatch(m.id)),
    );
    const allValidated = resultsByMatch.every((r) => r?.status === 'validated');
    if (!allValidated) return fail('CONFLICT', 'Faltan resultados por validar en la fase de grupos');

    const pairById = new Map(pairs.map((p) => [p.id, p] as const));
    const standingsPerGroup = groups.map((g) => {
      const groupPairs = g.pairIds.map((id) => pairById.get(id)).filter((p): p is typeof pairs[number] => !!p);
      const groupMatches = matches.filter((m) => m.groupId === g.id);
      const rowsResults = resultsByMatch.filter((r): r is NonNullable<typeof r> => !!r);
      const rows = computeStandings(groupPairs, groupMatches, rowsResults);
      return rows.map((r) => pairById.get(r.pairId)!).filter(Boolean);
    });

    const knockoutMatches = seedKnockout(standingsPerGroup, t.playoffCutoff, tournamentId);
    await repo.createMatches(knockoutMatches);
    const updated = await repo.updateTournamentStatus(tournamentId, 'knockout');
    revalidatePath(`/app/tournaments/${tournamentId}`);
    return ok(updated);
  });
}
