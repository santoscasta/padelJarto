/**
 * Distributed result validation engine per PadelFlow spec.
 *
 * Flow:
 * 1. Any match participant proposes a result.
 * 2. At least one rival player validates (accepts or rejects).
 * 3. Accept → match becomes "validated".
 * 4. Reject → match enters "in_dispute", organizer must resolve.
 * 5. Organizer can override with final result at any time during dispute.
 */

import type {
  MatchResultProposal,
  MatchResultValidation,
  MatchStatus,
  MatchWithContext,
} from "@/lib/domain/types";

/** Check whether a user can propose a result for this match. */
export function canProposeResult(match: MatchWithContext, userId: string): boolean {
  const validStatuses: MatchStatus[] = ["scheduled", "pending"];
  if (!validStatuses.includes(match.status)) return false;
  return match.sides.some((side) => side.playerIds.includes(userId));
}

/** Check whether a user can validate (accept/reject) a proposal. */
export function canValidateProposal(
  proposal: MatchResultProposal,
  match: MatchWithContext,
  userId: string,
): boolean {
  if (proposal.status !== "pending") return false;

  // Must not be the proposer
  if (proposal.proposedBy === userId) return false;

  // Must be a participant in the match
  if (!match.sides.some((side) => side.playerIds.includes(userId))) return false;

  // Must be on the rival side (not same side as proposer)
  const proposerSide = match.sides.find((side) =>
    side.playerIds.includes(proposal.proposedBy),
  );
  const validatorSide = match.sides.find((side) =>
    side.playerIds.includes(userId),
  );

  if (!proposerSide || !validatorSide) return false;
  return proposerSide.side !== validatorSide.side;
}

/** Determine the next match status after a validation decision. */
export function determineMatchStatusAfterValidation(
  decision: "accept" | "reject",
): MatchStatus {
  return decision === "accept" ? "validated" : "in_dispute";
}

/** Check whether the organizer can resolve a dispute. */
export function canResolveDispute(
  match: MatchWithContext,
  organizerId: string,
  tournamentOrganizerId: string,
): boolean {
  if (match.status !== "in_dispute") return false;
  return organizerId === tournamentOrganizerId;
}

/** Get pending proposals for a match that need validation. */
export function getPendingProposals(
  match: MatchWithContext,
): MatchResultProposal[] {
  return (match.proposals ?? []).filter((p) => p.status === "pending");
}

/** Check if a user has already validated a specific proposal. */
export function hasUserValidated(
  validations: MatchResultValidation[],
  proposalId: string,
  userId: string,
): boolean {
  return validations.some(
    (v) => v.proposalId === proposalId && v.validatorId === userId,
  );
}
