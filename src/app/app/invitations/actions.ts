"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth/session";
import {
  sendInvitation,
  acceptInvitation,
  rejectInvitation,
  revokeInvitation,
} from "@/lib/repositories/invitation-repository";

export async function sendInvitationAction(formData: FormData) {
  await requireCurrentUser();
  const tournamentId = formData.get("tournamentId") as string;
  const email = formData.get("email") as string;
  const message = formData.get("message") as string | null;

  if (!tournamentId || !email) throw new Error("Datos incompletos");

  await sendInvitation({
    tournamentId,
    invitedEmail: email,
    message: message || undefined,
    expiresInDays: 7,
  });

  revalidatePath("/app/invitations");
  revalidatePath(`/app/tournaments/${tournamentId}`);
}

export async function acceptInvitationAction(formData: FormData) {
  const user = await requireCurrentUser();
  const token = formData.get("token") as string;
  if (!token) throw new Error("Token no proporcionado");

  await acceptInvitation(token, user.id);
  revalidatePath("/app/invitations");
  revalidatePath("/app");
}

export async function rejectInvitationAction(formData: FormData) {
  const user = await requireCurrentUser();
  const token = formData.get("token") as string;
  if (!token) throw new Error("Token no proporcionado");

  await rejectInvitation(token, user.id);
  revalidatePath("/app/invitations");
}

export async function revokeInvitationAction(formData: FormData) {
  await requireCurrentUser();
  const invitationId = formData.get("invitationId") as string;
  if (!invitationId) throw new Error("ID no proporcionado");

  await revokeInvitation(invitationId);
  revalidatePath("/app/invitations");
}
