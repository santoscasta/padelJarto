'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { fail, ok, type ActionResult } from '@/lib/domain/action-result';
import type { Inscription } from '@/lib/domain/types';
import { enqueueNotification } from '@/lib/notifications/enqueue';
import { readDispatcherEnv } from '@/lib/notifications/dispatcher-env';

const InscribeSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('solo'), token: z.string().min(8) }),
  z.object({ mode: z.literal('with_partner'), token: z.string().min(8), partnerPlayerId: z.string().uuid() }),
]);

export type InscribeInput = z.input<typeof InscribeSchema>;

export async function inscribeFromInviteAction(input: InscribeInput): Promise<ActionResult<Inscription>> {
  try {
    const session = await requireSession();
    const parsed = InscribeSchema.safeParse(input);
    if (!parsed.success) {
      return fail('VALIDATION_FAILED', 'Datos inválidos', {
        _: parsed.error.issues.map((i) => i.message).join(', '),
      });
    }
    const repo = await getRepo();
    const inv = await repo.getInvitationByToken(parsed.data.token);
    if (!inv) return fail('NOT_FOUND', 'Invitación inválida');
    if (new Date(inv.expiresAt).getTime() < Date.now()) return fail('INVITATION_EXPIRED', 'Invitación caducada');

    const t = await repo.getTournament(inv.tournamentId);
    if (!t) return fail('NOT_FOUND', 'Torneo no encontrado');
    if (t.status !== 'open') return fail('CONFLICT', 'Las inscripciones están cerradas');

    const existing = await repo.listInscriptions(t.id);
    if (existing.length >= t.size) return fail('TOURNAMENT_FULL', 'El torneo está completo');
    if (existing.some((i) => i.playerId === session.player.id)) {
      return fail('CONFLICT', 'Ya estás inscrito');
    }

    let pairId: string | null = null;
    if (parsed.data.mode === 'with_partner') {
      if (t.pairingMode === 'draw') return fail('CONFLICT', 'Este torneo sortea parejas');
      const partner = await repo.getPlayer(parsed.data.partnerPlayerId);
      if (!partner) return fail('NOT_FOUND', 'Compañero no encontrado');
      if (partner.id === session.player.id) return fail('VALIDATION_FAILED', 'No puedes emparejarte contigo');
      const pair = await repo.upsertPair(session.player.id, partner.id);
      pairId = pair.id;
    } else {
      if (t.pairingMode === 'pre_inscribed') return fail('CONFLICT', 'Debes inscribirte con pareja');
    }

    const ins = await repo.createInscription({
      tournamentId: t.id, playerId: session.player.id, pairId,
    });
    try {
      const dispatchEnv = readDispatcherEnv();
      await enqueueNotification(repo, {
        userId: t.ownerId,
        kind: 'inscription_new',
        payload: {
          kind: 'inscription_new',
          tournamentName: t.name,
          actorName: session.displayName,
        },
        dispatcherUrl: dispatchEnv.url,
        dispatcherKey: dispatchEnv.key,
      });
    } catch {
      // notifications unavailable
    }
    revalidatePath(`/app/tournaments/${t.id}`);
    return ok(ins);
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_AUTHORIZED') {
      return fail('NOT_AUTHORIZED', 'Debes iniciar sesión');
    }
    return fail('UNEXPECTED', err instanceof Error ? err.message : 'Error inesperado');
  }
}
