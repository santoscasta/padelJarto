import {
  buildKnockoutMatches,
  createIndividualRoundProposals,
  createRoundRobinPairs,
  findNextKnockoutSlot,
  snakeSeedIntoGroups,
} from "@/lib/domain/schedule";
import { calculateStandings, resolveMatchWinner } from "@/lib/domain/standings";
import type {
  AssignVariablePairsInput,
  Club,
  ConfigureIndividualKnockoutInput,
  CreateClubInput,
  CreateInvitationInput,
  CreateTeamInput,
  CreateTournamentInput,
  DashboardSnapshot,
  Invitation,
  MatchSide,
  Notification,
  Profile,
  ProposeResultInput,
  ResolveDisputeInput,
  ReviewSubmissionInput,
  ScoreSubmission,
  Stage,
  Tournament,
  TournamentBundle,
  TournamentDetail,
  TournamentRepository,
  UpdateIndividualPairingInput,
  UpdateMatchInput,
  UpdateProfileInput,
  SubmitScoreInput,
  ValidateResultInput,
} from "@/lib/domain/types";
import { buildDashboardSnapshot, buildTournamentDetail } from "@/lib/domain/view-models";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { invariant, slugify, unique } from "@/lib/utils";

function sortSides(left: MatchSide, right: MatchSide) {
  if (left.side === right.side) {
    return 0;
  }

  return left.side === "home" ? -1 : 1;
}

function generateInvitationToken() {
  return crypto.randomUUID();
}

function getAcceptedPlayerIds(bundle: TournamentBundle) {
  return new Set(
    bundle.memberships
      .filter((membership) => membership.role === "player" && membership.status === "accepted")
      .map((membership) => membership.userId),
  );
}

function ensureAcceptedMembership(bundle: TournamentBundle, userId: string) {
  const membership = bundle.memberships.find(
    (entry) => entry.userId === userId && entry.status === "accepted",
  );
  invariant(membership, "No tienes acceso a este torneo.");
  return membership;
}

function ensureMatchBelongsToTournament(bundle: TournamentBundle, matchId: string) {
  const match = bundle.matches.find((entry) => entry.id === matchId);
  invariant(match, "Partido no encontrado.");
  invariant(match.tournamentId === bundle.tournament.id, "El partido no pertenece al torneo.");
  return match;
}

function getSortedMatchSides(bundle: TournamentBundle, matchId: string) {
  const sides = bundle.matchSides.filter((side) => side.matchId === matchId).sort(sortSides);
  invariant(sides.length === 2, "El partido no tiene lados completos.");
  return sides as [MatchSide, MatchSide];
}

function ensureTournamentPlayers(bundle: TournamentBundle, playerIds: string[]) {
  const acceptedPlayerIds = getAcceptedPlayerIds(bundle);
  playerIds.forEach((playerId) => {
    invariant(acceptedPlayerIds.has(playerId), "Todos los jugadores deben pertenecer al torneo.");
  });
}

function ensureDistinctPlayerIds(playerIds: string[], message: string) {
  invariant(unique(playerIds).length === playerIds.length, message);
}

function validateScoreSets(sets: SubmitScoreInput["sets"]) {
  invariant(sets.length > 0, "Debes enviar al menos un set.");

  sets.forEach((set) => {
    invariant(Number.isInteger(set.home) && set.home >= 0, "El marcador local no es valido.");
    invariant(Number.isInteger(set.away) && set.away >= 0, "El marcador visitante no es valido.");
    invariant(set.home !== set.away, "Un set no puede terminar empatado.");

    if (set.tiebreakHome != null) {
      invariant(
        Number.isInteger(set.tiebreakHome) && set.tiebreakHome >= 0,
        "El tiebreak local no es valido.",
      );
    }

    if (set.tiebreakAway != null) {
      invariant(
        Number.isInteger(set.tiebreakAway) && set.tiebreakAway >= 0,
        "El tiebreak visitante no es valido.",
      );
    }
  });
}

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    avatarUrl: (row.avatar_url as string | null | undefined) ?? null,
    city: (row.city as string | null | undefined) ?? null,
    dominantHand: (row.dominant_hand as Profile["dominantHand"]) ?? null,
    email: String(row.email),
    fullName: String(row.full_name),
    id: String(row.id),
    level: (row.level as string | null | undefined) ?? null,
    username: (row.username as string | null | undefined) ?? null,
  };
}

function mapTournament(row: Record<string, unknown>): Tournament {
  return {
    clubId: (row.club_id as string | null | undefined) ?? null,
    config: row.config as Tournament["config"],
    createdAt: String(row.created_at),
    endsAt: String(row.ends_at),
    format: (row.format as Tournament["format"]) ?? "league_playoff",
    id: String(row.id),
    location: (row.location as string | null | undefined) ?? null,
    mode: row.mode as Tournament["mode"],
    name: String(row.name),
    organizerId: String(row.organizer_id),
    pairMode: (row.pair_mode as Tournament["pairMode"]) ?? "fixed",
    slug: String(row.slug),
    startsAt: String(row.starts_at),
    status: row.status as Tournament["status"],
    visibility: row.visibility as Tournament["visibility"],
  };
}

function mapMembership(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    joinedAt: String(row.joined_at),
    role: row.role as "organizer" | "player",
    status: row.status as "invited" | "accepted",
    tournamentId: String(row.tournament_id),
    userId: String(row.user_id),
  };
}

