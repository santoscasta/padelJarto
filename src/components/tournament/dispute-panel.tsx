import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DisputeItem {
  matchId: string;
  matchLabel: string;
  proposedScore: string;
  proposedBy: string;
  rejectedBy: string;
  rejectReason?: string;
}

export function DisputePanel({
  disputes,
}: Readonly<{ disputes: DisputeItem[] }>) {
  if (disputes.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-[#a8a29e]">
          <AlertTriangle className="size-5" />
          <p className="text-sm">
            No hay disputas abiertas. Todos los resultados estan resueltos.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-400">
        {disputes.length}{" "}
        {disputes.length === 1 ? "disputa abierta" : "disputas abiertas"}
      </p>
      {disputes.map((d) => (
        <Card key={d.matchId} className="border-amber-500/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{d.matchLabel}</p>
              <p className="mt-1 text-xs text-[#a8a29e]">
                Propuesto por {d.proposedBy}: {d.proposedScore}
              </p>
              <p className="text-xs text-red-400">
                Rechazado por {d.rejectedBy}
                {d.rejectReason ? `: "${d.rejectReason}"` : ""}
              </p>
            </div>
            <Badge className="border-amber-500/30 bg-amber-500/20 text-amber-400">
              En disputa
            </Badge>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" className="text-xs">
              Aceptar resultado propuesto
            </Button>
            <Button variant="ghost" className="text-xs">
              Introducir resultado correcto
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
