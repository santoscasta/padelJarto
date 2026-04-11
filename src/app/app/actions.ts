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
  format: z.enum(["league", "playoff", "league_playoff"]).default("league_playoff"),
  groupCount: z.coerce.number().int().min(1).max(8),
  knockoutSize: z.coerce.number().int().min(2).max(8),
  location: z.string().optional(),
  mode: z.enum(["fixed_pairs", "individual_ranking"]),
  name: z.string().min(3),
  pairMode: z.enum(["fixed", "variable"]).default("fixed"),
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
    format: formData.get("format") ?? "league_playoff",
    groupCount: formData.get("groupCount"),
    knockoutSize: formData.get("knockoutSize"),
    location: formData.get("location"),
    mode: formData.get("mode"),
    name: formData.get("name"),
    pairMode: formData.get("pairMode") ?? "fixed",
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
  const invitedEmail = String(formData.get("invitedEmail") ?? "").trim().toLowerCase() || undefined;

  const invitation = await repository.createInvitation(
    {
      invitedEmail,
      tournamentId,
    },
    currentUser.id,
  );

  // If an email was provided, ask Supabase to send an invite email linking to
  // the invitation acceptance URL. Non-fatal: if sending fails we still keep
  // the invitation so the organizer can share the link manually.
  if (invitedEmail) {
    const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
    const { getAppUrl } = await import("@/lib/env");
    const admin = createSupabaseAdminClient();
    if (admin) {
      const redirectTo = `${getAppUrl()}/invite/${invitation.token}`;
      try {
        await admin.auth.admin.inviteUserByEmail(invitedEmail, { redirectTo });
      } catch {
        // swallow: keep the invitation anyway
      }
    }
  }

  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function createWhatsAppInvitationAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  const invitation = await repository.createInvitation(
    {
      tournamentId,
    },
    currentUser.id,
  );

  redirect(`/app/tournaments/${tournamentId}?share=${encodeURIComponent(invitation.token)}`);
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

export async function rejectInvitationAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  await repository.rejectInvitation(
    String(formData.get("invitationId")),
    currentUser.id,
  );
  revalidatePath("/app");
}

export async function publishTournamentAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  await repository.publishTournament(tournamentId, currentUser.id);
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function cancelTournamentAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  await repository.cancelTournament(tournamentId, currentUser.id);
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function proposeResultAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  const matchId = String(formData.get("matchId"));
  const winnerSide = String(formData.get("winnerSide")) as "home" | "away";
  const sets = parseScoreSets(formData);
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  await repository.proposeResult(
    { tournamentId, matchId, sets, winnerSide, notes },
    currentUser.id,
  );
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function validateResultAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  const proposalId = String(formData.get("proposalId"));
  const decision = String(formData.get("decision")) as "accept" | "reject";
  const reason = String(formData.get("reason") ?? "").trim() || undefined;

  await repository.validateResult(
    { tournamentId, proposalId, decision, reason },
    currentUser.id,
  );
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function resolveDisputeAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  const matchId = String(formData.get("matchId"));
  const winnerSide = String(formData.get("winnerSide")) as "home" | "away";
  const sets = parseScoreSets(formData);
  const reason = String(formData.get("reason") ?? "").trim();

  await repository.resolveDispute(
    { tournamentId, matchId, sets, winnerSide, reason },
    currentUser.id,
  );
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function closeMatchAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  const tournamentId = String(formData.get("tournamentId"));
  const matchId = String(formData.get("matchId"));
  await repository.closeMatch(matchId, currentUser.id);
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function updateProfileAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  await repository.updateProfile(
    {
      fullName: String(formData.get("fullName") ?? "").trim() || undefined,
      username: String(formData.get("username") ?? "").trim() || undefined,
      city: String(formData.get("city") ?? "").trim() || undefined,
      level: String(formData.get("level") ?? "").trim() || undefined,
      dominantHand: (formData.get("dominantHand") as "right" | "left" | "ambidextrous" | undefined) || undefined,
      club: String(formData.get("club") ?? "").trim() || undefined,
      bio: String(formData.get("bio") ?? "").trim() || undefined,
    },
    currentUser.id,
  );
  revalidatePath("/app/profile");
  revalidatePath("/app");
}

export async function markNotificationReadAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  await repository.markNotificationRead(
    String(formData.get("notificationId")),
    currentUser.id,
  );
  revalidatePath("/app");
}

export async function markAllNotificationsReadAction() {
  const currentUser = await requireCurrentUser();
  const repository = getTournamentRepository();
  await repository.markAllNotificationsRead(currentUser.id);
  revalidatePath("/app");
}
