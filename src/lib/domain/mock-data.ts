import {
  buildKnockoutMatches,
  createIndividualRoundProposals,
  createRoundRobinPairs,
  snakeSeedIntoGroups,
} from "@/lib/domain/schedule";
import {
  type Group,
  type Invitation,
  type Match,
  type MatchSide,
  type Profile,
  type ScoreSubmission,
  type Stage,
  type StandingRow,
  type Team,
  type TeamMember,
  type Tournament,
  type TournamentMembership,
} from "@/lib/domain/types";
import { buildTournamentDetail } from "@/lib/domain/view-models";
import { slugify } from "@/lib/utils";

export const DEMO_ORGANIZER_ID = "profile-organizer";
export const DEMO_PLAYER_ID = "profile-player-1";

function iso(dayOffset: number, hour = 19) {
  const base = new Date("2026-04-06T12:00:00.000Z");
  base.setUTCDate(base.getUTCDate() + dayOffset);
  base.setUTCHours(hour, 0, 0, 0);
  return base.toISOString();
}

function makeTournament(
  id: string,
  name: string,
  mode: Tournament["mode"],
  startsAt: string,
  endsAt: string,
  config: Tournament["config"],
): Tournament {
  return {
    config,
    createdAt: iso(-3, 10),
    endsAt,
    id,
    location: "Club Padel La Elipa",
    mode,
    name,
    organizerId: DEMO_ORGANIZER_ID,
    slug: slugify(name),
    startsAt,
    status: "live",
    visibility: "private",
  };
}

function buildBaseProfiles(): Profile[] {
  return [
    {
      email: "alex@padeljarto.demo",
      fullName: "Alex Organizer",
      id: DEMO_ORGANIZER_ID,
    },
    {
      email: "nora@padeljarto.demo",
      fullName: "Nora Bandeja",
      id: DEMO_PLAYER_ID,
    },
    {
      email: "raul@padeljarto.demo",
      fullName: "Raul Vibora",
      id: "profile-player-2",
    },
    {
      email: "lucia@padeljarto.demo",
      fullName: "Lucia Chiquita",
      id: "profile-player-3",
    },
    {
      email: "diego@padeljarto.demo",
      fullName: "Diego Globo",
      id: "profile-player-4",
    },
    {
      email: "carmen@padeljarto.demo",
      fullName: "Carmen Reves",
      id: "profile-player-5",
    },
    {
      email: "pablo@padeljarto.demo",
      fullName: "Pablo Cristal",
      id: "profile-player-6",
    },
    {
      email: "ana@padeljarto.demo",
      fullName: "Ana Contrapared",
      id: "profile-player-7",
    },
    {
      email: "jaime@padeljarto.demo",
      fullName: "Jaime Salida",
      id: "profile-player-8",
    },
    {
      email: "sara@padeljarto.demo",
      fullName: "Sara Liftada",
      id: "profile-player-9",
    },
    {
      email: "marcos@padeljarto.demo",
      fullName: "Marcos Potencia",
      id: "profile-player-10",
    },
    {
      email: "laura@padeljarto.demo",
      fullName: "Laura Punto de Oro",
      id: "profile-player-11",
    },
    {
      email: "bruno@padeljarto.demo",
      fullName: "Bruno Vibra",
      id: "profile-player-12",
    },
  ];
}

function buildMembership(
  tournamentId: string,
  userId: string,
  role: TournamentMembership["role"],
): TournamentMembership {
  return {
    id: crypto.randomUUID(),
    joinedAt: iso(-2, 10),
    role,
    status: "accepted",
    tournamentId,
    userId,
  };
}

function makeStages(tournamentId: string): [Stage, Stage] {
  return [
    {
      config: null,
      id: `${tournamentId}-stage-groups`,
      name: "Fase de grupos",
      sequence: 1,
      tournamentId,
      type: "groups",
    },
    {
      config: null,
      id: `${tournamentId}-stage-knockout`,
      name: "Cuadro final",
      sequence: 2,
      tournamentId,
      type: "knockout",
    },
  ];
}

