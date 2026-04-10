/**
 * Audit log helpers per PadelFlow spec.
 * Creates AuditLogEntry objects for sensitive actions.
 */

import type { AuditLogEntry } from "@/lib/domain/types";

export function createAuditEntry(
  actorId: string,
  entityType: string,
  entityId: string,
  action: string,
  payload?: Record<string, unknown>,
): AuditLogEntry {
  return {
    id: crypto.randomUUID(),
    actorId,
    entityType,
    entityId,
    action,
    payload: payload ?? null,
    createdAt: new Date().toISOString(),
  };
}

/** Audit entry for dispute resolution by organizer. */
export function auditDisputeResolution(
  organizerId: string,
  matchId: string,
  reason: string,
  winnerSide: string,
): AuditLogEntry {
  return createAuditEntry(organizerId, "match", matchId, "resolve_dispute", {
    reason,
    winnerSide,
  });
}

/** Audit entry for manual result override. */
export function auditResultOverride(
  organizerId: string,
  matchId: string,
  reason: string,
): AuditLogEntry {
  return createAuditEntry(organizerId, "match_result", matchId, "override_result", {
    reason,
  });
}

/** Audit entry for player expulsion. */
export function auditPlayerExpulsion(
  organizerId: string,
  tournamentId: string,
  playerId: string,
  reason: string,
): AuditLogEntry {
  return createAuditEntry(organizerId, "tournament", tournamentId, "expel_player", {
    playerId,
    reason,
  });
}

/** Audit entry for tournament cancellation. */
export function auditTournamentCancellation(
  organizerId: string,
  tournamentId: string,
  reason?: string,
): AuditLogEntry {
  return createAuditEntry(organizerId, "tournament", tournamentId, "cancel_tournament", {
    reason: reason ?? "Cancelled by organizer",
  });
}
