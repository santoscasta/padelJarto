import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardEyebrow } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PairLine } from '@/components/ui/PairLine';
import type { Match, MatchPhase, Pair, Player, Result } from '@/lib/domain/types';

const PHASE_ORDER: MatchPhase[] = ['R32', 'R16', 'QF', 'SF', 'F'];
const PHASE_LABEL: Record<MatchPhase, string> = {
  group: 'Grupo',
  R32: 'Dieciseisavos',
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semifinal',
  F: 'Final',
};

const STATUS_TONE = {
  validated: 'ok',
  reported: 'warn',
  pending: 'neutral',
} as const;
const STATUS_LABEL: Record<string, string> = {
  validated: 'Validado',
  reported: 'Reportado',
  pending: 'Pendiente',
};

export function KnockoutView({
  tournamentId,
  matches,
  pairs,
  players,
  results,
}: {
  tournamentId: string;
  matches: ReadonlyArray<Match>;
  pairs: ReadonlyArray<Pair>;
  players: ReadonlyArray<Player>;
  results: ReadonlyArray<Result>;
}) {
  const pairById = new Map(pairs.map((p) => [p.id, p] as const));
  const playerById = new Map(players.map((p) => [p.id, p] as const));
  const phases = PHASE_ORDER.filter((ph) => matches.some((m) => m.phase === ph));

  function pairPlayers(pairId: string) {
    const p = pairById.get(pairId);
    if (!p) return { a: undefined, b: undefined };
    return {
      a: playerById.get(p.playerAId),
      b: playerById.get(p.playerBId),
    };
  }

  return (
    <div className="space-y-5">
      {phases.map((phase) => {
        const phaseMatches = matches.filter((m) => m.phase === phase);
        const isFinal = phase === 'F';
        return (
          <Card key={phase} variant={isFinal ? 'spotlight' : 'default'} className="space-y-4">
            <header className="flex items-center justify-between">
              <div>
                <CardEyebrow>{isFinal ? 'Cumbre' : 'Eliminatoria'}</CardEyebrow>
                <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
                  {PHASE_LABEL[phase]}
                </h3>
              </div>
              <Badge tone={isFinal ? 'spark' : 'neutral'}>
                {phaseMatches.length} {phaseMatches.length === 1 ? 'partido' : 'partidos'}
              </Badge>
            </header>

            <ul className="space-y-2">
              {phaseMatches.map((m) => {
                const result = results.find(
                  (r) => r.matchId === m.id && r.status !== 'corrected',
                );
                const a = pairPlayers(m.pairAId);
                const b = pairPlayers(m.pairBId);
                const pairAName = pairById.get(m.pairAId)?.displayName ?? null;
                const pairBName = pairById.get(m.pairBId)?.displayName ?? null;
                const status = result?.status ?? 'pending';
                const sets = result?.sets;
                return (
                  <li key={m.id}>
                    <Link
                      href={`/app/tournaments/${tournamentId}/matches/${m.id}`}
                      className="group flex cursor-pointer flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-3 transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--color-accent)]/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <PairLine
                          playerA={a.a ?? null}
                          playerB={a.b ?? null}
                          size="xs"
                          displayName={pairAName}
                        />
                        <PairLine
                          playerA={b.a ?? null}
                          playerB={b.b ?? null}
                          size="xs"
                          displayName={pairBName}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        {sets && sets.length > 0 ? (
                          <span className="font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-[color:var(--color-ink)]">
                            {sets.map((s) => `${s.a}–${s.b}`).join(' · ')}
                          </span>
                        ) : null}
                        <Badge tone={STATUS_TONE[status as keyof typeof STATUS_TONE] ?? 'neutral'}>
                          {STATUS_LABEL[status] ?? status}
                        </Badge>
                        <ArrowRight
                          className="h-4 w-4 text-[color:var(--color-ink-mute)] transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-[color:var(--color-accent)]"
                          aria-hidden
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
