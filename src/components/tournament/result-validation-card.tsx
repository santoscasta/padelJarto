"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MatchResultProposal, ScoreSet } from "@/lib/domain/types";
import { validateResultAction } from "@/app/app/actions";

interface ResultValidationCardProps {
  proposal: MatchResultProposal;
  tournamentId: string;
  canValidate: boolean;
}

function formatScore(sets: ScoreSet[]): string {
  return sets.map((s) => `${s.home}-${s.away}`).join(" / ");
}

export function ResultValidationCard({
  proposal,
  tournamentId,
  canValidate,
}: ResultValidationCardProps) {
  return (
    <Card className="rounded-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#fdba74]">
            Resultado propuesto
          </p>
          <p className="mt-1 font-[family:var(--font-display)] text-xl text-white">
            {formatScore(proposal.scoreJson)}
          </p>
          <p className="mt-1 text-xs text-[#a8a29e]">
            Ganador: {proposal.winnerSide === "home" ? "Local" : "Visitante"}
          </p>
          {proposal.notes && (
            <p className="mt-2 text-xs text-[#d6d3d1]">{proposal.notes}</p>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
            proposal.status === "pending"
              ? "bg-yellow-500/20 text-yellow-400"
              : proposal.status === "accepted"
                ? "bg-green-500/20 text-green-400"
                : proposal.status === "rejected"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-blue-500/20 text-blue-400"
          }`}
        >
          {proposal.status === "pending"
            ? "Pendiente"
            : proposal.status === "accepted"
              ? "Aceptado"
              : proposal.status === "rejected"
                ? "Rechazado"
                : "Anulado"}
        </span>
      </div>

      {canValidate && proposal.status === "pending" && (
        <div className="mt-4 flex gap-2">
          <form action={validateResultAction}>
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="proposalId" value={proposal.id} />
            <input type="hidden" name="decision" value="accept" />
            <Button type="submit" variant="primary">
              Aceptar
            </Button>
          </form>
          <form action={validateResultAction} className="flex items-end gap-2">
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="proposalId" value={proposal.id} />
            <input type="hidden" name="decision" value="reject" />
            <input
              name="reason"
              type="text"
              placeholder="Motivo (opcional)"
              className="field-input text-xs"
            />
            <Button type="submit" variant="danger">
              Rechazar
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}
