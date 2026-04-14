import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { ResultForm } from './ResultForm';
import { ValidateControls } from './ValidateControls';

export default async function MatchPage({
  params,
}: { params: Promise<{ tournamentId: string; matchId: string }> }) {
  const { tournamentId, matchId } = await params;
  const session = await requireSession();
  const repo = await getRepo();
  const [match, tournament] = await Promise.all([repo.getMatch(matchId), repo.getTournament(tournamentId)]);
  if (!match || !tournament) notFound();

  const [pairA, pairB, existingResult, players] = await Promise.all([
    repo.getPair(match.pairAId),
    repo.getPair(match.pairBId),
    repo.getResultForMatch(match.id),
    repo.listPlayers(),
  ]);
  if (!pairA || !pairB) notFound();

  const playerIds = new Set([pairA.playerAId, pairA.playerBId, pairB.playerAId, pairB.playerBId]);
  const isPlayer = playerIds.has(session.player.id);
  const isOwner = tournament.ownerId === session.userId;
  const pairLabel = (pid: string) => {
    const p = pid === pairA.id ? pairA : pairB;
    const a = players.find((x) => x.id === p.playerAId)?.displayName ?? '—';
    const b = players.find((x) => x.id === p.playerBId)?.displayName ?? '—';
    return `${a} / ${b}`;
  };

  return (
    <section className="space-y-4">
      <CardHeader>
        <div>
          <CardTitle>Partido</CardTitle>
          <p className="text-xs text-[color:var(--color-ink-soft)]">{tournament.name} · {match.phase}</p>
        </div>
        {existingResult ? <Badge tone={existingResult.status === 'validated' ? 'ok' : 'warn'}>{existingResult.status}</Badge> : null}
      </CardHeader>

      <Card>
        <div className="flex items-center justify-between text-base font-medium">
          <span>{pairLabel(pairA.id)}</span>
          <span className="text-[color:var(--color-ink-soft)]">vs</span>
          <span className="text-right">{pairLabel(pairB.id)}</span>
        </div>
      </Card>

      {existingResult ? (
        <Card>
          <p className="mb-2 text-sm font-semibold">Resultado</p>
          <ul className="space-y-1 text-sm">
            {existingResult.sets.map((s, i) => (
              <li key={i} className="tabular-nums">Set {i + 1}: {s.a} — {s.b}</li>
            ))}
          </ul>
          {isOwner && existingResult.status === 'reported' ? (
            <div className="mt-4">
              <ValidateControls tournamentId={tournamentId} matchId={match.id} />
            </div>
          ) : null}
        </Card>
      ) : isPlayer ? (
        <Card>
          <p className="mb-3 text-sm font-semibold">Reportar resultado</p>
          <ResultForm matchId={match.id} />
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-[color:var(--color-ink-soft)]">Solo un jugador del partido puede reportar.</p>
        </Card>
      )}
    </section>
  );
}
