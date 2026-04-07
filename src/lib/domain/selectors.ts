import {
  type MatchWithContext,
  type Profile,
  type StandingRow,
  type Team,
  type TeamMember,
  type TournamentDetail,
} from "@/lib/domain/types";

export function buildProfileMap(profiles: Profile[]) {
  return new Map(profiles.map((profile) => [profile.id, profile]));
}

export function buildTeamMap(teams: Team[]) {
  return new Map(teams.map((team) => [team.id, team]));
}

export function getTeamRoster(teamId: string, teamMembers: TeamMember[]) {
  return teamMembers
    .filter((teamMember) => teamMember.teamId === teamId)
    .map((teamMember) => teamMember.userId);
}

export function labelForSide(
  detail: TournamentDetail,
  side: MatchWithContext["sides"][number],
) {
  const profileMap = buildProfileMap(detail.members);
  const teamMap = buildTeamMap(detail.teams);

  if (detail.tournament.mode === "fixed_pairs" && side.teamId) {
    const team = teamMap.get(side.teamId);
    const roster = getTeamRoster(side.teamId, detail.teamMembers).map(
      (playerId) => profileMap.get(playerId)?.fullName ?? "Jugador",
    );

    return {
      subtitle: roster.join(" / "),
      title: team?.name ?? "Pareja",
    };
  }

  return {
    subtitle: "Pareja variable",
    title: side.playerIds
      .map((playerId) => profileMap.get(playerId)?.fullName ?? "Jugador")
      .join(" / "),
  };
}

export function userCanReportMatch(match: MatchWithContext, userId: string, isOrganizer: boolean) {
  return (
    isOrganizer ||
    match.sides.some((side) => side.playerIds.includes(userId))
  );
}

export function qualifiedRows(detail: TournamentDetail) {
  return detail.groups.flatMap((groupView) =>
    groupView.standings
      .filter((row) => row.rank <= detail.tournament.config.qualifiersPerGroup)
      .sort((left, right) => left.rank - right.rank),
  );
}

export function qualifiedPlayers(detail: TournamentDetail) {
  const profileMap = buildProfileMap(detail.members);
  const rows = qualifiedRows(detail);
  const deduped = new Map<string, StandingRow>();

  rows.forEach((row) => {
    if (row.entityType === "player") {
      deduped.set(row.entityId, row);
    }
  });

  return [...deduped.values()].map((row) => ({
    name: profileMap.get(row.entityId)?.fullName ?? "Jugador",
    playerId: row.entityId,
    row,
  }));
}
