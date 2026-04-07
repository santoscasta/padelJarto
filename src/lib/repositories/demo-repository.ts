import {
  buildKnockoutMatches,
  createIndividualRoundProposals,
  createRoundRobinPairs,
  findNextKnockoutSlot,
  snakeSeedIntoGroups,
} from "@/lib/domain/schedule";
import { DEMO_ORGANIZER_ID } from "@/lib/domain/mock-data";
import { resolveMatchWinner } from "@/lib/domain/standings";
import {
  type ConfigureIndividualKnockoutInput,
  type CreateInvitationInput,
  type CreateTeamInput,
  type CreateTournamentInput,
  type DashboardSnapshot,
  type Invitation,
  type MatchSide,
  type Profile,
  type ReviewSubmissionInput,
  type ScoreSubmission,
  type Stage,
  type Tournament,
  type TournamentBundle,
  type TournamentDetail,
  type TournamentRepository,
  type UpdateIndividualPairingInput,
  type UpdateMatchInput,
  type SubmitScoreInput,
} from "@/lib/domain/types";
import { buildDashboardSnapshot, buildTournamentDetail } from "@/lib/domain/view-models";
import { calculateStandings } from "@/lib/domain/standings";
import { type DemoStore, getDemoStore, mutateDemoStore } from "@/lib/repositories/demo-store";
import { invariant, slugify, unique } from "@/lib/utils";

function sortSides(left: MatchSide, right: MatchSide) {
  if (left.side === right.side) {
    return 0;
  }

  return left.side === "home" ? -1 : 1;
}

function getTournamentBundleFromStore(store: DemoStore, tournamentId: string) {
  const tournament = store.tournaments.find((entry) => entry.id === tournamentId);
  if (!tournament) {
    return null;
  }

  return {
    groups: store.groups.filter((group) => group.tournamentId === tournamentId),
    invitations: store.invitations.filter((invitation) => invitation.tournamentId === tournamentId),
    matches: store.matches.filter((match) => match.tournamentId === tournamentId),
    memberships: store.memberships.filter((membership) => membership.tournamentId === tournamentId),
    matchSides: store.matchSides.filter((side) =>
      store.matches.some((match) => match.id === side.matchId && match.tournamentId === tournamentId),
    ),
    profiles: store.profiles,
    scoreSubmissions: store.scoreSubmissions.filter((submission) =>
      store.matches.some((match) => match.id === submission.matchId && match.tournamentId === tournamentId),
    ),
    stages: store.stages.filter((stage) => stage.tournamentId === tournamentId),
    standings: store.standings.filter((standing) => standing.tournamentId === tournamentId),
    teamMembers: store.teamMembers.filter((teamMember) =>
      store.teams.some((team) => team.id === teamMember.teamId && team.tournamentId === tournamentId),
    ),
    teams: store.teams.filter((team) => team.tournamentId === tournamentId),
    tournament,
  } satisfies TournamentBundle;
}

function ensureOrganizer(bundle: TournamentBundle, organizerId: string) {
  const membership = bundle.memberships.find(
    (entry) => entry.userId === organizerId && entry.role === "organizer" && entry.status === "accepted",
  );
  invariant(membership, "Solo el organizador puede hacer este cambio.");
}

function recomputeStandingsForTournament(bundle: TournamentBundle) {
  return bundle.groups.flatMap((group) => {
    const groupMatches = bundle.matches
      .filter((match) => match.groupId === group.id)
      .map((match) => {
        const sides = bundle.matchSides
          .filter((side) => side.matchId === match.id)
          .sort(sortSides);
        const submissions = bundle.scoreSubmissions
          .filter((submission) => submission.matchId === match.id)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        const validatedSubmission =
          submissions.find((submission) => submission.status === "validated") ?? null;

        if (sides.length !== 2) {
          return null;
        }

        return {
          ...match,
          latestSubmission: submissions[0] ?? null,
          sides: [sides[0], sides[1]] as [MatchSide, MatchSide],
          validatedSubmission,
        };
      })
      .filter((match): match is NonNullable<typeof match> => Boolean(match));
    const entityIds = unique(
      groupMatches.flatMap((match) =>
        bundle.tournament.mode === "fixed_pairs"
          ? match.sides.flatMap((side) => (side.teamId ? [side.teamId] : []))
          : match.sides.flatMap((side) => side.playerIds),
      ),
    );

    return calculateStandings(
      bundle.tournament,
      group.stageId,
      group.id,
      entityIds,
      groupMatches,
    );
  });
}

