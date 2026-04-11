"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { computeAmericanoStandings } from "@/lib/domain/americano";
import type {
  EventBundle,
  EventMatchRow,
  EventPlayerRow,
} from "@/lib/repositories/event-repository";
import { QrShare } from "@/components/qr-share";

function playerName(players: EventPlayerRow[], id: string | null): string {
  if (!id) return "—";
  return players.find((player) => player.id === id)?.name ?? "—";
}

function groupByRound(matches: EventMatchRow[]): Map<number, EventMatchRow[]> {
  const byRound = new Map<number, EventMatchRow[]>();
  for (const match of matches) {
    const list = byRound.get(match.roundNumber) ?? [];
    list.push(match);
    byRound.set(match.roundNumber, list);
  }
  return byRound;
}

export function PublicEventView({
  initialBundle,
}: Readonly<{ initialBundle: EventBundle }>) {
  const router = useRouter();
  const eventId = initialBundle.event.id;

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`public-event:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_matches", filter: `event_id=eq.${eventId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_players", filter: `event_id=eq.${eventId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `id=eq.${eventId}` },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, router]);

  const standings = useMemo(() => {
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

  const rounds = useMemo(() => {
    const map = groupByRound(initialBundle.matches);
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([number, matches]) => ({ number, matches }));
  }, [initialBundle.matches]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.2),_transparent_30%),linear-gradient(180deg,#0a0807_0%,#150f0d_100%)] px-4 py-8 text-[#fff7ed] sm:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-2 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#fdba74]">
              {initialBundle.event.format === "americano" ? "Americano" : "Mexicano"} ·{" "}
              {initialBundle.event.courts} {initialBundle.event.courts === 1 ? "pista" : "pistas"}
            </p>
            <h1 className="mt-2 font-[family:var(--font-display)] text-5xl leading-[0.95] tracking-tight sm:text-7xl">
              {initialBundle.event.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <QrShare
              url={`/t/${initialBundle.event.slug}`}
              title={initialBundle.event.name}
            />
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#fdba74]">
              Marcador en vivo
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <section>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Clasificación</h2>
            <ol className="mt-4 space-y-2">
              {standings.map((row, index) => (
                <li
                  className={`flex items-center justify-between gap-3 rounded-[20px] border border-white/10 px-4 py-3 transition ${
                    index === 0
                      ? "bg-[#f97316]/15"
                      : index === 1
                        ? "bg-white/8"
                        : index === 2
                          ? "bg-white/5"
                          : "bg-black/20"
                  }`}
                  key={row.playerId}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-[#f97316] text-lg font-black text-[#1c1917]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-base font-semibold">{row.name}</p>
                      <p className="text-xs text-[#a8a29e]">
                        {row.played} partidos · diff {row.diff >= 0 ? "+" : ""}
                        {row.diff}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-[#fdba74]">{row.pointsFor}</p>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#a8a29e]">pts</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">Rondas</h2>
            <div className="mt-4 space-y-6">
              {rounds.map((round) => (
                <article key={round.number}>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fdba74]">
                    Ronda {round.number}
                  </p>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {round.matches.map((match) => {
                      const isDone =
                        match.completed && match.homeScore !== null && match.awayScore !== null;
                      const homeWon = isDone && (match.homeScore ?? 0) > (match.awayScore ?? 0);
                      const awayWon = isDone && (match.awayScore ?? 0) > (match.homeScore ?? 0);
                      return (
                        <div
                          className="rounded-[22px] border border-white/10 bg-black/25 p-4"
                          key={match.id}
                        >
                          <p className="text-xs uppercase tracking-[0.2em] text-[#a8a29e]">
                            Pista {match.court}
                          </p>
                          <div className="mt-3 space-y-2">
                            <TeamRow
                              name={`${playerName(initialBundle.players, match.homePlayer1)} / ${playerName(initialBundle.players, match.homePlayer2)}`}
                              score={match.homeScore}
                              winner={homeWon}
                            />
                            <TeamRow
                              name={`${playerName(initialBundle.players, match.awayPlayer1)} / ${playerName(initialBundle.players, match.awayPlayer2)}`}
                              score={match.awayScore}
                              winner={awayWon}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function TeamRow({
  name,
  score,
  winner,
}: Readonly<{ name: string; score: number | null; winner: boolean }>) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[16px] px-3 py-2 ${
        winner ? "bg-[#f97316]/20" : "bg-white/5"
      }`}
    >
      <p className={`text-sm ${winner ? "font-semibold text-[#fff7ed]" : "text-[#e7e5e4]"}`}>
        {name}
      </p>
      <p className={`text-lg font-black ${winner ? "text-[#fdba74]" : "text-[#a8a29e]"}`}>
        {score ?? "—"}
      </p>
    </div>
  );
}