function mapInvitation(row: Record<string, unknown>): Invitation {
  return {
    acceptedAt: (row.accepted_at as string | null | undefined) ?? null,
    acceptedBy: (row.accepted_by as string | null | undefined) ?? null,
    createdAt: String(row.created_at),
    createdBy: String(row.created_by),
    id: String(row.id),
    invitedEmail: (row.invited_email as string | null | undefined) ?? null,
    status: row.status as Invitation["status"],
    token: String(row.token),
    tournamentId: String(row.tournament_id),
  };
}

function mapStage(row: Record<string, unknown>): Stage {
  return {
    config: (row.config as Record<string, unknown> | null | undefined) ?? null,
    id: String(row.id),
    name: String(row.name),
    sequence: Number(row.sequence),
    tournamentId: String(row.tournament_id),
    type: row.type as Stage["type"],
  };
}

function mapGroup(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    slot: Number(row.slot),
    stageId: String(row.stage_id),
    tournamentId: String(row.tournament_id),
  };
}

function mapTeam(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    seed: (row.seed as number | null | undefined) ?? null,
    tournamentId: String(row.tournament_id),
  };
}

function mapTeamMember(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    userId: String(row.user_id),
  };
}

function mapMatch(row: Record<string, unknown>) {
  return {
    bracketPosition: (row.bracket_position as number | null | undefined) ?? null,
    bracketRound: (row.bracket_round as number | null | undefined) ?? null,
    court: (row.court as string | null | undefined) ?? null,
    createdAt: String(row.created_at),
    groupId: (row.group_id as string | null | undefined) ?? null,
    id: String(row.id),
    roundLabel: (row.round_label as string | null | undefined) ?? null,
    scheduledAt: (row.scheduled_at as string | null | undefined) ?? null,
    stageId: String(row.stage_id),
    status: row.status as TournamentBundle["matches"][number]["status"],
    tournamentId: String(row.tournament_id),
    updatedAt: String(row.updated_at),
    validatedSubmissionId: (row.validated_submission_id as string | null | undefined) ?? null,
  };
}

function mapMatchSide(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    matchId: String(row.match_id),
    playerIds: ((row.player_ids as string[] | null | undefined) ?? []).map(String),
    side: row.side as "home" | "away",
    teamId: (row.team_id as string | null | undefined) ?? null,
  };
}

function mapSubmission(row: Record<string, unknown>): ScoreSubmission {
  return {
    createdAt: String(row.created_at),
    id: String(row.id),
    matchId: String(row.match_id),
    notes: (row.notes as string | null | undefined) ?? null,
    reviewedAt: (row.reviewed_at as string | null | undefined) ?? null,
    reviewedBy: (row.reviewed_by as string | null | undefined) ?? null,
    sets: row.sets as ScoreSubmission["sets"],
    status: row.status as ScoreSubmission["status"],
    submittedBy: String(row.submitted_by),
  };
}

function mapStanding(row: Record<string, unknown>) {
  return {
    entityId: String(row.entity_id),
    entityType: row.entity_type as "team" | "player",
    gamesAgainst: Number(row.games_against),
    gamesFor: Number(row.games_for),
    groupId: (row.group_id as string | null | undefined) ?? null,
    id: String(row.id),
    losses: Number(row.losses),
    played: Number(row.played),
    rank: Number(row.rank),
    setsAgainst: Number(row.sets_against),
    setsFor: Number(row.sets_for),
    stageId: String(row.stage_id),
    tournamentId: String(row.tournament_id),
    wins: Number(row.wins),
  };
}

function createBundleHelpers(bundle: TournamentBundle) {
  return {
    ensureOrganizer(userId: string) {
      const membership = bundle.memberships.find(
        (entry) => entry.userId === userId && entry.role === "organizer" && entry.status === "accepted",
      );
      invariant(membership, "Solo el organizer puede hacer este cambio.");
    },
    recomputeStandings() {
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
    },
  };
}

function buildKnockoutAdvancementUpdate(bundle: TournamentBundle, validatedSubmission: ScoreSubmission) {
  const match = bundle.matches.find((entry) => entry.id === validatedSubmission.matchId);
  if (!match) {
    return null;
  }

  const nextSlot = findNextKnockoutSlot(match);
  const currentSides = bundle.matchSides
    .filter((side) => side.matchId === match.id)
    .sort(sortSides);

  if (currentSides.length !== 2) {
    return null;
  }

  const winner = resolveMatchWinner(validatedSubmission.sets, currentSides[0], currentSides[1]);
  if (!winner) {
    return null;
  }

  if (!nextSlot) {
    return {
      finalizesTournament:
        Boolean(match.bracketRound) &&
        match.bracketRound === Math.log2(bundle.tournament.config.knockoutSize),
      targetMatchId: null,
      targetSideId: null,
      winner,
    };
  }

  const targetMatch = bundle.matches.find(
    (entry) =>
      entry.stageId === match.stageId &&
      entry.bracketRound === nextSlot.nextRound &&
      entry.bracketPosition === nextSlot.nextPosition,
  );

  if (!targetMatch) {
    return null;
  }

  const targetSide = bundle.matchSides.find(
    (side) => side.matchId === targetMatch.id && side.side === nextSlot.side,
  );

  if (!targetSide) {
    return null;
  }

  return {
    finalizesTournament: false,
    targetMatchId: targetMatch.id,
    targetSideId: targetSide.id,
    winner,
  };
}