function getGroupStage(bundle: TournamentBundle) {
  return bundle.stages.find((stage) => stage.type === "groups");
}

function getKnockoutStage(bundle: TournamentBundle) {
  return bundle.stages.find((stage) => stage.type === "knockout");
}

function seedTournamentBundle(tournament: Tournament, store = getDemoStore()) {
  return getTournamentBundleFromStore(store, tournament.id) ?? {
    groups: [],
    invitations: [],
    matches: [],
    memberships: [],
    matchSides: [],
    profiles: store.profiles,
    scoreSubmissions: [],
    stages: [],
    standings: [],
    teamMembers: [],
    teams: [],
    tournament,
  };
}

function updateKnockoutAdvancement(
  bundle: TournamentBundle,
  validatedSubmission: ScoreSubmission,
) {
  const match = bundle.matches.find((entry) => entry.id === validatedSubmission.matchId);
  if (!match) {
    return;
  }

  const nextSlot = findNextKnockoutSlot(match);
  if (!nextSlot) {
    if (match.bracketRound && match.bracketRound === Math.log2(bundle.tournament.config.knockoutSize)) {
      bundle.tournament.status = "completed";
    }
    return;
  }

  const currentSides = bundle.matchSides
    .filter((side) => side.matchId === match.id)
    .sort(sortSides);

  if (currentSides.length !== 2) {
    return;
  }

  const winner = resolveMatchWinner(validatedSubmission.sets, currentSides[0], currentSides[1]);
  if (!winner) {
    return;
  }

  const targetMatch = bundle.matches.find(
    (entry) =>
      entry.stageId === match.stageId &&
      entry.bracketRound === nextSlot.nextRound &&
      entry.bracketPosition === nextSlot.nextPosition,
  );

  if (!targetMatch) {
    return;
  }

  const targetSide = bundle.matchSides.find(
    (side) => side.matchId === targetMatch.id && side.side === nextSlot.side,
  );

  if (!targetSide) {
    return;
  }

  targetSide.playerIds = [...winner.playerIds];
  targetSide.teamId = winner.teamId ?? null;
  targetMatch.status = "scheduled";
}

function getQualifiedFixedEntries(bundle: TournamentBundle) {
  const groupsBySlot = [...bundle.groups].sort((left, right) => left.slot - right.slot);
  const standings = recomputeStandingsForTournament(bundle);
  const qualifiers = groupsBySlot.flatMap((group) =>
    standings
      .filter((row) => row.groupId === group.id)
      .sort((left, right) => left.rank - right.rank)
      .slice(0, bundle.tournament.config.qualifiersPerGroup),
  );

  return qualifiers.slice(0, bundle.tournament.config.knockoutSize).map((qualifier) => {
    const team = bundle.teams.find((entry) => entry.id === qualifier.entityId);
    invariant(team, "Equipo clasificado no encontrado");
    const players = bundle.teamMembers
      .filter((teamMember) => teamMember.teamId === team.id)
      .map((teamMember) => teamMember.userId);
    return {
      label: team.name,
      playerIds: players as [string, string],
      teamId: team.id,
    };
  });
}

export class DemoTournamentRepository implements TournamentRepository {
  async ensureProfile(profile: Profile) {
    mutateDemoStore((store) => {
      const existing = store.profiles.find((entry) => entry.id === profile.id);
      if (existing) {
        existing.avatarUrl = profile.avatarUrl ?? null;
        existing.email = profile.email;
        existing.fullName = profile.fullName;
        return;
      }

      store.profiles.push(profile);
    });
  }

  async getDashboard(userId: string): Promise<DashboardSnapshot> {
    const store = getDemoStore();
    const bundles = store.tournaments.map((tournament) => seedTournamentBundle(tournament, store));
    return buildDashboardSnapshot(bundles, store.profiles, userId);
  }

  async getInvitationByToken(token: string) {
    return getDemoStore().invitations.find((invitation) => invitation.token === token) ?? null;
  }

