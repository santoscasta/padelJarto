'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireSession, type Session } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { fail, ok, type ActionResult } from '@/lib/domain/action-result';
import type { Result } from '@/lib/domain/types';
import { validateSets, winnerOfSets } from '@/lib/domain/result';
import { applyRating } from '@/lib/domain/rating';
import { enqueueNotification } from '@/lib/notifications/enqueue';
import { readDispatcherEnv } from '@/lib/notifications/dispatcher-env';
import { matchLabel } from '@/lib/domain/match-label';
import { withRateLimit } from '@/lib/security/with-rate-limit';

const ReportResultSchema = z.object({
  matchId: z.string().uuid().or(z.string().min(1)),
  sets: z.array(z.object({ a: z.number().int().min(0), b: z.number().int().min(0) })).min(2).max(3),
});

async function reportResultCore(
  _userId: string,
  session: Session,
  input: z.input<typeof ReportResultSchema>,
): Promise<ActionResult<Result>> {
  const parsed = ReportResultSchema.safeParse(input);
  if (!parsed.success) {
    return fail('VALIDATION_FAILED', 'Datos inválidos', {
      _: parsed.error.issues.map((i) => i.message).join(', '),
    });
  }
  const setsCheck = validateSets(parsed.data.sets);
  if (!setsCheck.ok) return setsCheck;

  const repo = await getRepo();
  const match = await repo.getMatch(parsed.data.matchId);
  if (!match) return fail('NOT_FOUND', 'Partido no encontrado');

  const pairA = await repo.getPair(match.pairAId);
  const pairB = await repo.getPair(match.pairBId);
  if (!pairA || !pairB) return fail('NOT_FOUND', 'Pareja no encontrada');

  const allowedPlayerIds = new Set([
    pairA.playerAId, pairA.playerBId, pairB.playerAId, pairB.playerBId,
  ]);
  if (!allowedPlayerIds.has(session.player.id)) {
    return fail('NOT_AUTHORIZED', 'Solo los jugadores del partido pueden reportar');
  }

  const existing = await repo.getResultForMatch(match.id);
  if (existing && existing.status !== 'corrected') {
    return fail('CONFLICT', 'Ya se ha reportado un resultado para este partido');
  }

  const winnerSide = winnerOfSets(parsed.data.sets);
  const winnerPairId = winnerSide === 'a' ? match.pairAId : match.pairBId;

  const reported = await repo.reportResult({
    matchId: match.id,
    sets: parsed.data.sets,
    winnerPairId,
    reportedBy: session.userId,
    status: 'reported',
    correctsResultId: null,
  });

  const tournament = await repo.getTournament(match.tournamentId);
  if (tournament) {
    try {
      const dispatchEnv = readDispatcherEnv();
      await enqueueNotification(repo, {
        userId: tournament.ownerId,
        kind: 'result_reported',
        payload: {
          kind: 'result_reported',
          tournamentName: tournament.name,
          matchLabel: matchLabel(match),
          sets: parsed.data.sets.map((s) => [s.a, s.b] as const),
        },
        dispatcherUrl: dispatchEnv.url,
        dispatcherKey: dispatchEnv.key,
      });
    } catch {
      // notifications unavailable
    }
  }
  revalidatePath(`/app/tournaments/${match.tournamentId}/matches/${match.id}`);
  return ok(reported);
}

export async function reportResultAction(input: z.input<typeof ReportResultSchema>): Promise<ActionResult<Result>> {
  try {
    const session = await requireSession();
    return withRateLimit('match.report', reportResultCore)(session.userId, session, input);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_AUTHORIZED') {
      return fail('NOT_AUTHORIZED', 'Debes iniciar sesión');
    }
    return fail('UNEXPECTED', err instanceof Error ? err.message : 'Error inesperado');
  }
}

const ValidateSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
});

