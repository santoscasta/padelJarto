/**
 * Notification creation helpers per PadelFlow spec.
 * These create Notification objects to be persisted via the repository.
 */

import type { Notification } from "@/lib/domain/types";

function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Notification {
  return {
    id: crypto.randomUUID(),
    userId,
    type,
    title,
    body,
    data: data ?? null,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

/** Notify rival players that a result has been proposed for validation. */
export function createMatchResultNotification(
  rivalPlayerIds: string[],
  matchId: string,
  tournamentId: string,
  proposerName: string,
): Notification[] {
  return rivalPlayerIds.map((playerId) =>
    createNotification(
      playerId,
      "match_result_proposed",
      "Resultado pendiente de validación",
      `${proposerName} ha propuesto un resultado. Revisa y valida.`,
      { matchId, tournamentId },
    ),
  );
}

/** Notify the organizer that a match is in dispute. */
export function createDisputeNotification(
  organizerId: string,
  matchId: string,
  tournamentId: string,
  rejectorName: string,
): Notification {
  return createNotification(
    organizerId,
    "match_dispute",
    "Partido en disputa",
    `${rejectorName} ha rechazado el resultado propuesto. Necesita resolución.`,
    { matchId, tournamentId },
  );
}

/** Notify a user that they have received a tournament invitation. */
export function createInvitationNotification(
  userId: string,
  tournamentId: string,
  tournamentName: string,
): Notification {
  return createNotification(
    userId,
    "invitation_received",
    "Nueva invitación a torneo",
    `Has sido invitado al torneo "${tournamentName}".`,
    { tournamentId },
  );
}

/** Notify tournament members about a status change. */
export function createTournamentStatusNotification(
  memberIds: string[],
  tournamentId: string,
  tournamentName: string,
  newStatus: string,
): Notification[] {
  const statusMessages: Record<string, string> = {
    published: "ha sido publicado y las inscripciones están abiertas",
    in_progress: "ha comenzado",
    completed: "ha finalizado",
    cancelled: "ha sido cancelado",
  };
  const message = statusMessages[newStatus] ?? `ha cambiado a estado ${newStatus}`;

  return memberIds.map((memberId) =>
    createNotification(
      memberId,
      "tournament_status",
      `Torneo actualizado`,
      `El torneo "${tournamentName}" ${message}.`,
      { tournamentId, newStatus },
    ),
  );
}

/** Notify proposer that their result has been validated. */
export function createResultValidatedNotification(
  proposerId: string,
  matchId: string,
  tournamentId: string,
): Notification {
  return createNotification(
    proposerId,
    "result_validated",
    "Resultado confirmado",
    "Tu resultado propuesto ha sido aceptado por el rival.",
    { matchId, tournamentId },
  );
}

/** Notify participants that a dispute has been resolved by the organizer. */
export function createDisputeResolvedNotification(
  participantIds: string[],
  matchId: string,
  tournamentId: string,
): Notification[] {
  return participantIds.map((playerId) =>
    createNotification(
      playerId,
      "dispute_resolved",
      "Disputa resuelta",
      "El organizador ha resuelto la disputa y fijado el resultado definitivo.",
      { matchId, tournamentId },
    ),
  );
}