  async acceptInvitation(token: string, profile: Profile) {
    let tournamentId = "";

    mutateDemoStore((store) => {
      const invitation = store.invitations.find((entry) => entry.token === token);
      invariant(invitation, "Invitación no encontrada.");
      invariant(invitation.status === "pending", "La invitación ya no está disponible.");
      if (invitation.invitedEmail) {
        invariant(
          invitation.invitedEmail.toLowerCase() === profile.email.toLowerCase(),
          "Esta invitación pertenece a otro email.",
        );
      }

      tournamentId = invitation.tournamentId;
      const membership = store.memberships.find(
        (entry) => entry.tournamentId === invitation.tournamentId && entry.userId === profile.id,
      );
      if (!membership) {
        store.memberships.push({
          id: crypto.randomUUID(),
          joinedAt: new Date().toISOString(),
          role: "player",
          status: "accepted",
          tournamentId: invitation.tournamentId,
          userId: profile.id,
        });
      }
      invitation.acceptedAt = new Date().toISOString();
      invitation.acceptedBy = profile.id;
      invitation.status = "accepted";
    });

    return tournamentId;
  }

  async createTournament(input: CreateTournamentInput, organizer: Profile) {
    invariant(input.groupCount >= 1, "Debes crear al menos un grupo.");
    if (input.mode === "fixed_pairs") {
      invariant(
        input.groupCount * input.qualifiersPerGroup >= input.knockoutSize,
        "Los clasificados no alcanzan para llenar el cuadro.",
      );
    } else {
      invariant(
        input.groupCount * input.qualifiersPerGroup >= input.knockoutSize * 2,
        "En individual necesitas 2 jugadores por plaza del cuadro.",
      );
    }

    const tournament: Tournament = {
      config: {
        groupCount: input.groupCount,
        individualPairingMode: "mixed",
        knockoutSize: input.knockoutSize,
        qualifiersPerGroup: input.qualifiersPerGroup,
        rules: {
          bestOfSets: 3,
          setsToWin: 2,
          tiebreakAt: 6,
        },
        scheduleGeneration: "automatic_with_editing",
      },
      createdAt: new Date().toISOString(),
      endsAt: input.endsAt,
      id: crypto.randomUUID(),
      location: input.location ?? null,
      mode: input.mode,
      name: input.name,
      organizerId: organizer.id,
      slug: `${slugify(input.name)}-${Math.random().toString(36).slice(2, 7)}`,
      startsAt: input.startsAt,
      status: "draft",
      visibility: "private",
    };
    const stages: Stage[] = [
      {
        config: null,
        id: `${tournament.id}-groups`,
        name: "Fase de grupos",
        sequence: 1,
        tournamentId: tournament.id,
        type: "groups",
      },
      {
        config: null,
        id: `${tournament.id}-knockout`,
        name: "Cuadro final",
        sequence: 2,
        tournamentId: tournament.id,
        type: "knockout",
      },
    ];

    mutateDemoStore((store) => {
      store.tournaments.push(tournament);
      store.stages.push(...stages);
      store.memberships.push({
        id: crypto.randomUUID(),
        joinedAt: new Date().toISOString(),
        role: "organizer",
        status: "accepted",
        tournamentId: tournament.id,
        userId: organizer.id,
      });
    });

    return tournament;
  }

  async createInvitation(
    input: CreateInvitationInput,
    organizerId: string,
  ): Promise<Invitation> {
    let createdInvitation: Invitation | null = null;

    mutateDemoStore((store) => {
      const bundle = getTournamentBundleFromStore(store, input.tournamentId);
      invariant(bundle, "Torneo no encontrado.");
      ensureOrganizer(bundle, organizerId);

      const invitation: Invitation = {
        acceptedAt: null,
        acceptedBy: null,
        createdAt: new Date().toISOString(),
        createdBy: organizerId,
        id: crypto.randomUUID(),
        invitedEmail: input.invitedEmail || null,
        status: "pending",
        token: crypto.randomUUID().slice(0, 8),
        tournamentId: input.tournamentId,
      };
      store.invitations.push(invitation);
      createdInvitation = invitation;
    });

    invariant(createdInvitation, "No se pudo crear la invitación.");
    return createdInvitation;
  }

  async getTournamentDetail(tournamentId: string, userId: string): Promise<TournamentDetail | null> {
    const bundle = getTournamentBundleFromStore(getDemoStore(), tournamentId);
    if (!bundle) {
      return null;
    }

    bundle.standings = recomputeStandingsForTournament(bundle);
    return buildTournamentDetail(bundle, userId);
  }

