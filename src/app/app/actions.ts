"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/session";
import type {
  ConfigureIndividualKnockoutInput,
  ScoreSet,
} from "@/lib/domain/types";
import { getTournamentRepository } from "@/lib/repositories";

const createTournamentSchema = z.object({
  endsAt: z.string().min(1),
  groupCount: z.coerce.number().int().min(1).max(8),
  knockoutSize: z.coerce.number().int().min(2).max(8),
  location: z.string().optional(),
  mode: z.enum(["fixed_pairs", "individual_ranking"]),
  name: z.string().min(3),
  qualifiersPerGroup: z.coerce.number().int().min(1).max(8),
  startsAt: z.string().min(1),
});

function parseDateTimeField(value: FormDataEntryValue | null) {
  if (!value) {
    return undefined;
  }

  return new Date(String(value)).toISOString();
}

function parseScoreSets(formData: FormData) {
  const sets: ScoreSet[] = [];

  for (let index = 1; index <= 3; index += 1) {
    const homeValue = formData.get(`set${index}Home`);
    const awayValue = formData.get(`set${index}Away`);
    const tiebreakHomeValue = formData.get(`set${index}TiebreakHome`);
    const tiebreakAwayValue = formData.get(`set${index}TiebreakAway`);

    if (!homeValue || !awayValue || String(homeValue) === "" || String(awayValue) === "") {
      continue;
    }

    sets.push({
      away: Number(awayValue),
      home: Number(homeValue),
      tiebreakAway:
        tiebreakAwayValue && String(tiebreakAwayValue) !== ""
          ? Number(tiebreakAwayValue)
          : null,
      tiebreakHome:
        tiebreakHomeValue && String(tiebreakHomeValue) !== ""
          ? Number(tiebreakHomeValue)
          : null,
    });
  }

  if (sets.length < 2) {
    throw new Error("Introduce al menos dos sets.");
  }

  return sets;
}

export async function createTournamentAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const parsed = createTournamentSchema.parse({
    endsAt: formData.get("endsAt"),
    groupCount: formData.get("groupCount"),
    knockoutSize: formData.get("knockoutSize"),
    location: formData.get("location"),
    mode: formData.get("mode"),
    name: formData.get("name"),
    qualifiersPerGroup: formData.get("qualifiersPerGroup"),
    startsAt: formData.get("startsAt"),
  });
  const tournament = await repository.createTournament(
    {
      ...parsed,
      location: parsed.location || undefined,
      startsAt: new Date(parsed.startsAt).toISOString(),
      endsAt: new Date(parsed.endsAt).toISOString(),
    },
    currentUser,
  );

  redirect(`/app/tournaments/${tournament.id}`);
}

export async function createInvitationAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  await repository.createInvitation(
    {
      invitedEmail: String(formData.get("invitedEmail") ?? "").trim() || undefined,
      tournamentId,
    },
    currentUser.id,
  );

  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function createTeamAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  await repository.createTeam(
    {
      name: String(formData.get("name")),
      playerIds: [
        String(formData.get("player1Id")),
        String(formData.get("player2Id")),
      ],
      tournamentId,
    },
    currentUser.id,
  );
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function generateGroupStageAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  await repository.generateGroupStage(tournamentId, currentUser.id);
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function updateMatchAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  await repository.updateMatch(
    {
      court: String(formData.get("court") ?? "").trim() || undefined,
      matchId: String(formData.get("matchId")),
      scheduledAt: parseDateTimeField(formData.get("scheduledAt")),
      tournamentId,
    },
    currentUser.id,
  );
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function updateIndividualPairingAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  await repository.updateIndividualPairing(
    {
      awayPlayerIds: [
        String(formData.get("awayPlayer1Id")),
        String(formData.get("awayPlayer2Id")),
      ],
      homePlayerIds: [
        String(formData.get("homePlayer1Id")),
        String(formData.get("homePlayer2Id")),
      ],
      matchId: String(formData.get("matchId")),
      tournamentId,
    },
    currentUser.id,
  );
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function submitScoreAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  await repository.submitScore(
    {
      matchId: String(formData.get("matchId")),
      notes: String(formData.get("notes") ?? "").trim() || undefined,
      sets: parseScoreSets(formData),
      tournamentId,
    },
    currentUser.id,
  );
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function reviewSubmissionAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  await repository.reviewSubmission(
    {
      nextStatus:
        String(formData.get("nextStatus")) === "rejected" ? "rejected" : "validated",
      submissionId: String(formData.get("submissionId")),
      tournamentId,
    },
    currentUser.id,
  );
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function generateKnockoutAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  await repository.generateKnockout(tournamentId, currentUser.id);
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function configureIndividualKnockoutAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  const pairCount = Number(formData.get("pairCount") ?? 0);
  const payload: ConfigureIndividualKnockoutInput = {
    pairs: Array.from({ length: pairCount }, (_, index) => ({
      label: String(formData.get(`pair${index}Label`) ?? `Pareja ${index + 1}`),
      playerIds: [
        String(formData.get(`pair${index}Player1`)),
        String(formData.get(`pair${index}Player2`)),
      ],
    })),
    tournamentId,
  };

  await repository.configureIndividualKnockout(payload, currentUser.id);
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function acceptInvitationAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = await repository.acceptInvitation(
    String(formData.get("token")),
    currentUser,
  );
  redirect(`/app/tournaments/${tournamentId}`);
}
