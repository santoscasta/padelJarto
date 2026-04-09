"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  computeAmericanoStandings,
  type AmericanoStanding,
} from "@/lib/domain/americano";
import type {
  EventBundle,
  EventMatchRow,
  EventPlayerRow,
} from "@/lib/repositories/event-repository";
import {
  addPlayerAction,
  clearScoreAction,
  deleteEventAction,
  generateScheduleAction,
  recordScoreAction,
  removePlayerAction,
} from "@/app/app/events/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function playerName(players: EventPlayerRow[], id: string | null): string {
  if (!id) return "—";
  return players.find((player) => player.id === id)?.name ?? "—";
}

function groupMatchesByRound(matches: EventMatchRow[]): Map<number, EventMatchRow[]> {
  const byRound = new Map<number, EventMatchRow[]>();
  for (const match of matches) {
    const list = byRound.get(match.roundNumber) ?? [];
    list.push(match);
    byRound.set(match.roundNumber, list);
  }
  return byRound;
}

export function EventBoard({ initialBundle }: Readonly<{ initialBundle: EventBundle }>) {
  const router = useRouter();
  useRealtimeEventRefresh(initialBundle.event.id, () => router.refresh());

  const standings = useMemo<AmericanoStanding[]>(() => {
    return computeAmericanoStandings(
      initialBundle.players.map((player) => ({ id: player.id, name: player.name })),
      initialBundle.matches
        .filter(
          (match) =>
            match.homePlayer1 && match.homePlayer2 && match.awayPlayer1 && match.awayPlayer2,
        )
        .map((match) => ({
          home: [match.homePlayer1!, match.homePlayer2!],
          away: [match.awayPlayer1!, match.awayPlayer2!],
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          completed: match.completed,
        })),
    );
  }, [initialBundle]);

  const roundsMap = useMemo(
    () => groupMatchesByRound(initialBundle.matches),
    [initialBundle.matches],
  );
  const roundNumbers = useMemo(
    () => [...roundsMap.keys()].sort((a, b) => a - b),
    [roundsMap],
  );

  const [currentRound, setCurrentRound] = useState<number>(roundNumbers[0] ?? 1);
  const publicUrl =
    typeof window !== "undefined" ? `${window.location.origin}/t/${initialBundle.event.slug}` : "";

  return (
    <div className="space-y-6">
      <Card className="surface-grid">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-[family:var(--font-display)] text-4xl tracking-tight">
                {initialBundle.event.name}
              </h1>
              <Badge>{initialBundle.event.format === "americano" ? "Americano" : "Mexicano"}</Badge>
              <Badge className="border-white/10 bg-white/5 text-[#fff7ed]">
                {initialBundle.event.courts} {initialBundle.event.courts === 1 ? "pista" : "pistas"}
              </Badge>
              <Badge className="border-white/10 bg-white/5 text-[#fff7ed]">
                {initialBundle.event.pointsPerMatch} pts
              </Badge>
              <Badge className="border-white/10 bg-white/5 text-[#fff7ed] capitalize">
                {initialBundle.event.status}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-[#d6d3d1]">
              Comparte el enlace público con los jugadores o proyéctalo en la TV del club.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href={`/t/${initialBundle.event.slug}`} target="_blank">
                Abrir vista pública
              </Link>
            </Button>
            <form action={deleteEventAction}>
              <input name="eventId" type="hidden" value={initialBundle.event.id} />
              <Button type="submit" variant="ghost">
                Eliminar evento
              </Button>
            </form>
          </div>
        </div>
        {publicUrl ? (
          <p className="mt-5 break-all rounded-[20px] border border-white/10 bg-black/25 px-4 py-3 text-xs text-[#a8a29e]">
            {publicUrl}
          </p>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Clasificación en vivo</p>
          <StandingsList standings={standings} />
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Jugadores</p>
            <span className="text-xs text-[#a8a29e]">{initialBundle.players.length} jugadores</span>
          </div>
          <PlayersSection
            eventId={initialBundle.event.id}
            players={initialBundle.players}
          />
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Rondas</p>
            <h2 className="mt-2 font-[family:var(--font-display)] text-3xl tracking-tight">
              Calendario
            </h2>
          </div>
          <form action={generateScheduleAction}>
            <input name="eventId" type="hidden" value={initialBundle.event.id} />
            <Button type="submit" variant="secondary">
              Regenerar calendario
            </Button>
          </form>
        </div>

        {roundNumbers.length === 0 ? (
          <p className="mt-4 rounded-[20px] border border-dashed border-white/15 bg-black/10 p-6 text-sm text-[#d6d3d1]">
            No hay rondas generadas. Añade jugadores y pulsa Regenerar.
          </p>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              {roundNumbers.map((round) => (
                <button
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                    currentRound === round
                      ? "border-[#f97316] bg-[#f97316] text-[#1c1917]"
                      : "border-white/10 bg-white/5 text-[#d6d3d1] hover:bg-white/10"
                  }`}
                  key={round}
                  onClick={() => setCurrentRound(round)}
                  type="button"
                >
                  Ronda {round}
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {(roundsMap.get(currentRound) ?? []).map((match) => (
                <MatchCard
                  eventId={initialBundle.event.id}
                  key={match.id}
                  match={match}
                  players={initialBundle.players}
                />
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function useRealtimeEventRefresh(eventId: string, onChange: () => void) {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`event:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_matches", filter: `event_id=eq.${eventId}` },
        onChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_players", filter: `event_id=eq.${eventId}` },
        onChange,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);
}

function StandingsList({ standings }: Readonly<{ standings: AmericanoStanding[] }>) {
  if (!standings.length) {
    return (
      <p className="mt-4 text-sm text-[#d6d3d1]">Aún no hay jugadores. Añádelos para empezar.</p>
    );
  }
  return (
    <ol className="mt-4 space-y-2">
      {standings.map((row, index) => (
        <li
          className="flex items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3"
          key={row.playerId}
        >
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#f97316] text-sm font-black text-[#1c1917]">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-[#fff7ed]">{row.name}</p>
              <p className="text-xs text-[#a8a29e]">
                {row.played} partidos · diff {row.diff >= 0 ? "+" : ""}
                {row.diff}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-[#fdba74]">{row.pointsFor}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#a8a29e]">puntos</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function PlayersSection({
  eventId,
  players,
}: Readonly<{ eventId: string; players: EventPlayerRow[] }>) {
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");

  return (
    <div className="mt-4 space-y-3">
      <form
        action={(formData) => {
          startTransition(async () => {
            await addPlayerAction(formData);
            setNewName("");
          });
        }}
        className="flex gap-2"
      >
        <input name="eventId" type="hidden" value={eventId} />
        <input
          className="field-input flex-1"
          name="name"
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nuevo jugador"
          value={newName}
        />
        <Button disabled={isPending} type="submit" variant="secondary">
          Añadir
        </Button>
      </form>

      <ul className="grid gap-2 sm:grid-cols-2">
        {players.map((player) => (
          <li
            className="flex items-center justify-between gap-3 rounded-[16px] border border-white/10 bg-black/15 px-3 py-2 text-sm"
            key={player.id}
          >
            <span className="font-medium text-[#fff7ed]">
              {player.position}. {player.name}
            </span>
            <form action={removePlayerAction}>
              <input name="eventId" type="hidden" value={eventId} />
              <input name="playerId" type="hidden" value={player.id} />
              <button
                className="text-xs text-[#a8a29e] hover:text-[#fecaca]"
                type="submit"
              >
                Quitar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MatchCard({
  eventId,
  match,
  players,
}: Readonly<{ eventId: string; match: EventMatchRow; players: EventPlayerRow[] }>) {
  const home = `${playerName(players, match.homePlayer1)} / ${playerName(players, match.homePlayer2)}`;
  const away = `${playerName(players, match.awayPlayer1)} / ${playerName(players, match.awayPlayer2)}`;

  return (
    <article className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <Badge className="border-white/10 bg-white/5 text-[#fff7ed]">Pista {match.court}</Badge>
        {match.completed ? <Badge>Final</Badge> : <Badge className="bg-white/5">En curso</Badge>}
      </div>

      <form action={recordScoreAction} className="mt-4 space-y-3">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="matchId" type="hidden" value={match.id} />

        <PairRow
          label={home}
          name="homeScore"
          defaultValue={match.homeScore ?? undefined}
        />
        <PairRow
          label={away}
          name="awayScore"
          defaultValue={match.awayScore ?? undefined}
        />

        <Button className="w-full" type="submit" variant="primary">
          Guardar marcador
        </Button>
      </form>
      {match.completed ? (
        <form action={clearScoreAction} className="mt-2">
          <input name="eventId" type="hidden" value={eventId} />
          <input name="matchId" type="hidden" value={match.id} />
          <Button className="w-full" type="submit" variant="ghost">
            Borrar marcador
          </Button>
        </form>
      ) : null}
    </article>
  );
}

function PairRow({
  defaultValue,
  label,
  name,
}: Readonly<{ defaultValue: number | undefined; label: string; name: string }>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex-1 text-sm font-medium text-[#fff7ed]">{label}</p>
      <input
        className="field-input w-20 text-center text-lg font-black"
        defaultValue={defaultValue ?? ""}
        inputMode="numeric"
        max="60"
        min="0"
        name={name}
        type="number"
      />
    </div>
  );
}
