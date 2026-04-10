import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { MatchStatusBadge } from "@/components/tournament/match-status-badge";
import { ResultProposalForm } from "@/components/tournament/result-proposal-form";
import { ResultValidationCard } from "@/components/tournament/result-validation-card";
import { DisputeResolutionForm } from "@/components/tournament/dispute-resolution-form";
import { requireCurrentUser } from "@/lib/auth/session";
import { getTournamentRepository } from "@/lib/repositories";
import { canProposeResult, canValidateProposal } from "@/lib/domain/validation";
import { labelForSide } from "@/lib/domain/selectors";

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ tournamentId?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const { matchId } = await params;
  const { tournamentId } = await searchParams;

  if (!tournamentId) notFound();

  const repository = getTournamentRepository();
  const detail = await repository.getTournamentDetail(tournamentId, currentUser.id);

  if (!detail) notFound();

  const match = detail.matches.find((m) => m.id === matchId);
  if (!match) notFound();

  const isOrganizer = detail.membership.role === "organizer";
  const userCanPropose = canProposeResult(match, currentUser.id);

  const homeLabel = labelForSide(detail, match.sides[0]);
  const awayLabel = labelForSide(detail, match.sides[1]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <MatchStatusBadge status={match.status} />
        {match.roundLabel && (
          <span className="text-xs text-[#a8a29e]">{match.roundLabel}</span>
        )}
      </div>

      <h1 className="mt-4 font-[family:var(--font-display)] text-2xl tracking-tight text-white">
        {homeLabel.title} vs {awayLabel.title}
      </h1>
      <p className="mt-1 text-sm text-[#a8a29e]">
        {homeLabel.subtitle} — {awayLabel.subtitle}
      </p>

      {match.court && (
        <p className="mt-2 text-xs text-[#78716c]">Pista: {match.court}</p>
      )}
      {match.scheduledAt && (
        <p className="mt-1 text-xs text-[#78716c]">
          {new Date(match.scheduledAt).toLocaleString("es-ES")}
        </p>
      )}

      {/* Proposals */}
      {(match.proposals ?? []).length > 0 && (
        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-white">Propuestas de resultado</h2>
          {(match.proposals ?? []).map((proposal) => (
            <ResultValidationCard
              key={proposal.id}
              proposal={proposal}
              tournamentId={tournamentId}
              canValidate={canValidateProposal(proposal, match, currentUser.id)}
            />
          ))}
        </div>
      )}

      {/* Propose result form */}
      {userCanPropose && (
        <Card className="mt-6 rounded-2xl">
          <h2 className="mb-4 text-sm font-semibold text-white">
            Proponer resultado
          </h2>
          <ResultProposalForm
            tournamentId={tournamentId}
            matchId={matchId}
          />
        </Card>
      )}

      {/* Dispute resolution for organizer */}
      {isOrganizer && match.status === "in_dispute" && (
        <Card className="mt-6 rounded-2xl border-red-500/30">
          <DisputeResolutionForm
            tournamentId={tournamentId}
            matchId={matchId}
          />
        </Card>
      )}
    </main>
  );
}
