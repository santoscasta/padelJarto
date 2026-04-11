import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { transitionLabel } from "@/lib/domain/tournament-state";
import type { TournamentStatus } from "@/lib/domain/types";

interface TournamentSummaryProps {
  tournament: {
    name: string;
    format?: string;
    status: string;
    mode: string;
    courts?: number;
    createdAt?: string;
  };
  playerCount: number;
  matchCount: number;
  completedMatches: number;
}

export function TournamentSummary({
  tournament,
  playerCount,
  matchCount,
  completedMatches,
}: TournamentSummaryProps) {
  const formatLabel =
    tournament.mode === "fixed_pairs" ? "Parejas fijas" : "Ranking individual";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">
          Estado
        </p>
        <p className="mt-2 text-2xl font-black capitalize">
          {transitionLabel(tournament.status as TournamentStatus)}
        </p>
      </Card>
      <Card>
        <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">
          Jugadores
        </p>
        <p className="mt-2 text-2xl font-black">{playerCount}</p>
      </Card>
      <Card>
        <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">
          Partidos
        </p>
        <p className="mt-2 text-2xl font-black">
          {completedMatches} / {matchCount}
        </p>
        <p className="text-xs text-[#a8a29e]">completados</p>
      </Card>
      <Card>
        <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">
          Formato
        </p>
        <div className="mt-2 flex gap-2">
          <Badge>{formatLabel}</Badge>
        </div>
      </Card>
    </div>
  );
}
