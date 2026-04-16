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
import { enqueueNotification } from '@/lib/notifications/enqueue';
import { readDispatcherEnv } from '@/lib/notifications/dispatcher-env';

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

const ChangePairingModeSchema = z.object({
  tournamentId: z.string().uuid(),
  pairingMode: z.enum(PAIRING_MODE),
});

export async function changePairingModeAction(
  input: z.input<typeof ChangePairingModeSchema>,
): Promise<ActionResult<Tournament>> {
  return withAuth(async (session) => {
    const parsed = ChangePairingModeSchema.safeParse(input);
    if (!parsed.success) {
      return fail('VALIDATION_FAILED', 'Datos inválidos', fieldsFromZod(parsed.error));
    }
    const repo = await getRepo();
    const t = await repo.getTournament(parsed.data.tournamentId);
    if (!t) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (t.ownerId !== session.userId) return fail('NOT_AUTHORIZED', 'No eres el organizador');
    if (t.status !== 'draft' && t.status !== 'open') {
      return fail('CONFLICT', 'El torneo ya está en curso');
    }
    // Changing pairing mode after people have inscribed would invalidate the
    // pairs they chose at inscription time, so only allow it while empty.
    const existing = await repo.listInscriptions(t.id);
    if (existing.length > 0) {
      return fail('CONFLICT', 'Ya hay inscritos, no se puede cambiar el modo');
    }
    if (t.pairingMode === parsed.data.pairingMode) return ok(t);
    const updated = await repo.updateTournamentPairingMode(t.id, parsed.data.pairingMode);
    revalidatePath(`/app/tournaments/${t.id}`);
    return ok(updated);
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
    try {
      const dispatchEnv = readDispatcherEnv();
      const allPlayers = await repo.listPlayers();
      const origin = process.env.APP_ORIGIN ?? 'https://padeljarto.app';
      await Promise.all(
        allPlayers.map((p) =>
          enqueueNotification(repo, {
            userId: p.profileId,
            kind: 'tournament_open',
            payload: {
              kind: 'tournament_open',
              tournamentName: updated.name,
              inviteUrl: `${origin}/app/tournaments/${updated.id}`,
            },
            dispatcherUrl: dispatchEnv.url,
            dispatcherKey: dispatchEnv.key,
          }),
        ),
      );
    } catch {
      // Email dispatch unavailable — continue without notifications.
    }
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
    const singles = inscriptions.filter((i) => !i.pairId);

    if (t.pairingMode === 'owner_picks') {
      if (singles.length > 0) {
        return fail('CONFLICT', 'Hay inscritos sin pareja asignada; asígnales pareja antes de empezar');
      }
    } else {
      // 1. Build pairs from singles for draw/mixed/pre_inscribed modes.
      const singlePlayers = await Promise.all(singles.map((i) => repo.getPlayer(i.playerId)));
      const validSinglePlayers = singlePlayers.filter((p): p is NonNullable<typeof p> => !!p);
      const { pairs: drawnPairs } = drawPairs(validSinglePlayers, seed);
      for (const dp of drawnPairs) {
        const pair = await repo.upsertPair(dp.playerAId, dp.playerBId);
        await repo.setInscriptionPair(tournamentId, dp.playerAId, pair.id);
        await repo.setInscriptionPair(tournamentId, dp.playerBId, pair.id);
      }
    }
    const allPairs = await repo.listPairsForTournament(tournamentId);
    if (allPairs.length < 2) return fail('CONFLICT', 'No hay parejas suficientes');

    // 2. Groups + matches.
    // generateGroups produces synthetic group IDs for the in-memory domain.
    // The persistence layer may assign real IDs (Postgres uuids), so feed the
    // persisted groups back into the match generator instead of the draft.
    const draftGroups = generateGroups(allPairs, t.groupCount, tournamentId);
    const persistedGroups = await repo.createGroups(draftGroups);
    const rrMatches = persistedGroups.flatMap((g) =>
      generateRoundRobinMatches(g.pairIds, tournamentId, g.id),
    );
    await repo.createMatches(rrMatches);

    const updated = await repo.updateTournamentStatus(tournamentId, 'groups');
    try {
      const dispatchEnv = readDispatcherEnv();
      const startedInscriptions = await repo.listInscriptions(tournamentId);
      const allPlayers = await repo.listPlayers();
      const playerById = new Map(allPlayers.map((p) => [p.id, p] as const));
      const origin = process.env.APP_ORIGIN ?? 'https://padeljarto.app';
      await Promise.all(
        startedInscriptions.map(async (ins) => {
          const player = playerById.get(ins.playerId);
          if (!player) return;
          await enqueueNotification(repo, {
            userId: player.profileId,
            kind: 'tournament_started',
            payload: {
              kind: 'tournament_started',
              tournamentName: updated.name,
              tournamentUrl: `${origin}/app/tournaments/${updated.id}`,
            },
            dispatcherUrl: dispatchEnv.url,
            dispatcherKey: dispatchEnv.key,
          });
        }),
      );
    } catch {
      // Email dispatch unavailable — continue without notifications.
    }
    revalidatePath(`/app/tournaments/${tournamentId}`);
    return ok(updated);
  });
}