async function validateResultCore(
  _userId: string,
  session: Session,
  input: z.input<typeof ValidateSchema>,
): Promise<ActionResult<Result>> {
  const parsed = ValidateSchema.safeParse(input);
  if (!parsed.success) return fail('VALIDATION_FAILED', 'Datos inválidos');

  const repo = await getRepo();
  const tournament = await repo.getTournament(parsed.data.tournamentId);
  if (!tournament) return fail('NOT_FOUND', 'Torneo no encontrado');
  if (tournament.ownerId !== session.userId) {
    return fail('NOT_AUTHORIZED', 'Solo el organizador valida');
  }
  const match = await repo.getMatch(parsed.data.matchId);
  if (!match) return fail('NOT_FOUND', 'Partido no encontrado');
  const reported = await repo.getResultForMatch(match.id);
  if (!reported) return fail('NOT_FOUND', 'No hay resultado reportado');
  if (reported.status === 'validated') return fail('RESULT_ALREADY_VALIDATED', 'Ya validado');

  const [pairA, pairB] = await Promise.all([repo.getPair(match.pairAId), repo.getPair(match.pairBId)]);
  if (!pairA || !pairB) return fail('NOT_FOUND', 'Pareja no encontrada');
  const playerIds = [pairA.playerAId, pairA.playerBId, pairB.playerAId, pairB.playerBId];
  const playersArr = await Promise.all(playerIds.map((id) => repo.getPlayer(id)));
  if (playersArr.some((p) => !p)) return fail('NOT_FOUND', 'Jugador no encontrado');
  const players = Object.fromEntries(playersArr.map((p) => [p!.id, p!]));
  const pairs = { [pairA.id]: pairA, [pairB.id]: pairB };

  const now = new Date().toISOString();
  const { snapshots, newPlayerRatings, newPairRatings } = applyRating({
    match, result: reported, players, pairs, now,
  });

  const validated = await repo.validateResult({
    resultId: reported.id, matchId: match.id, validatorId: session.userId,
    validatedAt: now, snapshots, newPlayerRatings, newPairRatings,
  });

  // Notify 4 players.
  try {
    const dispatchEnv = readDispatcherEnv();
    await Promise.all(
      playersArr.filter((p): p is NonNullable<typeof p> => !!p).map((p) =>
        enqueueNotification(repo, {
          userId: p.profileId,
          kind: 'result_validated',
          payload: {
            kind: 'result_validated',
            tournamentName: tournament.name,
            matchLabel: matchLabel(match),
            sets: validated.sets.map((s) => [s.a, s.b] as const),
          },
          dispatcherUrl: dispatchEnv.url,
          dispatcherKey: dispatchEnv.key,
        }),
      ),
    );
  } catch {
    // notifications unavailable
  }
  revalidatePath(`/app/tournaments/${tournament.id}`);
  return ok(validated);
}

export async function validateResultAction(input: z.input<typeof ValidateSchema>): Promise<ActionResult<Result>> {
  try {
    const session = await requireSession();
    return withRateLimit('match.validate', validateResultCore)(session.userId, session, input);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_AUTHORIZED') {
      return fail('NOT_AUTHORIZED', 'Debes iniciar sesión');
    }
    return fail('UNEXPECTED', err instanceof Error ? err.message : 'Error inesperado');
  }
}

const CorrectSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  sets: z.array(z.object({ a: z.number().int().min(0), b: z.number().int().min(0) })).min(2).max(3),
});

export async function correctResultAction(input: z.input<typeof CorrectSchema>): Promise<ActionResult<Result>> {
  try {
    const session = await requireSession();
    const parsed = CorrectSchema.safeParse(input);
    if (!parsed.success) return fail('VALIDATION_FAILED', 'Datos inválidos');

    const setsCheck = validateSets(parsed.data.sets);
    if (!setsCheck.ok) return setsCheck;

    const repo = await getRepo();
    const tournament = await repo.getTournament(parsed.data.tournamentId);
    if (!tournament) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (tournament.ownerId !== session.userId) {
      return fail('NOT_AUTHORIZED', 'Solo el organizador corrige');
    }
    const match = await repo.getMatch(parsed.data.matchId);
    if (!match) return fail('NOT_FOUND', 'Partido no encontrado');
    const original = await repo.getResultForMatch(match.id);
    if (!original) return fail('NOT_FOUND', 'No hay resultado que corregir');

    const winnerSide = winnerOfSets(parsed.data.sets);
    const winnerPairId = winnerSide === 'a' ? match.pairAId : match.pairBId;
    const replacement = {
      matchId: match.id, sets: parsed.data.sets, winnerPairId,
      reportedBy: session.userId, validatedBy: null, validatedAt: null, correctsResultId: null,
    };
    const fresh = await repo.correctResult(original, replacement);
    revalidatePath(`/app/tournaments/${tournament.id}/matches/${match.id}`);
    return ok(fresh);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_AUTHORIZED') {
      return fail('NOT_AUTHORIZED', 'Debes iniciar sesión');
    }
    return fail('UNEXPECTED', err instanceof Error ? err.message : 'Error inesperado');
  }
}