function seedFixedPairsTournament() {
  const tournament = makeTournament(
    "tournament-fixed",
    "Padel Jarto Primavera",
    "fixed_pairs",
    iso(2, 18),
    iso(20, 22),
    {
      groupCount: 2,
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
  );

  const [groupStage, knockoutStage] = makeStages(tournament.id);
  const acceptedPlayerIds = [
    DEMO_PLAYER_ID,
    "profile-player-2",
    "profile-player-3",
    "profile-player-4",
    "profile-player-5",
    "profile-player-6",
    "profile-player-7",
    "profile-player-8",
    "profile-player-9",
    "profile-player-10",
    "profile-player-11",
    "profile-player-12",
  ];

  const memberships = [
    buildMembership(tournament.id, DEMO_ORGANIZER_ID, "organizer"),
    ...acceptedPlayerIds.map((playerId) => buildMembership(tournament.id, playerId, "player")),
  ];

  const teams: Team[] = [
    { id: "team-1", name: "Los Viborones", seed: 1, tournamentId: tournament.id },
    { id: "team-2", name: "Bandeja Boys", seed: 2, tournamentId: tournament.id },
    { id: "team-3", name: "Punto de Oro", seed: 3, tournamentId: tournament.id },
    { id: "team-4", name: "Cristalazos", seed: 4, tournamentId: tournament.id },
    { id: "team-5", name: "Los Globitos", seed: 5, tournamentId: tournament.id },
    { id: "team-6", name: "Salida Kings", seed: 6, tournamentId: tournament.id },
  ];
  const teamPairs: Record<string, [string, string]> = {
    "team-1": [DEMO_PLAYER_ID, "profile-player-2"],
    "team-2": ["profile-player-3", "profile-player-4"],
    "team-3": ["profile-player-5", "profile-player-6"],
    "team-4": ["profile-player-7", "profile-player-8"],
    "team-5": ["profile-player-9", "profile-player-10"],
    "team-6": ["profile-player-11", "profile-player-12"],
  };
  const teamMembers: TeamMember[] = Object.entries(teamPairs).flatMap(([teamId, playerIds]) =>
    playerIds.map((playerId) => ({
      id: crypto.randomUUID(),
      teamId,
      userId: playerId,
    })),
  );

  const groups: Group[] = snakeSeedIntoGroups(
    teams.map((team) => team.id),
    tournament.config.groupCount,
  ).flatMap((teamIds, index) => {
    const groupId = `${tournament.id}-group-${index + 1}`;
    return [
      {
        id: groupId,
        name: `Grupo ${String.fromCharCode(65 + index)}`,
        slot: index + 1,
        stageId: groupStage.id,
        tournamentId: tournament.id,
      },
    ];
  });

  const matches: Match[] = [];
  const matchSides: MatchSide[] = [];
  const scoreSubmissions: ScoreSubmission[] = [];

  groups.forEach((group, index) => {
    const groupTeamIds = snakeSeedIntoGroups(
      teams.map((team) => team.id),
      tournament.config.groupCount,
    )[index];
    const rounds = createRoundRobinPairs(groupTeamIds);

    rounds.forEach((roundPairs, roundIndex) => {
      roundPairs.forEach(([homeTeamId, awayTeamId], pairIndex) => {
        const matchId = `${group.id}-match-${roundIndex + 1}-${pairIndex + 1}`;
        matches.push({
          court: `Pista ${index + 1}`,
          createdAt: iso(-1, 9),
          groupId: group.id,
          id: matchId,
          roundLabel: `Jornada ${roundIndex + 1}`,
          scheduledAt: iso(roundIndex + index + 2, 19 + pairIndex),
          stageId: groupStage.id,
          status: "scheduled",
          tournamentId: tournament.id,
          updatedAt: iso(-1, 9),
          validatedSubmissionId: null,
        });
        matchSides.push({
          id: crypto.randomUUID(),
          matchId,
          playerIds: [...teamPairs[homeTeamId]],
          side: "home",
          teamId: homeTeamId,
        });
        matchSides.push({
          id: crypto.randomUUID(),
          matchId,
          playerIds: [...teamPairs[awayTeamId]],
          side: "away",
          teamId: awayTeamId,
        });
      });
    });
  });

  const fixedResults: Array<{ matchId: string; sets: ScoreSubmission["sets"]; status: ScoreSubmission["status"] }> = [
    {
      matchId: `${groups[0].id}-match-1-1`,
      sets: [
        { away: 4, home: 6 },
        { away: 6, home: 3 },
        { away: 4, home: 6 },
      ],
      status: "validated",
    },
    {
      matchId: `${groups[0].id}-match-2-1`,
      sets: [
        { away: 5, home: 7 },
        { away: 3, home: 6 },
      ],
      status: "validated",
    },
    {
      matchId: `${groups[1].id}-match-1-1`,
      sets: [
        { away: 6, home: 4 },
        { away: 4, home: 6 },
        { away: 7, home: 6, tiebreakAway: 7, tiebreakHome: 4 },
      ],
      status: "validated",
    },
    {
      matchId: `${groups[1].id}-match-2-1`,
      sets: [
        { away: 4, home: 6 },
        { away: 6, home: 7, tiebreakAway: 5, tiebreakHome: 7 },
      ],
      status: "pending_review",
    },
  ];

  fixedResults.forEach((result, index) => {
    const submissionId = `${result.matchId}-submission`;
    const createdAt = iso(index, 22);
    scoreSubmissions.push({
      createdAt,
      id: submissionId,
      matchId: result.matchId,
      notes: index === fixedResults.length - 1 ? "Pendiente de validar por el organizador" : null,
      reviewedAt: result.status === "validated" ? createdAt : null,
      reviewedBy: result.status === "validated" ? DEMO_ORGANIZER_ID : null,
      sets: result.sets,
      status: result.status,
      submittedBy: DEMO_PLAYER_ID,
    });

    const match = matches.find((entry) => entry.id === result.matchId);
    if (match) {
      match.status = result.status === "validated" ? "validated" : "pending_review";
      match.validatedSubmissionId = result.status === "validated" ? submissionId : null;
      match.updatedAt = createdAt;
    }
  });

  const invitation: Invitation = {
    acceptedAt: null,
    acceptedBy: null,
    createdAt: iso(-1, 14),
    createdBy: DEMO_ORGANIZER_ID,
    id: "invite-fixed-late",
    invitedEmail: "mario@padeljarto.demo",
    status: "pending",
    token: "fixed-demo-invite",
    tournamentId: tournament.id,
  };

  return {
    groups,
    invitations: [invitation],
    matches,
    memberships,
    matchSides,
    scoreSubmissions,
    stages: [groupStage, knockoutStage],
    teams,
    teamMembers,
    tournament,
  };
}

function seedIndividualTournament() {
  const tournament = makeTournament(
    "tournament-individual",
    "Padel Jarto Night Session",
    "individual_ranking",
    iso(5, 20),
    iso(15, 23),
    {
      groupCount: 2,
      individualPairingMode: "mixed",
      knockoutSize: 4,
      qualifiersPerGroup: 4,
      rules: {
        bestOfSets: 3,
        setsToWin: 2,
        tiebreakAt: 6,
      },
      scheduleGeneration: "automatic_with_editing",
    },
  );
  const [groupStage, knockoutStage] = makeStages(tournament.id);
  const playerIds = [
    DEMO_PLAYER_ID,
    "profile-player-2",
    "profile-player-3",
    "profile-player-4",
    "profile-player-5",
    "profile-player-6",
    "profile-player-7",
    "profile-player-8",
  ];

  const memberships = [
    buildMembership(tournament.id, DEMO_ORGANIZER_ID, "organizer"),
    ...playerIds.map((playerId) => buildMembership(tournament.id, playerId, "player")),
  ];

  const groupedPlayerIds = snakeSeedIntoGroups(playerIds, tournament.config.groupCount);
  const groups: Group[] = groupedPlayerIds.map((groupPlayerIds, index) => ({
    id: `${tournament.id}-group-${index + 1}`,
    name: `Grupo ${String.fromCharCode(65 + index)}`,
    slot: index + 1,
    stageId: groupStage.id,
    tournamentId: tournament.id,
  }));

  const matches: Match[] = [];
  const matchSides: MatchSide[] = [];
  const scoreSubmissions: ScoreSubmission[] = [];

  groups.forEach((group, index) => {
    const proposals = createIndividualRoundProposals(
      groupedPlayerIds[index],
      Math.max(groupedPlayerIds[index].length, 4),
    );

    proposals.forEach((proposal, proposalIndex) => {
      const matchId = `${group.id}-match-${proposalIndex + 1}`;
      matches.push({
        court: `Centro ${index + 1}`,
        createdAt: iso(0, 11),
        groupId: group.id,
        id: matchId,
        roundLabel: `Round Robin ${proposalIndex + 1}`,
        scheduledAt: iso(proposalIndex + index + 5, 21),
        stageId: groupStage.id,
        status: proposalIndex < 2 ? "validated" : proposalIndex === 2 ? "pending_review" : "scheduled",
        tournamentId: tournament.id,
        updatedAt: iso(0, 11),
        validatedSubmissionId: proposalIndex < 2 ? `${matchId}-submission` : null,
      });
      matchSides.push({
        id: crypto.randomUUID(),
        matchId,
        playerIds: proposal.homePlayerIds,
        side: "home",
        teamId: null,
      });
      matchSides.push({
        id: crypto.randomUUID(),
        matchId,
        playerIds: proposal.awayPlayerIds,
        side: "away",
        teamId: null,
      });

      if (proposalIndex <= 2) {
        scoreSubmissions.push({
          createdAt: iso(proposalIndex + 1, 23),
          id: `${matchId}-submission`,
          matchId,
          notes: proposalIndex === 2 ? "El admin tiene que confirmar el 10-8 del tercer set" : null,
          reviewedAt: proposalIndex < 2 ? iso(proposalIndex + 1, 23) : null,
          reviewedBy: proposalIndex < 2 ? DEMO_ORGANIZER_ID : null,
          sets:
            proposalIndex % 2 === 0
              ? [
                  { away: 4, home: 6 },
                  { away: 6, home: 3 },
                  { away: 8, home: 10, tiebreakAway: 8, tiebreakHome: 10 },
                ]
              : [
                  { away: 3, home: 6 },
                  { away: 6, home: 7, tiebreakAway: 5, tiebreakHome: 7 },
                ],
          status: proposalIndex < 2 ? "validated" : "pending_review",
          submittedBy: groupedPlayerIds[index][0],
        });
      }
    });
  });

  const knockoutEntries = [
    { label: "Pareja A", playerIds: [DEMO_PLAYER_ID, "profile-player-4"] as [string, string] },
    { label: "Pareja B", playerIds: ["profile-player-2", "profile-player-6"] as [string, string] },
    { label: "Pareja C", playerIds: ["profile-player-3", "profile-player-5"] as [string, string] },
    { label: "Pareja D", playerIds: ["profile-player-7", "profile-player-8"] as [string, string] },
  ];
  const knockout = buildKnockoutMatches(tournament, knockoutStage, knockoutEntries);

  knockout.matches.forEach((match, index) => {
    match.status = "scheduled";
    match.court = index < 2 ? `Pista ${index + 1}` : "Central";
    match.scheduledAt = iso(11 + index, 20);
  });

  const invitation: Invitation = {
    acceptedAt: null,
    acceptedBy: null,
    createdAt: iso(1, 12),
    createdBy: DEMO_ORGANIZER_ID,
    id: "invite-individual-open",
    invitedEmail: null,
    status: "pending",
    token: "individual-demo-invite",
    tournamentId: tournament.id,
  };

  return {
    groups,
    invitations: [invitation],
    matches: [...matches, ...knockout.matches],
    memberships,
    matchSides: [...matchSides, ...knockout.matchSides],
    scoreSubmissions,
    stages: [groupStage, knockoutStage],
    teams: [] as Team[],
    teamMembers: [] as TeamMember[],
    tournament,
  };
}

function calculateStandings(
  tournament: Tournament,
  stages: Stage[],
  groups: Group[],
  matches: Match[],
  matchSides: MatchSide[],
  scoreSubmissions: ScoreSubmission[],
): StandingRow[] {
  const detail = buildTournamentDetail(
    {
      groups,
      invitations: [],
      matches,
      memberships: [{ id: "seed", joinedAt: iso(-1, 10), role: "organizer", status: "accepted", tournamentId: tournament.id, userId: DEMO_ORGANIZER_ID }],
      matchSides,
      profiles: [{ email: "seed@padeljarto.demo", fullName: "Seed", id: DEMO_ORGANIZER_ID }],
      scoreSubmissions,
      stages,
      standings: [],
      teamMembers: [],
      teams: [],
      tournament,
    },
    DEMO_ORGANIZER_ID,
  );

  return detail?.standings ?? [];
}

export function createDemoSeed() {
  const profiles = buildBaseProfiles();
  const fixed = seedFixedPairsTournament();
  const individual = seedIndividualTournament();
  const tournaments = [fixed.tournament, individual.tournament];
  const standings = [
    ...calculateStandings(
      fixed.tournament,
      fixed.stages,
      fixed.groups,
      fixed.matches,
      fixed.matchSides,
      fixed.scoreSubmissions,
    ),
    ...calculateStandings(
      individual.tournament,
      individual.stages,
      individual.groups,
      individual.matches,
      individual.matchSides,
      individual.scoreSubmissions,
    ),
  ];

  return {
    groups: [...fixed.groups, ...individual.groups],
    invitations: [...fixed.invitations, ...individual.invitations],
    matches: [...fixed.matches, ...individual.matches],
    memberships: [...fixed.memberships, ...individual.memberships],
    matchSides: [...fixed.matchSides, ...individual.matchSides],
    profiles,
    scoreSubmissions: [...fixed.scoreSubmissions, ...individual.scoreSubmissions],
    stages: [...fixed.stages, ...individual.stages],
    standings,
    teamMembers: [...fixed.teamMembers, ...individual.teamMembers],
    teams: [...fixed.teams, ...individual.teams],
    tournaments,
  };
}