  async createTeam(input: CreateTeamInput, organizerId: string) {
    mutateDemoStore((store) => {
      const bundle = getTournamentBundleFromStore(store, input.tournamentId);
      invariant(bundle, "Torneo no encontrado.");
      ensureOrganizer(bundle, organizerId);
      invariant(bundle.tournament.mode === "fixed_pairs", "Solo aplica a torneos de parejas fijas.");
      invariant(input.playerIds[0] !== input.playerIds[1], "Una pareja no puede repetirse.");

      const playerMemberships = bundle.memberships.filter(
        (membership) => membership.role === "player" && membership.status === "accepted",
      );
      input.playerIds.forEach((playerId) => {
        invariant(
          playerMemberships.some((membership) => membership.userId === playerId),
          "Todos los jugadores deben pertenecer al torneo.",
        );
        invariant(
          !bundle.teamMembers.some((teamMember) => teamMember.userId === playerId),
          "Ese jugador ya forma parte de otra pareja.",
        );
      });

      const teamId = crypto.randomUUID();
      store.teams.push({
        id: teamId,
        name: input.name,
        seed: bundle.teams.length + 1,
        tournamentId: input.tournamentId,
      });

      input.playerIds.forEach((playerId) => {
        store.teamMembers.push({
          id: crypto.randomUUID(),
          teamId,
          userId: playerId,
        });
      });
    });
  }

  async generateGroupStage(tournamentId: string, organizerId: string) {
    mutateDemoStore((store) => {
      const bundle = getTournamentBundleFromStore(store, tournamentId);
      invariant(bundle, "Torneo no encontrado.");
      ensureOrganizer(bundle, organizerId);
      const groupStage = getGroupStage(bundle);
      invariant(groupStage, "No existe la fase de grupos.");
      invariant(
        !bundle.matches.some((match) => match.stageId === groupStage.id),
        "El calendario de grupos ya está generado.",
      );

      const now = new Date().toISOString();
      bundle.tournament.status = "live";

      if (bundle.tournament.mode === "fixed_pairs") {
        invariant(bundle.teams.length >= bundle.tournament.config.groupCount, "Faltan parejas para generar grupos.");
        const seededTeams = [...bundle.teams].sort((left, right) => (left.seed ?? 999) - (right.seed ?? 999));
        const groupAssignments = snakeSeedIntoGroups(
          seededTeams.map((team) => team.id),
          bundle.tournament.config.groupCount,
        );

        groupAssignments.forEach((teamIds, index) => {
          const groupId = crypto.randomUUID();
          store.groups.push({
            id: groupId,
            name: `Grupo ${String.fromCharCode(65 + index)}`,
            slot: index + 1,
            stageId: groupStage.id,
            tournamentId,
          });

          const rounds = createRoundRobinPairs(teamIds);
          rounds.forEach((pairs, roundIndex) => {
            pairs.forEach(([homeTeamId, awayTeamId]) => {
              const matchId = crypto.randomUUID();
              const homePlayers = bundle.teamMembers
                .filter((teamMember) => teamMember.teamId === homeTeamId)
                .map((teamMember) => teamMember.userId);
              const awayPlayers = bundle.teamMembers
                .filter((teamMember) => teamMember.teamId === awayTeamId)
                .map((teamMember) => teamMember.userId);

              store.matches.push({
                court: `Pista ${(index % 3) + 1}`,
                createdAt: now,
                groupId,
                id: matchId,
                roundLabel: `Jornada ${roundIndex + 1}`,
                scheduledAt: "",
                stageId: groupStage.id,
                status: "draft",
                tournamentId,
                updatedAt: now,
                validatedSubmissionId: null,
              });
              store.matchSides.push({
                id: crypto.randomUUID(),
                matchId,
                playerIds: homePlayers,
                side: "home",
                teamId: homeTeamId,
              });
              store.matchSides.push({
                id: crypto.randomUUID(),
                matchId,
                playerIds: awayPlayers,
                side: "away",
                teamId: awayTeamId,
              });
            });
          });
        });
      } else {
        const playerIds = bundle.memberships
          .filter((membership) => membership.role === "player" && membership.status === "accepted")
          .map((membership) => membership.userId);
        invariant(playerIds.length >= bundle.tournament.config.groupCount * 4, "Necesitas al menos 4 jugadores por grupo.");
        const groupAssignments = snakeSeedIntoGroups(playerIds, bundle.tournament.config.groupCount);

        groupAssignments.forEach((groupPlayerIds, index) => {
          const groupId = crypto.randomUUID();
          store.groups.push({
            id: groupId,
            name: `Grupo ${String.fromCharCode(65 + index)}`,
            slot: index + 1,
            stageId: groupStage.id,
            tournamentId,
          });

          const proposals = createIndividualRoundProposals(
            groupPlayerIds,
            Math.max(groupPlayerIds.length, 4),
          );
          proposals.forEach((proposal, proposalIndex) => {
            const matchId = crypto.randomUUID();
            store.matches.push({
              court: `Centro ${(index % 2) + 1}`,
              createdAt: now,
              groupId,
              id: matchId,
              roundLabel: `Round Robin ${proposalIndex + 1}`,
              scheduledAt: "",
              stageId: groupStage.id,
              status: "draft",
              tournamentId,
              updatedAt: now,
              validatedSubmissionId: null,
            });
            store.matchSides.push({
              id: crypto.randomUUID(),
              matchId,
              playerIds: proposal.homePlayerIds,
              side: "home",
              teamId: null,
            });
            store.matchSides.push({
              id: crypto.randomUUID(),
              matchId,
              playerIds: proposal.awayPlayerIds,
              side: "away",
              teamId: null,
            });
          });
        });
      }

      const refreshedBundle = getTournamentBundleFromStore(store, tournamentId);
      if (refreshedBundle) {
        store.standings = [
          ...store.standings.filter((standing) => standing.tournamentId !== tournamentId),
          ...recomputeStandingsForTournament(refreshedBundle),
        ];
      }
    });
  }