async function loadBundle(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  tournamentId: string,
): Promise<TournamentBundle | null> {
  const { data: tournamentRow, error: tournamentError } = await client
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tournamentError) {
    throw tournamentError;
  }

  if (!tournamentRow) {
    return null;
  }

  const [
    membershipsResult,
    invitationsResult,
    stagesResult,
    groupsResult,
    teamsResult,
    matchesResult,
    standingsResult,
  ] = await Promise.all([
    client.from("tournament_memberships").select("*").eq("tournament_id", tournamentId),
    client.from("invitations").select("*").eq("tournament_id", tournamentId),
    client.from("stages").select("*").eq("tournament_id", tournamentId).order("sequence"),
    client.from("groups").select("*").eq("tournament_id", tournamentId).order("slot"),
    client.from("teams").select("*").eq("tournament_id", tournamentId).order("seed"),
    client.from("matches").select("*").eq("tournament_id", tournamentId),
    client.from("standings").select("*").eq("tournament_id", tournamentId),
  ]);

  for (const result of [
    membershipsResult,
    invitationsResult,
    stagesResult,
    groupsResult,
    teamsResult,
    matchesResult,
    standingsResult,
  ]) {
    if (result.error) {
      throw result.error;
    }
  }

  const teamIds = (teamsResult.data ?? []).map((row) => String(row.id));
  const matchIds = (matchesResult.data ?? []).map((row) => String(row.id));

  const [teamMembersResult, matchSidesResult, submissionsResult] = await Promise.all([
    teamIds.length
      ? client.from("team_members").select("*").in("team_id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    matchIds.length
      ? client.from("match_sides").select("*").in("match_id", matchIds)
      : Promise.resolve({ data: [], error: null }),
    matchIds.length
      ? client.from("score_submissions").select("*").in("match_id", matchIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [teamMembersResult, matchSidesResult, submissionsResult]) {
    if (result.error) {
      throw result.error;
    }
  }

  const profileIds = unique([
    String(tournamentRow.organizer_id),
    ...(membershipsResult.data ?? []).map((row) => String(row.user_id)),
    ...((teamMembersResult.data ?? []).map((row) => String(row.user_id))),
    ...((submissionsResult.data ?? []).flatMap((row) => [
      String(row.submitted_by),
      row.reviewed_by ? String(row.reviewed_by) : "",
    ])),
  ].filter(Boolean));

  const profilesResult = profileIds.length
    ? await client.from("profiles").select("*").in("id", profileIds)
    : { data: [], error: null };

  if (profilesResult.error) {
    throw profilesResult.error;
  }

  return {
    groups: (groupsResult.data ?? []).map(mapGroup),
    invitations: (invitationsResult.data ?? []).map(mapInvitation),
    matches: (matchesResult.data ?? []).map(mapMatch),
    memberships: (membershipsResult.data ?? []).map(mapMembership),
    matchSides: (matchSidesResult.data ?? []).map(mapMatchSide),
    profiles: (profilesResult.data ?? []).map(mapProfile),
    proposals: [],
    proposalValidations: [],
    registrations: [],
    rounds: [],
    scoreSubmissions: (submissionsResult.data ?? []).map(mapSubmission),
    stages: (stagesResult.data ?? []).map(mapStage),
    standings: (standingsResult.data ?? []).map(mapStanding),
    teamMembers: (teamMembersResult.data ?? []).map(mapTeamMember),
    teams: (teamsResult.data ?? []).map(mapTeam),
    tournament: mapTournament(tournamentRow),
  } satisfies TournamentBundle;
}

function getQualifiedFixedEntries(bundle: TournamentBundle) {
  const helpers = createBundleHelpers(bundle);
  const standings = helpers.recomputeStandings();
  const groupsBySlot = [...bundle.groups].sort((left, right) => left.slot - right.slot);

  return groupsBySlot
    .flatMap((group) =>
      standings
        .filter((row) => row.groupId === group.id)
        .sort((left, right) => left.rank - right.rank)
        .slice(0, bundle.tournament.config.qualifiersPerGroup),
    )
    .slice(0, bundle.tournament.config.knockoutSize)
    .map((qualifier) => {
      const team = bundle.teams.find((entry) => entry.id === qualifier.entityId);
      invariant(team, "Equipo clasificado no encontrado.");
      const players = bundle.teamMembers
        .filter((member) => member.teamId === team.id)
        .map((member) => member.userId) as [string, string];

      return {
        label: team.name,
        playerIds: players,
        teamId: team.id,
      };
    });
}

export class SupabaseTournamentRepository implements TournamentRepository {
  private client() {
    const client = createSupabaseAdminClient();
    invariant(client, "Supabase no está configurado para datos.");
    return client;
  }

  async ensureProfile(profile: Profile) {
    const client = this.client();
    const { error } = await client.from("profiles").upsert(
      {
        avatar_url: profile.avatarUrl ?? null,
        email: profile.email,
        full_name: profile.fullName,
        id: profile.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      throw error;
    }
  }

  async getDashboard(userId: string): Promise<DashboardSnapshot> {
    const client = this.client();
    const { data: profileRows, error: profileError } = await client
      .from("profiles")
      .select("*")
      .eq("id", userId);
    if (profileError) {
      throw profileError;
    }

    const { data: membershipsRows, error: membershipsError } = await client
      .from("tournament_memberships")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "accepted");
    if (membershipsError) {
      throw membershipsError;
    }

    const tournamentIds = unique((membershipsRows ?? []).map((row) => String(row.tournament_id)));
    const bundlesLoaded: Array<TournamentBundle | null> = await Promise.all(
      tournamentIds.map((tournamentId) => loadBundle(client, tournamentId)),
    );
    const bundles = bundlesLoaded.filter(
      (bundle): bundle is TournamentBundle => bundle !== null,
    );

    return buildDashboardSnapshot(
      bundles,
      (profileRows ?? []).map(mapProfile),
      userId,
    );
  }

  async getInvitationByToken(token: string) {
    const client = this.client();
    const { data, error } = await client
      .from("invitations")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (error) {
      throw error;
    }

    return data ? mapInvitation(data) : null;
  }

  async acceptInvitation(token: string, profile: Profile) {
    const client = this.client();
    const invitation = await this.getInvitationByToken(token);
    invariant(invitation, "Invitación no encontrada.");
    invariant(invitation.status === "pending", "La invitación ya no está disponible.");
    if (invitation.invitedEmail) {
      invariant(
        invitation.invitedEmail.toLowerCase() === profile.email.toLowerCase(),
        "Esta invitación pertenece a otro email.",
      );
    }

    await this.ensureProfile(profile);

    const { error: membershipError } = await client.from("tournament_memberships").upsert(
      {
        joined_at: new Date().toISOString(),
        role: "player",
        status: "accepted",
        tournament_id: invitation.tournamentId,
        user_id: profile.id,
      },
      { onConflict: "tournament_id,user_id" },
    );
    if (membershipError) {
      throw membershipError;
    }

    const { error: invitationError } = await client
      .from("invitations")
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: profile.id,
        status: "accepted",
      })
      .eq("id", invitation.id);
    if (invitationError) {
      throw invitationError;
    }

    return invitation.tournamentId;
  }

  async createTournament(input: CreateTournamentInput, organizer: Profile) {
    const client = this.client();
    await this.ensureProfile(organizer);

    const tournamentInsert = {
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
      ends_at: input.endsAt,
      format: input.format ?? "league_playoff",
      location: input.location ?? null,
      mode: input.mode,
      name: input.name,
      organizer_id: organizer.id,
      pair_mode: input.pairMode ?? "fixed",
      slug: `${slugify(input.name)}-${Math.random().toString(36).slice(2, 7)}`,
      starts_at: input.startsAt,
      status: "draft",
      visibility: "private",
    };
    const { data: tournamentRow, error: tournamentError } = await client
      .from("tournaments")
      .insert(tournamentInsert)
      .select("*")
      .single();
    if (tournamentError) {
      throw tournamentError;
    }

    const tournament = mapTournament(tournamentRow);
    try {
      const { error: stageError } = await client.from("stages").insert([
        {
          name: "Fase de grupos",
          sequence: 1,
          tournament_id: tournament.id,
          type: "groups",
        },
        {
          name: "Cuadro final",
          sequence: 2,
          tournament_id: tournament.id,
          type: "knockout",
        },
      ]);
      if (stageError) {
        throw stageError;
      }

      const { error: membershipError } = await client.from("tournament_memberships").insert({
        joined_at: new Date().toISOString(),
        role: "organizer",
        status: "accepted",
        tournament_id: tournament.id,
        user_id: organizer.id,
      });
      if (membershipError) {
        throw membershipError;
      }
    } catch (error) {
      const { error: cleanupError } = await client.from("tournaments").delete().eq("id", tournament.id);
      if (cleanupError) {
        throw cleanupError;
      }

      throw error;
    }

    return tournament;
  }

  async createInvitation(input: CreateInvitationInput, organizerId: string): Promise<Invitation> {
    const client = this.client();
    const bundle = await loadBundle(client, input.tournamentId);
    invariant(bundle, "Torneo no encontrado.");
    createBundleHelpers(bundle).ensureOrganizer(organizerId);

    const invitationInsert = {
      created_at: new Date().toISOString(),
      created_by: organizerId,
      invited_email: input.invitedEmail ?? null,
      status: "pending",
      token: generateInvitationToken(),
      tournament_id: input.tournamentId,
    };
    const { data, error } = await client
      .from("invitations")
      .insert(invitationInsert)
      .select("*")
      .single();
    if (error) {
      throw error;
    }

    return mapInvitation(data);
  }

  async getTournamentDetail(tournamentId: string, userId: string): Promise<TournamentDetail | null> {
    const client = this.client();
    const bundle = await loadBundle(client, tournamentId);
    if (!bundle) {
      return null;
    }

    if (!bundle.standings?.length) {
      bundle.standings = createBundleHelpers(bundle).recomputeStandings();
    }

    return buildTournamentDetail(bundle, userId);
  }

  async createTeam(input: CreateTeamInput, organizerId: string) {
    const client = this.client();
    const bundle = await loadBundle(client, input.tournamentId);
    invariant(bundle, "Torneo no encontrado.");
    createBundleHelpers(bundle).ensureOrganizer(organizerId);
    invariant(bundle.tournament.mode === "fixed_pairs", "Solo aplica a torneos de parejas fijas.");
    invariant(input.playerIds[0] !== input.playerIds[1], "Una pareja no puede repetirse.");
    ensureTournamentPlayers(bundle, input.playerIds);

    const existingUserIds = new Set(bundle.teamMembers.map((member) => member.userId));
    input.playerIds.forEach((playerId) => {
      invariant(!existingUserIds.has(playerId), "Ese jugador ya forma parte de otra pareja.");
    });

    const teamId = crypto.randomUUID();
    const { error: teamError } = await client.from("teams").insert({
      id: teamId,
      name: input.name,
      seed: bundle.teams.length + 1,
      tournament_id: input.tournamentId,
    });
    if (teamError) {
      throw teamError;
    }

    const { error: membersError } = await client.from("team_members").insert(
      input.playerIds.map((playerId) => ({
        id: crypto.randomUUID(),
        team_id: teamId,
        user_id: playerId,
      })),
    );
    if (membersError) {
      throw membersError;
    }
  }

  async generateGroupStage(tournamentId: string, organizerId: string) {
    const client = this.client();
    const bundle = await loadBundle(client, tournamentId);
    invariant(bundle, "Torneo no encontrado.");
    const helpers = createBundleHelpers(bundle);
    helpers.ensureOrganizer(organizerId);
    const groupStage = bundle.stages.find((stage) => stage.type === "groups");
    invariant(groupStage, "No existe la fase de grupos.");
    invariant(
      !bundle.matches.some((match) => match.stageId === groupStage.id),
      "El calendario de grupos ya está generado.",
    );

    const groupInserts: Array<Record<string, unknown>> = [];
    const matchInserts: Array<Record<string, unknown>> = [];
    const sideInserts: Array<Record<string, unknown>> = [];
    const now = new Date().toISOString();

    if (bundle.tournament.mode === "fixed_pairs") {
      const seededTeams = [...bundle.teams].sort((left, right) => (left.seed ?? 999) - (right.seed ?? 999));
      const groupAssignments = snakeSeedIntoGroups(
        seededTeams.map((team) => team.id),
        bundle.tournament.config.groupCount,
      );

      groupAssignments.forEach((teamIds, index) => {
        const groupId = crypto.randomUUID();
        groupInserts.push({
          id: groupId,
          name: `Grupo ${String.fromCharCode(65 + index)}`,
          slot: index + 1,
          stage_id: groupStage.id,
          tournament_id: tournamentId,
        });
        createRoundRobinPairs(teamIds).forEach((pairs, roundIndex) => {
          pairs.forEach(([homeTeamId, awayTeamId]) => {
            const matchId = crypto.randomUUID();
            const homePlayers = bundle.teamMembers
              .filter((member) => member.teamId === homeTeamId)
              .map((member) => member.userId);
            const awayPlayers = bundle.teamMembers
              .filter((member) => member.teamId === awayTeamId)
              .map((member) => member.userId);

            matchInserts.push({
              court: `Pista ${(index % 3) + 1}`,
              created_at: now,
              group_id: groupId,
              id: matchId,
              round_label: `Jornada ${roundIndex + 1}`,
              scheduled_at: null,
              stage_id: groupStage.id,
              status: "draft",
              tournament_id: tournamentId,
              updated_at: now,
              validated_submission_id: null,
            });
            sideInserts.push(
              {
                id: crypto.randomUUID(),
                match_id: matchId,
                player_ids: homePlayers,
                side: "home",
                team_id: homeTeamId,
              },
              {
                id: crypto.randomUUID(),
                match_id: matchId,
                player_ids: awayPlayers,
                side: "away",
                team_id: awayTeamId,
              },
            );
          });
        });
      });
    } else {
      const playerIds = bundle.memberships
        .filter((membership) => membership.role === "player" && membership.status === "accepted")
        .map((membership) => membership.userId);
      const groupAssignments = snakeSeedIntoGroups(playerIds, bundle.tournament.config.groupCount);

      groupAssignments.forEach((groupPlayerIds, index) => {
        const groupId = crypto.randomUUID();
        groupInserts.push({
          id: groupId,
          name: `Grupo ${String.fromCharCode(65 + index)}`,
          slot: index + 1,
          stage_id: groupStage.id,
          tournament_id: tournamentId,
        });
        createIndividualRoundProposals(groupPlayerIds, Math.max(groupPlayerIds.length, 4)).forEach(
          (proposal, proposalIndex) => {
            const matchId = crypto.randomUUID();
            matchInserts.push({
              court: `Centro ${(index % 2) + 1}`,
              created_at: now,
              group_id: groupId,
              id: matchId,
              round_label: `Round Robin ${proposalIndex + 1}`,
              scheduled_at: null,
              stage_id: groupStage.id,
              status: "draft",
              tournament_id: tournamentId,
              updated_at: now,
              validated_submission_id: null,
            });
            sideInserts.push(
              {
                id: crypto.randomUUID(),
                match_id: matchId,
                player_ids: proposal.homePlayerIds,
                side: "home",
                team_id: null,
              },
              {
                id: crypto.randomUUID(),
                match_id: matchId,
                player_ids: proposal.awayPlayerIds,
                side: "away",
                team_id: null,
              },
            );
          },
        );
      });
    }

    const { error: groupsError } = await client.from("groups").insert(groupInserts);
    if (groupsError) {
      throw groupsError;
    }
    const { error: matchesError } = await client.from("matches").insert(matchInserts);
    if (matchesError) {
      throw matchesError;
    }
    const { error: sidesError } = await client.from("match_sides").insert(sideInserts);
    if (sidesError) {
      throw sidesError;
    }

    await client.from("tournaments").update({ status: "in_progress" }).eq("id", tournamentId);
  }

  async updateMatch(input: UpdateMatchInput, organizerId: string) {
    const client = this.client();
    const bundle = await loadBundle(client, input.tournamentId);
    invariant(bundle, "Torneo no encontrado.");
    createBundleHelpers(bundle).ensureOrganizer(organizerId);
    ensureMatchBelongsToTournament(bundle, input.matchId);
    const { error } = await client
      .from("matches")
      .update({
        court: input.court ?? null,
        scheduled_at: input.scheduledAt ?? null,
        status: "scheduled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.matchId);
    if (error) {
      throw error;
    }
  }

  async updateIndividualPairing(input: UpdateIndividualPairingInput, organizerId: string) {
    const client = this.client();
    const bundle = await loadBundle(client, input.tournamentId);
    invariant(bundle, "Torneo no encontrado.");
    createBundleHelpers(bundle).ensureOrganizer(organizerId);
    invariant(
      bundle.tournament.mode === "individual_ranking",
      "Solo aplica a torneos de ranking individual.",
    );
    const match = ensureMatchBelongsToTournament(bundle, input.matchId);
    const sides = getSortedMatchSides(bundle, input.matchId);
    invariant(match.status !== "validated", "No se puede cambiar la pareja de un partido validado.");
    const allPlayerIds = [
      ...input.homePlayerIds,
      ...input.awayPlayerIds,
    ];
    ensureDistinctPlayerIds(allPlayerIds, "Un jugador no puede ocupar dos plazas en el mismo partido.");
    ensureTournamentPlayers(bundle, allPlayerIds);

    const [homeSide, awaySide] = sides;
    const { error } = await client.from("match_sides").upsert([
      { id: homeSide.id, match_id: input.matchId, player_ids: input.homePlayerIds, side: "home", team_id: null },
      { id: awaySide.id, match_id: input.matchId, player_ids: input.awayPlayerIds, side: "away", team_id: null },
    ]);
    if (error) {
      throw error;
    }
  }

  async submitScore(input: SubmitScoreInput, userId: string) {
    const client = this.client();
    const bundle = await loadBundle(client, input.tournamentId);
    invariant(bundle, "Torneo no encontrado.");
    const membership = ensureAcceptedMembership(bundle, userId);
    ensureMatchBelongsToTournament(bundle, input.matchId);
    const sides = getSortedMatchSides(bundle, input.matchId);
    validateScoreSets(input.sets);
    invariant(
      membership.role === "organizer" || sides.some((side) => side.playerIds.includes(userId)),
      "No puedes reportar el resultado de este partido.",
    );

    const { data, error } = await client
      .from("score_submissions")
      .insert({
        created_at: new Date().toISOString(),
        match_id: input.matchId,
        notes: input.notes ?? null,
        sets: input.sets,
        status: "pending_review",
        submitted_by: userId,
      })
      .select("*")
      .single();
    if (error) {
      throw error;
    }

    const { error: matchError } = await client
      .from("matches")
      .update({
        status: "pending_review",
        updated_at: String(data.created_at),
      })
      .eq("id", input.matchId);
    if (matchError) {
      throw matchError;
    }
  }

  async reviewSubmission(input: ReviewSubmissionInput, organizerId: string) {
    const client = this.client();
    const bundle = await loadBundle(client, input.tournamentId);
    invariant(bundle, "Torneo no encontrado.");
    createBundleHelpers(bundle).ensureOrganizer(organizerId);

    const submission = bundle.scoreSubmissions.find((entry) => entry.id === input.submissionId);
    invariant(submission, "Resultado no encontrado.");
    const reviewedAt = new Date().toISOString();

    const { error: submissionError } = await client
      .from("score_submissions")
      .update({
        reviewed_at: reviewedAt,
        reviewed_by: organizerId,
        status: input.nextStatus,
      })
      .eq("id", input.submissionId);
    if (submissionError) {
      throw submissionError;
    }

    if (input.nextStatus === "validated") {
      await client
        .from("score_submissions")
        .update({
          reviewed_at: reviewedAt,
          reviewed_by: organizerId,
          status: "rejected",
        })
        .eq("match_id", submission.matchId)
        .eq("status", "validated")
        .neq("id", input.submissionId);

      const { error: matchError } = await client
        .from("matches")
        .update({
          status: "validated",
          updated_at: reviewedAt,
          validated_submission_id: input.submissionId,
        })
        .eq("id", submission.matchId);
      if (matchError) {
        throw matchError;
      }

      const refreshedBundle = await loadBundle(client, input.tournamentId);
      if (refreshedBundle) {
        const advance = buildKnockoutAdvancementUpdate(refreshedBundle, {
          ...submission,
          reviewedAt,
          reviewedBy: organizerId,
          status: "validated",
        });
        if (advance?.targetSideId) {
          await client
            .from("match_sides")
            .update({
              player_ids: advance.winner.playerIds,
              team_id: advance.winner.teamId ?? null,
            })
            .eq("id", advance.targetSideId);
          await client
            .from("matches")
            .update({ status: "scheduled" })
            .eq("id", advance.targetMatchId!);
        }
        if (advance?.finalizesTournament) {
          await client.from("tournaments").update({ status: "completed" }).eq("id", input.tournamentId);
        }

        const standings = createBundleHelpers(refreshedBundle).recomputeStandings();
        await client.from("standings").delete().eq("tournament_id", input.tournamentId);
        if (standings.length) {
          await client.from("standings").insert(
            standings.map((standing) => ({
              entity_id: standing.entityId,
              entity_type: standing.entityType,
              games_against: standing.gamesAgainst,
              games_for: standing.gamesFor,
              group_id: standing.groupId ?? null,
              id: standing.id,
              losses: standing.losses,
              played: standing.played,
              rank: standing.rank,
              sets_against: standing.setsAgainst,
              sets_for: standing.setsFor,
              stage_id: standing.stageId,
              tournament_id: standing.tournamentId,
              wins: standing.wins,
            })),
          );
        }
      }
    } else {
      const { error: matchError } = await client
        .from("matches")
        .update({
          status: "scheduled",
          updated_at: reviewedAt,
        })
        .eq("id", submission.matchId);
      if (matchError) {
        throw matchError;
      }
    }
  }

  async generateKnockout(tournamentId: string, organizerId: string) {
    const client = this.client();
    const bundle = await loadBundle(client, tournamentId);
    invariant(bundle, "Torneo no encontrado.");
    createBundleHelpers(bundle).ensureOrganizer(organizerId);
    invariant(bundle.tournament.mode === "fixed_pairs", "Esta acción automática solo aplica a parejas fijas.");
    const knockoutStage = bundle.stages.find((stage) => stage.type === "knockout");
    invariant(knockoutStage, "No existe fase eliminatoria.");
    invariant(
      !bundle.matches.some((match) => match.stageId === knockoutStage.id),
      "El cuadro eliminatorio ya existe.",
    );
    const entries = getQualifiedFixedEntries(bundle);
    const knockout = buildKnockoutMatches(bundle.tournament, knockoutStage, entries);

    const { error: matchesError } = await client.from("matches").insert(
      knockout.matches.map((match) => ({
        bracket_position: match.bracketPosition,
        bracket_round: match.bracketRound,
        court: match.court,
        created_at: match.createdAt,
        group_id: match.groupId,
        id: match.id,
        round_label: match.roundLabel,
        scheduled_at: match.scheduledAt,
        stage_id: match.stageId,
        status: match.status,
        tournament_id: match.tournamentId,
        updated_at: match.updatedAt,
        validated_submission_id: match.validatedSubmissionId,
      })),
    );
    if (matchesError) {
      throw matchesError;
    }

    const { error: sidesError } = await client.from("match_sides").insert(
      knockout.matchSides.map((side) => ({
        id: side.id,
        match_id: side.matchId,
        player_ids: side.playerIds,
        side: side.side,
        team_id: side.teamId ?? null,
      })),
    );
    if (sidesError) {
      throw sidesError;
    }
  }

  async configureIndividualKnockout(input: ConfigureIndividualKnockoutInput, organizerId: string) {
    const client = this.client();
    const bundle = await loadBundle(client, input.tournamentId);
    invariant(bundle, "Torneo no encontrado.");
    createBundleHelpers(bundle).ensureOrganizer(organizerId);
    invariant(bundle.tournament.mode === "individual_ranking", "Solo aplica al modo individual.");
    const knockoutStage = bundle.stages.find((stage) => stage.type === "knockout");
    invariant(knockoutStage, "No existe fase eliminatoria.");
    invariant(
      !bundle.matches.some((match) => match.stageId === knockoutStage.id),
      "La eliminatoria ya fue creada.",
    );
    const playerIds = input.pairs.flatMap((pair) => pair.playerIds);
    ensureDistinctPlayerIds(playerIds, "No puedes repetir jugadores en distintas parejas.");
    ensureTournamentPlayers(bundle, playerIds);

    const knockout = buildKnockoutMatches(
      bundle.tournament,
      knockoutStage,
      input.pairs.map((pair) => ({ label: pair.label, playerIds: pair.playerIds })),
    );

    const { error: matchesError } = await client.from("matches").insert(
      knockout.matches.map((match) => ({
        bracket_position: match.bracketPosition,
        bracket_round: match.bracketRound,
        court: match.court,
        created_at: match.createdAt,
        group_id: match.groupId,
        id: match.id,
        round_label: match.roundLabel,
        scheduled_at: match.scheduledAt,
        stage_id: match.stageId,
        status: match.status,
        tournament_id: match.tournamentId,
        updated_at: match.updatedAt,
        validated_submission_id: match.validatedSubmissionId,
      })),
    );
    if (matchesError) {
      throw matchesError;
    }

    const { error: sidesError } = await client.from("match_sides").insert(
      knockout.matchSides.map((side) => ({
        id: side.id,
        match_id: side.matchId,
        player_ids: side.playerIds,
        side: side.side,
        team_id: side.teamId ?? null,
      })),
    );
    if (sidesError) {
      throw sidesError;
    }
  }

  async rejectInvitation(invitationId: string, _userId: string) {
    const client = this.client();
    const { error } = await client
      .from("invitations")
      .update({ status: "rejected" })
      .eq("id", invitationId)
      .eq("status", "pending");
    if (error) throw error;
  }

  async publishTournament(tournamentId: string, organizerId: string) {
    const client = this.client();
    const { error } = await client
      .from("tournaments")
      .update({ status: "published" })
      .eq("id", tournamentId)
      .eq("organizer_id", organizerId)
      .eq("status", "draft");
    if (error) throw error;
  }

  async cancelTournament(tournamentId: string, organizerId: string) {
    const client = this.client();
    const { error } = await client
      .from("tournaments")
      .update({ status: "cancelled" })
      .eq("id", tournamentId)
      .eq("organizer_id", organizerId);
    if (error) throw error;
  }

  async proposeResult(input: ProposeResultInput, userId: string) {
    const client = this.client();

    const { error: proposalError } = await client.from("match_result_proposals").insert({
      match_id: input.matchId,
      proposed_by: userId,
      score_json: input.sets,
      winner_side: input.winnerSide,
      notes: input.notes ?? null,
      status: "pending",
    });
    if (proposalError) throw proposalError;

    const { error: matchError } = await client
      .from("matches")
      .update({ status: "result_proposed", updated_at: new Date().toISOString() })
      .eq("id", input.matchId);
    if (matchError) throw matchError;
  }

  async validateResult(input: ValidateResultInput, userId: string) {
    const client = this.client();

    const { error: validationError } = await client.from("match_result_validations").insert({
      proposal_id: input.proposalId,
      validator_id: userId,
      decision: input.decision,
      reason: input.reason ?? null,
    });
    if (validationError) throw validationError;

    // Get the proposal to find the match
    const { data: proposal, error: proposalFetchError } = await client
      .from("match_result_proposals")
      .select("id, match_id")
      .eq("id", input.proposalId)
      .single();
    if (proposalFetchError) throw proposalFetchError;

    if (input.decision === "accept") {
      await client
        .from("match_result_proposals")
        .update({ status: "accepted" })
        .eq("id", input.proposalId);
      await client
        .from("matches")
        .update({ status: "validated", updated_at: new Date().toISOString() })
        .eq("id", proposal.match_id);
    } else {
      await client
        .from("match_result_proposals")
        .update({ status: "rejected" })
        .eq("id", input.proposalId);
      await client
        .from("matches")
        .update({ status: "in_dispute", updated_at: new Date().toISOString() })
        .eq("id", proposal.match_id);
    }
  }

  async resolveDispute(input: ResolveDisputeInput, organizerId: string) {
    const client = this.client();

    // Insert override proposal
    const { error: proposalError } = await client.from("match_result_proposals").insert({
      match_id: input.matchId,
      proposed_by: organizerId,
      score_json: input.sets,
      winner_side: input.winnerSide,
      notes: input.reason,
      status: "overridden",
    });
    if (proposalError) throw proposalError;

    // Update match to validated
    const { error: matchError } = await client
      .from("matches")
      .update({ status: "validated", updated_at: new Date().toISOString() })
      .eq("id", input.matchId);
    if (matchError) throw matchError;

    // Audit log
    const admin = createSupabaseAdminClient();
    if (admin) {
      await admin.from("audit_log").insert({
        actor_id: organizerId,
        entity_type: "match",
        entity_id: input.matchId,
        action: "resolve_dispute",
        payload: { sets: input.sets, winnerSide: input.winnerSide, reason: input.reason },
      });
    }
  }

  async closeMatch(matchId: string, _organizerId: string) {
    const client = this.client();
    const { error } = await client
      .from("matches")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", matchId)
      .eq("status", "validated");
    if (error) throw error;
  }

  async updateProfile(input: UpdateProfileInput, userId: string) {
    const client = this.client();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.fullName !== undefined) updates.full_name = input.fullName;
    if (input.username !== undefined) updates.username = input.username;
    if (input.city !== undefined) updates.city = input.city;
    if (input.level !== undefined) updates.level = input.level;
    if (input.dominantHand !== undefined) updates.dominant_hand = input.dominantHand;

    const { error } = await client.from("profiles").update(updates).eq("id", userId);
    if (error) throw error;
  }

  async createClub(input: CreateClubInput, userId: string): Promise<Club> {
    const client = this.client();
    const slug = `${slugify(input.name)}-${Math.random().toString(36).slice(2, 7)}`;
    const { data, error } = await client
      .from("clubs")
      .insert({
        name: input.name,
        slug,
        description: input.description ?? null,
        created_by: userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return {
      id: String(data.id),
      name: String(data.name),
      slug: String(data.slug),
      description: (data.description as string | null) ?? null,
      logoPath: null,
      createdBy: String(data.created_by),
      createdAt: String(data.created_at),
    };
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const client = this.client();
    const { data, error } = await client
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      type: String(row.type),
      title: String(row.title),
      body: (row.body as string | null) ?? null,
      data: (row.data as Record<string, unknown> | null) ?? null,
      read: Boolean(row.read),
      createdAt: String(row.created_at),
    }));
  }

  async markNotificationRead(notificationId: string, userId: string) {
    const client = this.client();
    const { error } = await client
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  async markAllNotificationsRead(userId: string) {
    const client = this.client();
    const { error } = await client
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) throw error;
  }

  async expireInvitations(): Promise<number> {
    const admin = createSupabaseAdminClient();
    if (!admin) return 0;
    const { data, error } = await admin
      .from("invitations")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString())
      .select("id");
    if (error) throw error;
    return data?.length ?? 0;
  }

  async assignVariablePairs(_input: AssignVariablePairsInput, _organizerId: string) {
    throw new Error("Variable pair assignment via Supabase is not yet implemented.");
  }
}
