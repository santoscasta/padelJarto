import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Match, MatchPhase, Pair, Player, Result } from '@/lib/domain/types';

const PHASE_ORDER: MatchPhase[] = ['R32', 'R16', 'QF', 'SF', 'F'];

export function KnockoutView({
  tournamentId, matches, pairs, players, results,
}: {
  tournamentId: string;
  matches: ReadonlyArray<Match>;
  pairs: ReadonlyArray<Pair>;
  players: ReadonlyArray<Player>;
  results: ReadonlyArray<Result>;
}) {
  const pairById = new Map(pairs.map((p) => [p.id, p] as const));
  const playerById = new Map(players.map((p) => [p.id, p] as const));
  const pairLabel = (id: string) => {
    const p = pairById.get(id);
    if (!p) return id;
    return `${playerById.get(p.playerAId)?.displayName ?? '—'} / ${playerById.get(p.playerBId)?.displayName ?? '—'}`;
  };
  const phases = PHASE_ORDER.filter((ph) => matches.some((m) => m.phase === ph));
  return (
    <div className="space-y-4">
      {phases.map((phase) => (
        <Card key={phase}>
          <h3 className="mb-3 text-base font-semibold">{phase}</h3>
          <ul className="divide-y divide-black/5 text-sm">
            {matches.filter((m) => m.phase === phase).map((m) => {
              const result = results.find((r) => r.matchId === m.id && r.status !== 'corrected');
              return (
                <li key={m.id}>
                  <Link href={`/app/tournaments/${tournamentId}/matches/${m.id}`} className="flex items-center justify-between py-2">
                    <span>{pairLabel(m.pairAId)} vs {pairLabel(m.pairBId)}</span>
                    <Badge tone={result?.status === 'validated' ? 'ok' : result ? 'warn' : 'neutral'}>
                      {result?.status ?? 'pendiente'}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}