const AssignPairSchema = z.object({
  tournamentId: z.string().uuid(),
  playerAId: z.string().uuid(),
  playerBId: z.string().uuid(),
});

export async function assignPairAction(
  input: z.input<typeof AssignPairSchema>,
): Promise<ActionResult<{ pairId: string }>> {
  return withAuth(async (session) => {
    const parsed = AssignPairSchema.safeParse(input);
    if (!parsed.success) {
      return fail('VALIDATION_FAILED', 'Datos inválidos', fieldsFromZod(parsed.error));
    }
    const { tournamentId, playerAId, playerBId } = parsed.data;
    if (playerAId === playerBId) {
      return fail('VALIDATION_FAILED', 'No puedes emparejar un jugador consigo mismo');
    }
    const repo = await getRepo();
    const t = await repo.getTournament(tournamentId);
    if (!t) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (t.ownerId !== session.userId) return fail('NOT_AUTHORIZED', 'No eres el organizador');
    if (t.status !== 'open') return fail('CONFLICT', `Status actual: ${t.status}`);
    if (t.pairingMode !== 'owner_picks') {
      return fail('CONFLICT', 'Este torneo no usa asignación manual de parejas');
    }
    const inscriptions = await repo.listInscriptions(tournamentId);
    const insA = inscriptions.find((i) => i.playerId === playerAId);
    const insB = inscriptions.find((i) => i.playerId === playerBId);
    if (!insA || !insB) return fail('NOT_FOUND', 'Ambos jugadores deben estar inscritos');
    if (insA.pairId || insB.pairId) {
      return fail('CONFLICT', 'Alguno de los jugadores ya tiene pareja asignada');
    }
    const pair = await repo.upsertPair(playerAId, playerBId);
    await repo.setInscriptionPair(tournamentId, playerAId, pair.id);
    await repo.setInscriptionPair(tournamentId, playerBId, pair.id);
    revalidatePath(`/app/tournaments/${tournamentId}`);
    return ok({ pairId: pair.id });
  });
}

const UnpairSchema = z.object({
  tournamentId: z.string().uuid(),
  pairId: z.string().uuid(),
});

export async function unpairAction(
  input: z.input<typeof UnpairSchema>,
): Promise<ActionResult<null>> {
  return withAuth(async (session) => {
    const parsed = UnpairSchema.safeParse(input);
    if (!parsed.success) {
      return fail('VALIDATION_FAILED', 'Datos inválidos', fieldsFromZod(parsed.error));
    }
    const { tournamentId, pairId } = parsed.data;
    const repo = await getRepo();
    const t = await repo.getTournament(tournamentId);
    if (!t) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (t.ownerId !== session.userId) return fail('NOT_AUTHORIZED', 'No eres el organizador');
    if (t.status !== 'open') return fail('CONFLICT', `Status actual: ${t.status}`);
    if (t.pairingMode !== 'owner_picks') {
      return fail('CONFLICT', 'Este torneo no usa asignación manual de parejas');
    }
    const inscriptions = await repo.listInscriptions(tournamentId);
    const affected = inscriptions.filter((i) => i.pairId === pairId);
    if (affected.length === 0) return fail('NOT_FOUND', 'Pareja no encontrada');
    for (const ins of affected) {
      await repo.setInscriptionPair(tournamentId, ins.playerId, null);
    }
    revalidatePath(`/app/tournaments/${tournamentId}`);
    return ok(null);
  });
}

const UpdatePairDisplayNameSchema = z.object({
  pairId: z.string().uuid(),
  // null or empty string clears the name; otherwise 1–40 chars after trim.
  displayName: z
    .union([z.string().trim().min(1).max(40), z.literal(''), z.null()])
    .transform((v) => (v === '' || v === null ? null : v)),
});

export async function updatePairDisplayNameAction(
  input: z.input<typeof UpdatePairDisplayNameSchema>,
): Promise<ActionResult<{ displayName: string | null }>> {
  return withAuth(async (session) => {
    const parsed = UpdatePairDisplayNameSchema.safeParse(input);
    if (!parsed.success) {
      return fail(
        'VALIDATION_FAILED',
        'Nombre inválido (1 a 40 caracteres)',
        fieldsFromZod(parsed.error),
      );
    }
    const { pairId, displayName } = parsed.data;
    const repo = await getRepo();
    const pair = await repo.getPair(pairId);
    if (!pair) return fail('NOT_FOUND', 'Pareja no encontrada');
    // Only the two pair members can rename the pair (RLS also enforces it,
    // but failing early here produces a clearer error for the UI).
    if (
      pair.playerAId !== session.player.id
      && pair.playerBId !== session.player.id
    ) {
      return fail(
        'NOT_AUTHORIZED',
        'Solo los miembros de la pareja pueden renombrarla',
      );
    }
    const updated = await repo.updatePairDisplayName(pairId, displayName);
    // Refresh any page that might surface the pair name.
    revalidatePath('/app');
    revalidatePath('/app/tournaments');
    revalidatePath('/app/leaderboard');
    return ok({ displayName: updated.displayName });
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
