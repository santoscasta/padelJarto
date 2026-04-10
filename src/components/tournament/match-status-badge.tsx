import type { MatchStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<MatchStatus, { label: string; classes: string }> = {
  draft: { label: "Borrador", classes: "bg-white/10 text-[#a8a29e]" },
  scheduled: { label: "Programado", classes: "bg-blue-500/20 text-blue-400" },
  pending: { label: "Pendiente", classes: "bg-yellow-500/20 text-yellow-400" },
  result_proposed: { label: "Resultado propuesto", classes: "bg-orange-500/20 text-orange-400" },
  in_validation: { label: "En validación", classes: "bg-purple-500/20 text-purple-400" },
  in_dispute: { label: "En disputa", classes: "bg-red-500/20 text-red-400" },
  pending_review: { label: "Pendiente revisión", classes: "bg-yellow-500/20 text-yellow-400" },
  validated: { label: "Validado", classes: "bg-green-500/20 text-green-400" },
  closed: { label: "Cerrado", classes: "bg-[#78716c]/20 text-[#78716c]" },
};

interface MatchStatusBadgeProps {
  status: MatchStatus;
  className?: string;
}

export function MatchStatusBadge({ status, className }: MatchStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
