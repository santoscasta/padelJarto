"use client";

import { Button } from "@/components/ui/button";
import { proposeResultAction } from "@/app/app/actions";

interface ResultProposalFormProps {
  tournamentId: string;
  matchId: string;
}

export function ResultProposalForm({ tournamentId, matchId }: ResultProposalFormProps) {
  return (
    <form action={proposeResultAction} className="space-y-4">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="matchId" value={matchId} />

      <div className="space-y-3">
        {[1, 2, 3].map((setNumber) => (
          <div key={setNumber} className="flex items-center gap-3">
            <span className="w-12 text-xs text-[#a8a29e]">Set {setNumber}</span>
            <input
              name={`set${setNumber}Home`}
              type="number"
              min="0"
              max="99"
              placeholder="Local"
              className="field-input w-20 text-center"
            />
            <span className="text-[#a8a29e]">-</span>
            <input
              name={`set${setNumber}Away`}
              type="number"
              min="0"
              max="99"
              placeholder="Visitante"
              className="field-input w-20 text-center"
            />
            <input
              name={`set${setNumber}TiebreakHome`}
              type="number"
              min="0"
              placeholder="TB"
              className="field-input w-16 text-center text-xs"
            />
            <input
              name={`set${setNumber}TiebreakAway`}
              type="number"
              min="0"
              placeholder="TB"
              className="field-input w-16 text-center text-xs"
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
        <label className="field-label">Notas (opcional)</label>
        <textarea name="notes" className="field-textarea" rows={2} />
      </div>

      <Button type="submit">Proponer resultado</Button>
    </form>
  );
}
