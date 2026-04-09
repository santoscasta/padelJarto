import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildAmericanoSchedule, type AmericanoPlayer } from "@/lib/domain/americano";

export interface EventRow {
  id: string;
  slug: string;
  name: string;
  format: "americano" | "mexicano";
  courts: number;
  pointsPerMatch: number;
  organizerId: string | null;
  status: "draft" | "live" | "completed";
  createdAt: string;
}

export interface EventPlayerRow {
  id: string;
  eventId: string;
  name: string;
  position: number;
}

export interface EventMatchRow {
  id: string;
  eventId: string;
  roundNumber: number;
  court: number;
  homePlayer1: string | null;
  homePlayer2: string | null;
  awayPlayer1: string | null;
  awayPlayer2: string | null;
  homeScore: number | null;
  awayScore: number | null;
  completed: boolean;
}

export interface EventBundle {
  event: EventRow;
  players: EventPlayerRow[];
  matches: EventMatchRow[];
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "evento"
  );
}

function randomSuffix(len = 5): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

function client() {
  const c = createSupabaseAdminClient();
  if (!c) throw new Error("Supabase admin no configurado");
  return c;
}

function mapEvent(row: Record<string, unknown>): EventRow {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    format: row.format as "americano" | "mexicano",
    courts: row.courts as number,
    pointsPerMatch: row.points_per_match as number,
    organizerId: (row.organizer_id as string | null) ?? null,
    status: row.status as "draft" | "live" | "completed",
    createdAt: row.created_at as string,
  };
}

function mapPlayer(row: Record<string, unknown>): EventPlayerRow {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    name: row.name as string,
    position: row.position as number,
  };
}

function mapMatch(row: Record<string, unknown>): EventMatchRow {
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    roundNumber: row.round_number as number,
    court: row.court as number,
    homePlayer1: (row.home_player_1 as string | null) ?? null,
    homePlayer2: (row.home_player_2 as string | null) ?? null,
    awayPlayer1: (row.away_player_1 as string | null) ?? null,
    awayPlayer2: (row.away_player_2 as string | null) ?? null,
    homeScore: (row.home_score as number | null) ?? null,
    awayScore: (row.away_score as number | null) ?? null,
    completed: Boolean(row.completed),
  };
}

export async function createEvent(input: {
  name: string;
  format: "americano" | "mexicano";
  courts: number;
  pointsPerMatch: number;
  organizerId: string;
  playerNames: string[];
}): Promise<EventRow> {
  const c = client();
  const slug = `${slugify(input.name)}-${randomSuffix()}`;
  const { data, error } = await c
    .from("events")
    .insert({
      slug,
      name: input.name,
      format: input.format,
      courts: input.courts,
      points_per_match: input.pointsPerMatch,
      organizer_id: input.organizerId,
      status: "draft",
    })
    .select()
    .single();
  if (error) throw error;
  const event = mapEvent(data);

  if (input.playerNames.length) {
    const { error: playersError } = await c.from("event_players").insert(
      input.playerNames.map((name, index) => ({
        event_id: event.id,
        name: name.trim(),
        position: index + 1,
      })),
    );
    if (playersError) throw playersError;
  }

  return event;
}

export async function listEventsByOrganizer(organizerId: string): Promise<EventRow[]> {
  const c = client();
  const { data, error } = await c
    .from("events")
    .select("*")
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

export async function getEventBundleById(id: string): Promise<EventBundle | null> {
  const c = client();
  const { data: eventRow, error: eventError } = await c
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (eventError) throw eventError;
  if (!eventRow) return null;

  const [{ data: players }, { data: matches }] = await Promise.all([
    c.from("event_players").select("*").eq("event_id", id).order("position"),
    c
      .from("event_matches")
      .select("*")
      .eq("event_id", id)
      .order("round_number")
      .order("court"),
  ]);

  return {
    event: mapEvent(eventRow),
    players: (players ?? []).map(mapPlayer),
    matches: (matches ?? []).map(mapMatch),
  };
}

export async function getEventBundleBySlug(slug: string): Promise<EventBundle | null> {
  const c = client();
  const { data: eventRow, error } = await c
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!eventRow) return null;
  return getEventBundleById(eventRow.id as string);
}

export async function addPlayer(eventId: string, name: string): Promise<void> {
  const c = client();
  const { data: existing } = await c
    .from("event_players")
    .select("position")
    .eq("event_id", eventId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = (existing?.[0]?.position as number | undefined) ?? 0;
  const { error } = await c
    .from("event_players")
    .insert({ event_id: eventId, name: name.trim(), position: nextPosition + 1 });
  if (error) throw error;
}

export async function removePlayer(playerId: string): Promise<void> {
  const c = client();
  const { error } = await c.from("event_players").delete().eq("id", playerId);
  if (error) throw error;
}

export async function generateAmericanoSchedule(eventId: string): Promise<void> {
  const c = client();
  const bundle = await getEventBundleById(eventId);
  if (!bundle) throw new Error("Evento no encontrado");
  if (bundle.players.length < 4) throw new Error("Necesitas al menos 4 jugadores");

  // Clear existing matches
  await c.from("event_matches").delete().eq("event_id", eventId);

  const players: AmericanoPlayer[] = bundle.players.map((player) => ({
    id: player.id,
    name: player.name,
  }));
  const schedule = buildAmericanoSchedule({ players, courts: bundle.event.courts });

  if (schedule.matches.length) {
    const { error } = await c.from("event_matches").insert(
      schedule.matches.map((match) => ({
        event_id: eventId,
        round_number: match.roundNumber,
        court: match.court,
        home_player_1: match.home[0],
        home_player_2: match.home[1],
        away_player_1: match.away[0],
        away_player_2: match.away[1],
      })),
    );
    if (error) throw error;
  }

  await c
    .from("events")
    .update({ status: "live", updated_at: new Date().toISOString() })
    .eq("id", eventId);
}

export async function recordMatchScore(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  const c = client();
  const { error } = await c
    .from("event_matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchId);
  if (error) throw error;
}

export async function clearMatchScore(matchId: string): Promise<void> {
  const c = client();
  const { error } = await c
    .from("event_matches")
    .update({ home_score: null, away_score: null, completed: false })
    .eq("id", matchId);
  if (error) throw error;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const c = client();
  const { error } = await c.from("events").delete().eq("id", eventId);
  if (error) throw error;
}
