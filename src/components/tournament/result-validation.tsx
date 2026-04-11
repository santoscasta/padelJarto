"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, MessageSquare } from "lucide-react";

interface ResultValidationProps {
  proposalId: string;
  homeLabel: string;
  awayLabel: string;
  sets: [number, number][];
  winnerSide: "home" | "away";
  proposedByName: string;
  notes?: string;
  onValidate: (formData: FormData) => Promise<void>;
}

export function ResultValidation({
  proposalId,
  homeLabel,
  awayLabel,
  sets,
  winnerSide,
  proposedByName,
  notes,
  onValidate,
}: ResultValidationProps) {
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  const handleDecision = (decision: "accept" | "reject") => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("proposalId", proposalId);
      fd.set("decision", decision);
      if (decision === "reject" && reason) {
        fd.set("reason", reason);
      }
      await onValidate(fd);
    });
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <div className="flex items-center gap-2 text-xs text-amber-400">
        <MessageSquare className="size-3.5" />
        <span>Resultado propuesto por {proposedByName}</span>
      </div>

      <div className="mt-3 grid gap-1">
        {sets.map(([home, away], i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-12 text-xs text-[#a8a29e]">Set {i + 1}</span>
            <span
              className={`font-bold ${home > away ? "text-[#fdba74]" : "text-[#a8a29e]"}`}
            >
              {home}
            </span>
            <span className="text-[#a8a29e]">-</span>
            <span
              className={`font-bold ${away > home ? "text-[#fdba74]" : "text-[#a8a29e]"}`}
            >
              {away}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 text-sm">
        <span className="text-[#a8a29e]">Ganador: </span>
        <span className="font-semibold">
          {winnerSide === "home" ? homeLabel : awayLabel}
        </span>
      </div>

      {notes && (
        <p className="mt-2 text-xs italic text-[#a8a29e]">
          &ldquo;{notes}&rdquo;
        </p>
      )}

      {!showReject ? (
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => handleDecision("accept")}
            disabled={isPending}
            className="flex-1"
          >
            <Check className="mr-1 size-4" />
            {isPending ? "..." : "Validar"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowReject(true)}
            disabled={isPending}
            className="text-red-400 hover:text-red-300"
          >
            <X className="mr-1 size-4" />
            Rechazar
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-2">
          <textarea
            className="field-input min-h-[60px] resize-none text-sm"
            placeholder="Motivo del rechazo..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => handleDecision("reject")}
              disabled={isPending}
              className="text-red-400"
            >
              {isPending ? "..." : "Confirmar rechazo"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowReject(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
