import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface InvitationRow {
  id: string;
  tournament_id: string;
  token: string;
  status: string;
  invited_email: string | null;
  invited_user_id: string | null;
  message: string | null;
  expires_at: string | null;
  created_at: string;
  // joined
  tournaments?: { name: string; format: string; status: string; slug: string };
}

function client() {
  const c = createSupabaseAdminClient();
  if (!c) throw new Error("Supabase admin no configurado");
  return c;
}

// Send invitation (by organizer)
export async function sendInvitation(params: {
  tournamentId: string;
  invitedEmail?: string;
  message?: string;
  expiresInDays?: number;
}): Promise<InvitationRow> {
  const sb = client();
  const token = crypto.randomUUID();
  const expiresAt = params.expiresInDays
    ? new Date(Date.now() + params.expiresInDays * 86400000).toISOString()
    : null;

  const { data, error } = await sb
    .from("invitations")
    .insert({
      tournament_id: params.tournamentId,
      token,
      status: "pending",
      invited_email: params.invitedEmail ?? null,
      message: params.message ?? null,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// List invitations received by a user (by email match or direct user_id)
export async function listReceivedInvitations(
  userId: string,
  userEmail: string,
): Promise<InvitationRow[]> {
  const sb = client();
  const { data, error } = await sb
    .from("invitations")
    .select("*, tournaments(name, format, status, slug)")
    .or(`invited_email.eq.${userEmail},invited_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// List invitations sent for a tournament (by organizer)
export async function listSentInvitations(
  tournamentId: string,
): Promise<InvitationRow[]> {
  const sb = client();
  const { data, error } = await sb
    .from("invitations")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Accept invitation
export async function acceptInvitation(
  token: string,
  userId: string,
): Promise<void> {
  const sb = client();

  // Get invitation
  const { data: invitation, error: fetchError } = await sb
    .from("invitations")
    .select("*")
    .eq("token", token)
    .single();

  if (fetchError || !invitation) throw new Error("Invitacion no encontrada");
  if (invitation.status !== "pending")
    throw new Error("Esta invitacion ya fue respondida");
  if (
    invitation.expires_at &&
    new Date(invitation.expires_at) < new Date()
  ) {
    await sb
      .from("invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id);
    throw new Error("Esta invitacion ha caducado");
  }

  // Update invitation status
  const { error: updateError } = await sb
    .from("invitations")
    .update({ status: "accepted", invited_user_id: userId })
    .eq("id", invitation.id);
  if (updateError) throw updateError;

  // Create tournament membership
  const { error: memberError } = await sb
    .from("tournament_memberships")
    .upsert(
      {
        tournament_id: invitation.tournament_id,
        user_id: userId,
        role: "player",
        status: "confirmed",
      },
      { onConflict: "tournament_id,user_id" },
    );
  if (memberError) throw memberError;
}

// Reject invitation
export async function rejectInvitation(
  token: string,
  userId: string,
): Promise<void> {
  const sb = client();
  const { error } = await sb
    .from("invitations")
    .update({ status: "rejected", invited_user_id: userId })
    .eq("token", token)
    .eq("status", "pending");
  if (error) throw error;
}

// Revoke invitation (by organizer)
export async function revokeInvitation(invitationId: string): Promise<void> {
  const sb = client();
  const { error } = await sb
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("status", "pending");
  if (error) throw error;
}

// Get invitation by token (for public invite page)
export async function getInvitationByToken(
  token: string,
): Promise<InvitationRow | null> {
  const sb = client();
  const { data, error } = await sb
    .from("invitations")
    .select("*, tournaments(name, format, status, slug)")
    .eq("token", token)
    .single();
  if (error) return null;
  return data;
}
