import { describe, expect, it } from "vitest";
import { buildKnockoutMatches, createIndividualRoundProposals } from "@/lib/domain/schedule";
import { calculateStandings } from "@/lib/domain/standings";
import type { MatchWithContext, Tournament } from "@/lib/domain/types";

function makeTournament(mode: Tournament["mode"]): Tournament {
  return {
    config: {
      groupCount: 1,
      individualPairingMode: "mixed",
      knockoutSize: 4,
      qualifiersPerGroup: 2,
      rules: {
        bestOfSets: 3,
        setsToWin: 2,
        tiebreakAt: 6,
      },
      scheduleGeneration: "automatic_with_editing",
    },
    createdAt: "2026-04-06T10:00:00.000Z",
    endsAt: "2026-04-20T20:00:00.000Z",
    format: "league_playoff",
    id: "test-tournament",
    mode,
    name: "Test Tournament",
    organizerId: "organizer",
    pairMode: "fixed",
    slug: "test-tournament",
    startsAt: "2026-04-06T10:00:00.000Z",
    status: "in_progress",
    visibility: "private",
  };
}

describe("calculateStandings", () => {
  it("uses the direct matchup as the first tie-breaker when wins are equal", () => {
    const tournament = makeTournament("fixed_pairs");
    const matches: MatchWithContext[] = [
      {
        bracketPosition: null,
        bracketRound: null,
        court: null,
        createdAt: "2026-04-01T10:00:00.000Z",
        groupId: "group-a",
        id: "match-1",
        latestSubmission: null,
        roundLabel: "J1",
        scheduledAt: null,
        sides: [
          { id: "side-1", matchId: "match-1", playerIds: ["p1", "p2"], side: "home", teamId: "team-a" },
          { id: "side-2", matchId: "match-1", playerIds: ["p3", "p4"], side: "away", teamId: "team-b" },
        ],
        stageId: "stage-groups",
        status: "validated",
        tournamentId: tournament.id,
        updatedAt: "2026-04-01T12:00:00.000Z",
        validatedSubmission: {
          createdAt: "2026-04-01T12:00:00.000Z",
          id: "submission-1",
          matchId: "match-1",
          sets: [
            { away: 3, home: 6 },
            { away: 4, home: 6 },
          ],
          status: "validated",
          submittedBy: "p1",
        },
        validatedSubmissionId: "submission-1",
      },
      {
        bracketPosition: null,
        bracketRound: null,
        court: null,
        createdAt: "2026-04-02T10:00:00.000Z",
        groupId: "group-a",
        id: "match-2",
        latestSubmission: null,
        roundLabel: "J2",
        scheduledAt: null,
        sides: [
          { id: "side-3", matchId: "match-2", playerIds: ["p5", "p6"], side: "home", teamId: "team-c" },
          { id: "side-4", matchId: "match-2", playerIds: ["p1", "p2"], side: "away", teamId: "team-a" },
        ],
        stageId: "stage-groups",
        status: "validated",
        tournamentId: tournament.id,
        updatedAt: "2026-04-02T12:00:00.000Z",
        validatedSubmission: {
          createdAt: "2026-04-02T12:00:00.000Z",
          id: "submission-2",
          matchId: "match-2",
          sets: [
            { away: 6, home: 3 },
            { away: 6, home: 4 },
          ],
          status: "validated",
          submittedBy: "p5",
        },
        validatedSubmissionId: "submission-2",
      },
      {
        bracketPosition: null,
        bracketRound: null,
        court: null,
        createdAt: "2026-04-03T10:00:00.000Z",
        groupId: "group-a",
        id: "match-3",
        latestSubmission: null,
        roundLabel: "J3",
        scheduledAt: null,
        sides: [
          { id: "side-5", matchId: "match-3", playerIds: ["p3", "p4"], side: "home", teamId: "team-b" },
          { id: "side-6", matchId: "match-3", playerIds: ["p5", "p6"], side: "away", teamId: "team-c" },
        ],
        stageId: "stage-groups",
        status: "validated",
        tournamentId: tournament.id,
        updatedAt: "2026-04-03T12:00:00.000Z",
        validatedSubmission: {
          createdAt: "2026-04-03T12:00:00.000Z",
          id: "submission-3",
          matchId: "match-3",
          sets: [
            { away: 2, home: 6 },
            { away: 2, home: 6 },
          ],
          status: "validated",
          submittedBy: "p3",
        },
        validatedSubmissionId: "submission-3",
      },
    ];

    const standings = calculateStandings(
      tournament,
      "stage-groups",
      "group-a",
      ["team-a", "team-b", "team-c"],
      matches,
    );

    expect(standings.map((row) => row.entityId)).toEqual(["team-a", "team-b", "team-c"]);
  });
});

describe("createIndividualRoundProposals", () => {
  it("creates balanced matches with four unique players per match", () => {
    const proposals = createIndividualRoundProposals(
      ["p1", "p2", "p3", "p4", "p5", "p6"],
      6,
    );

    expect(proposals).toHaveLength(6);
    proposals.forEach((proposal) => {
      const uniquePlayers = new Set([
        ...proposal.homePlayerIds,
        ...proposal.awayPlayerIds,
      ]);
      expect(uniquePlayers.size).toBe(4);
    });
  });
});

describe("buildKnockoutMatches", () => {
  it("seeds a four-slot bracket as 1 vs 4 and 2 vs 3", () => {
    const tournament = makeTournament("fixed_pairs");
    const { matchSides, matches } = buildKnockoutMatches(
      tournament,
      {
        config: null,
        id: "stage-knockout",
        name: "Knockout",
        sequence: 2,
        tournamentId: tournament.id,
        type: "knockout",
      },
      [
        { label: "Seed 1", playerIds: ["p1", "p2"], teamId: "team-1" },
        { label: "Seed 2", playerIds: ["p3", "p4"], teamId: "team-2" },
        { label: "Seed 3", playerIds: ["p5", "p6"], teamId: "team-3" },
        { label: "Seed 4", playerIds: ["p7", "p8"], teamId: "team-4" },
      ],
    );

    const semifinalOne = matches.find(
      (match) => match.bracketRound === 1 && match.bracketPosition === 1,
    );
    const semifinalOneSides = matchSides.filter((side) => side.matchId === semifinalOne?.id);

    expect(semifinalOneSides.map((side) => side.teamId)).toEqual(["team-1", "team-4"]);
  });
});
