"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/session";
import {
  addPlayer,
  clearMatchScore,
  createEvent,
  deleteEvent,
  generateAmericanoSchedule,
  recordMatchScore,
  removePlayer,
} from "@/lib/repositories/event-repository";

function parsePlayerNames(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export async function createEventAction(formData: FormData) {
  const user = await requireCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  const format = String(formData.get("format") ?? "americano") as "americano" | "mexicano";
  const courts = Math.max(1, Number(formData.get("courts") ?? 1));
  const pointsPerMatch = Math.max(1, Number(formData.get("pointsPerMatch") ?? 24));
  const playerNames = parsePlayerNames(String(formData.get("players") ?? ""));

  if (!name) {
    throw new Error("El nombre del evento es obligatorio");
  }
  if (playerNames.length < 4) {
    throw new Error("Necesitas al menos 4 jugadores");
  }

  const event = await createEvent({
    name,
    format,
    courts,
    pointsPerMatch,
    organizerId: user.id,
    playerNames,
  });

  const autoGenerate = String(formData.get("autoGenerate") ?? "on") === "on";
  if (autoGenerate) {
    await generateAmericanoSchedule(event.id);
  }

  redirect(`/app/events/${event.id}`);
}

export async function addPlayerAction(formData: FormData) {
  await requireCurrentUser();
  const eventId = String(formData.get("eventId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await addPlayer(eventId, name);
  revalidatePath(`/app/events/${eventId}`);
}

export async function removePlayerAction(formData: FormData) {
  await requireCurrentUser();
  const eventId = String(formData.get("eventId"));
  const playerId = String(formData.get("playerId"));
  await removePlayer(playerId);
  revalidatePath(`/app/events/${eventId}`);
}

export async function generateScheduleAction(formData: FormData) {
  await requireCurrentUser();
  const eventId = String(formData.get("eventId"));
  await generateAmericanoSchedule(eventId);
  revalidatePath(`/app/events/${eventId}`);
}

export async function recordScoreAction(formData: FormData) {
  await requireCurrentUser();
  const eventId = String(formData.get("eventId"));
  const matchId = String(formData.get("matchId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));

  if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    throw new Error("Marcador inválido");
  }

  await recordMatchScore(matchId, homeScore, awayScore);
  revalidatePath(`/app/events/${eventId}`);
}

export async function clearScoreAction(formData: FormData) {
  await requireCurrentUser();
  const eventId = String(formData.get("eventId"));
  const matchId = String(formData.get("matchId"));
  await clearMatchScore(matchId);
  revalidatePath(`/app/events/${eventId}`);
}

export async function deleteEventAction(formData: FormData) {
  await requireCurrentUser();
  const eventId = String(formData.get("eventId"));
  await deleteEvent(eventId);
  redirect("/app");
}
