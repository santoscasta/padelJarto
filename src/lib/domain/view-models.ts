import {
  type DashboardSnapshot,
  type DashboardTournamentSummary,
  type GroupView,
  type KnockoutRoundView,
  type Match,
  type MatchSide,
  type MatchWithContext,
  type Profile,
  type ScoreSubmission,
  type TournamentBundle,
  type TournamentDetail,
} from "@/lib/domain/types";
import { calculateStandings } from "@/lib/domain/standings";

function sortMatches(matches: Match[]) {
  return [...matches].sort((left, right) => {
    if ((left.bracketRound ?? 0) !== (right.bracketRound ?? 0)) {
      return (left.bracketRound ?? 0) - (right.bracketRound ?? 0);
    }

    if ((left.groupId ?? "").localeCompare(right.groupId ?? "") !== 0) {
      return (left.groupId ?? "").localeCompare(right.groupId ?? "");
    }

    if ((left.scheduledAt ?? "").localeCompare(right.scheduledAt ?? "") !== 0) {
      return (left.scheduledAt ?? "").localeCompare(right.scheduledAt ?? "");
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function sortSides(left: MatchSide, right: MatchSide) {
  if (left.side === right.side) {
    return 0;
  }

  return left.side === "home" ? -1 : 1;
}

function buildMatchContext(
  matches: Match[],
  sides: MatchSide[],
  submissions: ScoreSubmission[],
) {
  const sidesByMatch = new Map<string, MatchSide[]>();
  const submissionsByMatch = new Map<string, ScoreSubmission[]>();

  for (const side of sides) {
    const bucket = sidesByMatch.get(side.matchId) ?? [];
    bucket.push(side);
    sidesByMatch.set(side.matchId, bucket);
  }

  for (const submission of submissions) {
    const bucket = submissionsByMatch.get(submission.matchId) ?? [];
    bucket.push(submission);
    submissionsByMatch.set(submission.matchId, bucket);
  }

  return sortMatches(matches).flatMap((match) => {
    const matchSides = (sidesByMatch.get(match.id) ?? []).sort((left, right) =>
      sortSides(left, right),
    );

    if (matchSides.length !== 2) {
      return [];
    }

    const matchSubmissions = (submissionsByMatch.get(match.id) ?? []).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
    const validatedSubmission =
      matchSubmissions.find((submission) => submission.status === "validated") ?? null;

    return [
      {
        ...match,
        latestSubmission: matchSubmissions[0] ?? null,
        sides: [matchSides[0], matchSides[1]] as [MatchSide, MatchSide],
        validatedSubmission,
      },
    ] satisfies MatchWithContext[];
  });
}

function entityIdsForGroup(matches: MatchWithContext[], mode: TournamentBundle["tournament"]["mode"]) {
  const entityIds = new Set<string>();

  for (const match of matches) {
    for (const side of match.sides) {
      if (mode === "fixed_pairs" && side.teamId) {
        entityIds.add(side.teamId);
      }

      if (mode === "individual_ranking") {
        for (const playerId of side.playerIds) {
          entityIds.add(playerId);
        }
      }
    }
  }

  return [...entityIds];
}

export function buildTournamentDetail(bundle: TournamentBundle, userId: string): TournamentDetail | null {
  const membership = bundle.memberships.find(
    (membershipRecord) => membershipRecord.userId === userId && membershipRecord.status === "accepted",
  );

  if (!membership) {
    return null;
  }

  const matchViews = buildMatchContext(bundle.matches, bundle.matchSides, bundle.scoreSubmissions);
  const groups: GroupView[] = bundle.groups.map((group) => {
    const matches = matchViews.filter((match) => match.groupId === group.id);
    const standings =
      bundle.standings?.filter((row) => row.groupId === group.id) ??
      calculateStandings(
        bundle.tournament,
        group.stageId,
        group.id,
        entityIdsForGroup(matches, bundle.tournament.mode),
        matches,
      );

    return {
      group,
      matches,
      standings,
    };
  });

  const knockoutRoundsMap = new Map<number, MatchWithContext[]>();
  for (const match of matchViews.filter((entry) => entry.bracketRound)) {
    const bucket = knockoutRoundsMap.get(match.bracketRound!) ?? [];
    bucket.push(match);
    knockoutRoundsMap.set(match.bracketRound!, bucket);
  }

  const knockoutRounds: KnockoutRoundView[] = [...knockoutRoundsMap.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([round, matches]) => ({
      label:
        matches[0]?.roundLabel ??
        (round === Math.max(...knockoutRoundsMap.keys()) ? "Final" : `Ronda ${round}`),
      matches: matches.sort((left, right) => (left.bracketPosition ?? 0) - (right.bracketPosition ?? 0)),
      round,
    }));

  const pendingSubmissions = bundle.scoreSubmissions
    .filter((submission) => submission.status === "pending_review")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const standings = bundle.standings ?? groups.flatMap((group) => group.standings);

  return {
    groups,
    invitations: bundle.invitations,
    knockoutRounds,
    matches: matchViews,
    members: bundle.profiles.filter((profile) =>
      bundle.memberships.some((membershipRecord) => membershipRecord.userId === profile.id),
    ),
    membership,
    pendingSubmissions,
    stages: bundle.stages,
    standings,
    teamMembers: bundle.teamMembers,
    teams: bundle.teams,
    tournament: bundle.tournament,
  };
}

function isUserParticipant(match: MatchWithContext, userId: string) {
  return match.sides.some((side) => side.playerIds.includes(userId));
}

export function buildDashboardSnapshot(
  bundles: TournamentBundle[],
  profiles: Profile[],
  userId: string,
): DashboardSnapshot {
  const currentUser = profiles.find((profile) => profile.id === userId);
  if (!currentUser) {
    throw new Error("Current user profile not found");
  }

  const tournamentSummaries: DashboardTournamentSummary[] = bundles
    .map((bundle) => {
      const detail = buildTournamentDetail(bundle, userId);
      if (!detail) {
        return null;
      }

      return {
        membership: detail.membership,
        pendingPlayerMatches: detail.matches.filter(
          (match) =>
            isUserParticipant(match, userId) &&
            match.status !== "validated" &&
            match.status !== "pending_review",
        ).length,
        pendingReviewCount:
          detail.membership.role === "organizer" ? detail.pendingSubmissions.length : 0,
        tournament: detail.tournament,
      } satisfies DashboardTournamentSummary;
    })
    .filter((summary): summary is DashboardTournamentSummary => Boolean(summary))
    .sort((left, right) => left.tournament.startsAt.localeCompare(right.tournament.startsAt));

  const invitations = bundles.flatMap((bundle) =>
    bundle.invitations.filter(
      (invitation) =>
        invitation.status === "pending" &&
        (!invitation.invitedEmail ||
          invitation.invitedEmail.toLowerCase() === currentUser.email.toLowerCase()),
    ),
  );

  return {
    currentUser,
    invitations,
    tournaments: tournamentSummaries,
  };
}