  async updateMatch(input: UpdateMatchInput, organizerId: string) {
    mutateDemoStore((store) => {
      const bundle = getTournamentBundleFromStore(store, input.tournamentId);
      invariant(bundle, "Torneo no encontrado.");
      ensureOrganizer(bundle, organizerId);
      const match = store.matches.find((entry) => entry.id === input.matchId);
      invariant(match, "Partido no encontrado.");
      match.court = input.court || null;
      match.scheduledAt = input.scheduledAt || null;
      if (match.status === "draft") {
        match.status = "scheduled";
      }
      match.updatedAt = new Date().toISOString();
    });
  }

  async updateIndividualPairing(input: UpdateIndividualPairingInput, organizerId: string) {
    mutateDemoStore((store) => {
      const bundle = getTournamentBundleFromStore(store, input.tournamentId);
      invariant(bundle, "Torneo no encontrado.");
      ensureOrganizer(bundle, organizerId);
      invariant(bundle.tournament.mode === "individual_ranking", "Solo disponible en ranking individual.");
      invariant(
        unique([...input.homePlayerIds, ...input.awayPlayerIds]).length === 4,
        "Cada jugador solo puede aparecer una vez por partido.",
      );

      const sides = store.matchSides
        .filter((entry) => entry.matchId === input.matchId)
        .sort(sortSides);
      invariant(sides.length === 2, "El partido no tiene lados completos.");
      sides[0].playerIds = [...input.homePlayerIds];
      sides[1].playerIds = [...input.awayPlayerIds];
    });
  }

  async submitScore(input: SubmitScoreInput, userId: string) {
    mutateDemoStore((store) => {
      const bundle = getTournamentBundleFromStore(store, input.tournamentId);
      invariant(bundle, "Torneo no encontrado.");
      const match = bundle.matches.find((entry) => entry.id === input.matchId);
      invariant(match, "Partido no encontrado.");
      const sides = bundle.matchSides.filter((side) => side.matchId === input.matchId);
      invariant(
        sides.some((side) => side.playerIds.includes(userId)) || userId === DEMO_ORGANIZER_ID,
        "No puedes reportar un partido ajeno.",
      );

      const submission: ScoreSubmission = {
        createdAt: new Date().toISOString(),
        id: crypto.randomUUID(),
        matchId: input.matchId,
        notes: input.notes ?? null,
        reviewedAt: null,
        reviewedBy: null,
        sets: input.sets,
        status: "pending_review",
        submittedBy: userId,
      };
      store.scoreSubmissions.push(submission);

      const persistedMatch = store.matches.find((entry) => entry.id === input.matchId);
      invariant(persistedMatch, "Partido no encontrado.");
      persistedMatch.status = "pending_review";
      persistedMatch.updatedAt = submission.createdAt;
    });
  }

