"use client";

import { Button } from "@/components/ui/button";
import { resolveDisputeAction } from "@/app/app/actions";

interface DisputeResolutionFormProps {
  tournamentId: string;
  matchId: string;
}

export function DisputeResolutionForm({ tournamentId, matchId }: DisputeResolutionFormProps) {
  return (
    <form action={resolveDisputeAction} className="space-y-4">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="matchId" value={matchId} />

      <p className="text-xs uppercase tracking-wider text-red-400">
        Resolución de disputa
      </p>
      <p className="text-sm text-[#d6d3d1]">
        Como organizador, establece el resultado definitivo de este partido.
      </p>

      <div className="space-y-3">
        {[1, 2, 3].map((setNumber) => (
          <div key={setNumber} className="flex items-center gap-3">
            <span className="w-12 text-xs text-[#a8a29e]">Set {setNumber}</span>
            <input
              name={`set${setNumber}Home`}
              type="number"
              min="0"
              max="99"
              placeholder="L"
              className="field-input w-16 text-center"
            />
            <span className="text-[#a8a29e]">-</span>
            <input
              name={`set${setNumber}Away`}
              type="number"
              min="0"
              max="99"
              placeholder="V"
              className="field-input w-16 text-center"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="field-label">Ganador</label>
        <select name="winnerSide" className="field-select" required>
          <option value="home">Local</option>
          <option value="away">Visitante</option>
        </select>
      </div>

      <div>
        <label className="field-label">Motivo de la resolución</label>
        <textarea
          name="reason"
          className="field-textarea"
          rows={3}
          required
          placeholder="Explica por qué se ha resuelto así..."
        />
      </div>

      <Button type="submit" variant="danger">
        Resolver disputa
      </Button>
    </form>
  );
}
