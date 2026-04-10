import { describe, expect, it } from "vitest";
import {
  canProposeResult,
  canValidateProposal,
  determineMatchStatusAfterValidation,
  canResolveDispute,
} from "@/lib/domain/validation";
import type { MatchWithContext, MatchResultProposal } from "@/lib/domain/types";

function makeMatch(overrides: Partial<MatchWithContext> = {}): MatchWithContext {
  return {
    id: "match-1",
    tournamentId: "tournament-1",
    stageId: "stage-1",
    groupId: "group-1",
    roundLabel: "J1",
    status: "scheduled",
    createdAt: "2026-04-01T10:00:00Z",
    updatedAt: "2026-04-01T10:00:00Z",
    sides: [
      { id: "s1", matchId: "match-1", side: "home", teamId: null, playerIds: ["p1", "p2"] },
      { id: "s2", matchId: "match-1", side: "away", teamId: null, playerIds: ["p3", "p4"] },
    ],
    latestSubmission: null,
    validatedSubmission: null,
    proposals: [],
    validations: [],
    ...overrides,
  };
}

function makeProposal(overrides: Partial<MatchResultProposal> = {}): MatchResultProposal {
  return {
    id: "proposal-1",
    matchId: "match-1",
    proposedBy: "p1",
    scoreJson: [{ home: 6, away: 4 }, { home: 6, away: 3 }],
    winnerSide: "home",
    status: "pending",
    createdAt: "2026-04-01T12:00:00Z",
    ...overrides,
  };
}

describe("canProposeResult", () => {
  it("allows a participant to propose on a scheduled match", () => {
    expect(canProposeResult(makeMatch(), "p1")).toBe(true);
  });

  it("allows a participant on a pending match", () => {
    expect(canProposeResult(makeMatch({ status: "pending" }), "p3")).toBe(true);
  });

  it("rejects non-participants", () => {
    expect(canProposeResult(makeMatch(), "unknown")).toBe(false);
  });

  it("rejects on validated matches", () => {
    expect(canProposeResult(makeMatch({ status: "validated" }), "p1")).toBe(false);
  });

  it("rejects on closed matches", () => {
    expect(canProposeResult(makeMatch({ status: "closed" }), "p1")).toBe(false);
  });
});

describe("canValidateProposal", () => {
  it("allows rival player to validate", () => {
    const match = makeMatch();
    const proposal = makeProposal({ proposedBy: "p1" });
    expect(canValidateProposal(proposal, match, "p3")).toBe(true);
  });

  it("rejects self-validation", () => {
    const match = makeMatch();
    const proposal = makeProposal({ proposedBy: "p1" });
    expect(canValidateProposal(proposal, match, "p1")).toBe(false);
  });

  it("rejects teammate validation (same side)", () => {
    const match = makeMatch();
    const proposal = makeProposal({ proposedBy: "p1" });
    // p2 is on the same side as p1 (home)
    expect(canValidateProposal(proposal, match, "p2")).toBe(false);
  });

  it("rejects non-pending proposals", () => {
    const match = makeMatch();
    const proposal = makeProposal({ status: "accepted" });
    expect(canValidateProposal(proposal, match, "p3")).toBe(false);
  });

  it("rejects non-participants", () => {
    const match = makeMatch();
    const proposal = makeProposal();
    expect(canValidateProposal(proposal, match, "unknown")).toBe(false);
  });
});

describe("determineMatchStatusAfterValidation", () => {
  it("returns validated on accept", () => {
    expect(determineMatchStatusAfterValidation("accept")).toBe("validated");
  });

  it("returns in_dispute on reject", () => {
    expect(determineMatchStatusAfterValidation("reject")).toBe("in_dispute");
  });
});

describe("canResolveDispute", () => {
  it("allows organizer to resolve a disputed match", () => {
    const match = makeMatch({ status: "in_dispute" });
    expect(canResolveDispute(match, "org-1", "org-1")).toBe(true);
  });

  it("rejects non-organizer", () => {
    const match = makeMatch({ status: "in_dispute" });
    expect(canResolveDispute(match, "p1", "org-1")).toBe(false);
  });

  it("rejects non-disputed matches", () => {
    const match = makeMatch({ status: "validated" });
    expect(canResolveDispute(match, "org-1", "org-1")).toBe(false);
  });
});