  async reviewSubmission(input: ReviewSubmissionInput, organizerId: string) {
    mutateDemoStore((store) => {
      const bundle = getTournamentBundleFromStore(store, input.tournamentId);
      invariant(bundle, "Torneo no encontrado.");
      ensureOrganizer(bundle, organizerId);
      const submission = store.scoreSubmissions.find((entry) => entry.id === input.submissionId);
      invariant(submission, "Resultado no encontrado.");
      submission.status = input.nextStatus;
      submission.reviewedAt = new Date().toISOString();
      submission.reviewedBy = organizerId;

      const match = store.matches.find((entry) => entry.id === submission.matchId);
      invariant(match, "Partido no encontrado.");

      if (input.nextStatus === "validated") {
        store.scoreSubmissions
          .filter((entry) => entry.matchId === submission.matchId && entry.id !== submission.id && entry.status === "validated")
          .forEach((entry) => {
            entry.status = "rejected";
            entry.reviewedAt = submission.reviewedAt;
            entry.reviewedBy = organizerId;
          });
        match.status = "validated";
        match.validatedSubmissionId = submission.id;
        updateKnockoutAdvancement(bundle, submission);
      } else {
        const hasValidated = store.scoreSubmissions.some(
          (entry) => entry.matchId === submission.matchId && entry.status === "validated",
        );
        match.status = hasValidated ? "validated" : "scheduled";
        match.validatedSubmissionId =
          store.scoreSubmissions.find(
            (entry) => entry.matchId === submission.matchId && entry.status === "validated",
          )?.id ?? null;
      }

      const refreshedBundle = getTournamentBundleFromStore(store, input.tournamentId);
      if (refreshedBundle) {
        store.standings = [
          ...store.standings.filter((standing) => standing.tournamentId !== input.tournamentId),
          ...recomputeStandingsForTournament(refreshedBundle),
        ];
      }
    });
  }

  async generateKnockout(tournamentId: string, organizerId: string) {
    mutateDemoStore((store) => {
      const bundle = getTournamentBundleFromStore(store, tournamentId);
      invariant(bundle, "Torneo no encontrado.");
      ensureOrganizer(bundle, organizerId);
      invariant(bundle.tournament.mode === "fixed_pairs", "Esta acción automática solo aplica a parejas fijas.");
      const knockoutStage = getKnockoutStage(bundle);
      invariant(knockoutStage, "No existe fase eliminatoria.");
      invariant(
        !bundle.matches.some((match) => match.stageId === knockoutStage.id),
        "El cuadro eliminatorio ya existe.",
      );

      const entries = getQualifiedFixedEntries(bundle);
      const knockout = buildKnockoutMatches(bundle.tournament, knockoutStage, entries);
      store.matches.push(...knockout.matches);
      store.matchSides.push(...knockout.matchSides);
    });
  }

  async configureIndividualKnockout(input: ConfigureIndividualKnockoutInput, organizerId: string) {
    mutateDemoStore((store) => {
      const bundle = getTournamentBundleFromStore(store, input.tournamentId);
      invariant(bundle, "Torneo no encontrado.");
      ensureOrganizer(bundle, organizerId);
      invariant(bundle.tournament.mode === "individual_ranking", "Solo aplica al modo individual.");
      const knockoutStage = getKnockoutStage(bundle);
      invariant(knockoutStage, "No existe fase eliminatoria.");
      invariant(
        !bundle.matches.some((match) => match.stageId === knockoutStage.id),
        "La eliminatoria ya fue creada.",
      );

      const uniquePlayers = unique(input.pairs.flatMap((pair) => pair.playerIds));
      invariant(
        uniquePlayers.length === input.pairs.length * 2,
        "No puedes repetir jugadores en distintas parejas.",
      );

      const knockout = buildKnockoutMatches(
        bundle.tournament,
        knockoutStage,
        input.pairs.map((pair) => ({ label: pair.label, playerIds: pair.playerIds })),
      );
      store.matches.push(...knockout.matches);
      store.matchSides.push(...knockout.matchSides);
    });
  }
}
