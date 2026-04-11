"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  isValidSetScore,
  computeWinnerFromSets,
} from "@/lib/domain/result-validation";

interface ResultFormProps {
  matchId: string;
  homeLabel: string;
  awayLabel: string;
  bestOfSets?: number;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
}

export function ResultForm({
  matchId,
  homeLabel,
  awayLabel,
  bestOfSets = 3,
  onSubmit,
  onCancel,
}: ResultFormProps) {
  const maxSets = bestOfSets;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const [setScores, setSetScores] = useState<{ home: string; away: string }[]>(
    Array.from({ length: maxSets }, () => ({ home: "", away: "" })),
  );

  const filledSets = setScores.filter((s) => s.home !== "" && s.away !== "");

  const parsedSets: [number, number][] = filledSets
    .map((s) => [parseInt(s.home), parseInt(s.away)] as [number, number])
    .filter(([h, a]) => !isNaN(h) && !isNaN(a));

  const winner =
    parsedSets.length > 0 ? computeWinnerFromSets(parsedSets) : null;

  const updateSet = (index: number, side: "home" | "away", value: string) => {
    setSetScores((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [side]: value };
      return next;
    });
    setError(null);
  };

  const handleSubmit = () => {
    if (parsedSets.length === 0) {
      setError("Introduce al menos un set");
      return;
    }

    for (let i = 0; i < parsedSets.length; i++) {
      if (!isValidSetScore(parsedSets[i][0], parsedSets[i][1])) {
        setError(
          `Set ${i + 1}: marcador invalido (${parsedSets[i][0]}-${parsedSets[i][1]})`,
        );
        return;
      }
    }

    if (!winner) {
      setError("No hay un ganador claro con estos sets");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", matchId);
      fd.set("scoreJson", JSON.stringify({ sets: parsedSets }));
      fd.set("winnerSide", winner);
      fd.set("notes", notes);
      await onSubmit(fd);
    });
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[#fdba74]">{homeLabel}</span>
        <span className="text-[#a8a29e]">vs</span>
        <span className="font-semibold text-[#fdba74]">{awayLabel}</span>
      </div>

      <div className="grid gap-2">
        {setScores.map((set, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-12 text-xs text-[#a8a29e]">Set {i + 1}</span>
            <input
              type="number"
              min="0"
              max="7"
              className="field-input w-16 text-center text-lg font-bold"
              placeholder="0"
              value={set.home}
              onChange={(e) => updateSet(i, "home", e.target.value)}
            />
            <span className="text-[#a8a29e]">-</span>
            <input
              type="number"
              min="0"
              max="7"
              className="field-input w-16 text-center text-lg font-bold"
              placeholder="0"
              value={set.away}
              onChange={(e) => updateSet(i, "away", e.target.value)}
            />
            {parsedSets[i] && (
              <span className="text-xs">
                {isValidSetScore(parsedSets[i][0], parsedSets[i][1])
                  ? "\u2713"
                  : "\u2717"}
              </span>
            )}
          </div>
        ))}
      </div>

      {winner && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2 text-center text-sm">
          <span className="text-green-400">Ganador: </span>
          <span className="font-semibold">
            {winner === "home" ? homeLabel : awayLabel}
          </span>
        </div>
      )}

      <div>
        <label className="field-label">Incidencias (opcional)</label>
        <textarea
          className="field-input min-h-[60px] resize-none text-sm"
          placeholder="Notas, incidencias..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
        )}
        <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Enviando..." : "Enviar resultado"}
        </Button>
      </div>
    </div>
  );
}
