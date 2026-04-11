import { Card } from "@/components/ui/card";

interface RulesViewProps {
  rules?: {
    pointsWin?: number;
    pointsLoss?: number;
    bestOfSets?: number;
    tieBreakRule?: string;
    validationMode?: string;
    tiebreakAt?: number;
  };
  format: string;
  groupCount: number;
  qualifiersPerGroup: number;
}

export function TournamentRulesView({
  rules,
  format,
  groupCount,
  qualifiersPerGroup,
}: RulesViewProps) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-[0.2em] text-[#fdba74]">
        Reglas del torneo
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">Formato</p>
          <p className="text-sm text-[#d6d3d1] capitalize">{format}</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Grupos</p>
          <p className="text-sm text-[#d6d3d1]">
            {groupCount} grupos, {qualifiersPerGroup} clasificados por grupo
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Sets por partido</p>
          <p className="text-sm text-[#d6d3d1]">
            Al mejor de {rules?.bestOfSets ?? 3}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Tie-break</p>
          <p className="text-sm text-[#d6d3d1]">
            Al {rules?.tiebreakAt ?? 6}-{rules?.tiebreakAt ?? 6}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Puntos por victoria</p>
          <p className="text-sm text-[#d6d3d1]">{rules?.pointsWin ?? 3}</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Validacion de resultados</p>
          <p className="text-sm text-[#d6d3d1]">
            {rules?.validationMode === "auto"
              ? "Automatica"
              : rules?.validationMode === "organizer"
                ? "Por organizador"
                : "Por rival"}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-sm font-semibold">Desempates</p>
          <p className="text-sm text-[#d6d3d1]">
            {rules?.tieBreakRule
              ? rules.tieBreakRule
                  .split(",")
                  .map((r) => {
                    const labels: Record<string, string> = {
                      points: "Puntos",
                      head_to_head: "Enfrentamiento directo",
                      set_diff: "Diferencia de sets",
                      game_diff: "Diferencia de juegos",
                      draw: "Sorteo",
                    };
                    return labels[r.trim()] ?? r.trim();
                  })
                  .join(" → ")
              : "Puntos → Enfrentamiento directo → Diferencia de sets → Diferencia de juegos"}
          </p>
        </div>
      </div>
    </Card>
  );
}
