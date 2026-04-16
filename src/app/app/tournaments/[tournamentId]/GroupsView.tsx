import Link from 'next/link';
import { Crown, ArrowRight } from 'lucide-react';
import { Card, CardEyebrow } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PairLine } from '@/components/ui/PairLine';
import type { Group, Match, Pair, Player, Result } from '@/lib/domain/types';
import { computeStandings } from '@/lib/domain/standings';
import { cn } from '@/lib/utils/cn';

type Props = Readonly<{
  tournamentId: string;
  groups: ReadonlyArray<Group>;
  pairs: ReadonlyArray<Pair>;
  players: ReadonlyArray<Player>;
  matches: ReadonlyArray<Match>;
  results: ReadonlyArray<Result>;
}>;

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

export function GroupsView({
  tournamentId,
  groups,
  pairs,
  players,
  matches,
  results,
}: Props) {
  const pairById = new Map(pairs.map((p) => [p.id, p] as const));
  const playerById = new Map(players.map((p) => [p.id, p] as const));

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
      {groups.map((g) => {
        const gPairs = g.pairIds
          .map((id) => pairById.get(id))
          .filter((p): p is Pair => !!p);
        const gMatches = matches.filter((m) => m.groupId === g.id);
        const standings = computeStandings(gPairs, gMatches, results);
        return (
          <Card key={g.id} className="space-y-5">
            <header className="flex items-center justify-between">
              <div>
                <CardEyebrow>Grupo</CardEyebrow>
                <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight">
                  {g.label}
                </h3>
              </div>
              <Badge tone="neutral">{gPairs.length} parejas</Badge>
            </header>

            <div className="overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--color-line)]">
              <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 border-b border-[color:var(--color-line)] bg-[color:var(--color-surface-2)] px-3 py-2 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-ink-mute)]">
                <span className="text-center">#</span>
                <span>Pareja</span>
                <span>W</span>
                <span>Sets</span>
              </div>
              <ol>
                {standings.map((s, i) => {
                  const { a, b } = pairPlayers(s.pairId);
                  const pairDisplayName = pairById.get(s.pairId)?.displayName ?? null;
                  const place = i + 1;
                  const isLeader = place === 1;
                  return (
                    <li
                      key={s.pairId}
                      className={cn(
                        'grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 border-b border-[color:var(--color-line)]/60 px-3 py-2.5 text-sm last:border-b-0',
                        isLeader ? 'bg-[color:var(--color-accent)]/8' : '',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-7 w-7 items-center justify-center rounded-full font-[family-name:var(--font-display)] text-sm font-bold tabular-nums',
                          isLeader
                            ? 'bg-[color:var(--color-accent)]/20 text-[color:var(--color-accent)]'
                            : 'bg-[color:var(--color-surface-3)] text-[color:var(--color-ink-soft)]',
                        )}
                      >
                        {isLeader ? <Crown className="h-3.5 w-3.5" aria-hidden /> : place}
                      </span>
                      <PairLine
                        playerA={a ?? null}
                        playerB={b ?? null}
                        size="xs"
                        displayName={pairDisplayName}
                      />
                      <span className="font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-[color:var(--color-ink)]">
                        {s.wins}
                      </span>
                      <span className="font-[family-name:var(--font-display)] text-sm font-semibold tabular-nums text-[color:var(--color-ink-soft)]">
                        {s.setsFor}–{s.setsAgainst}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {gMatches.length > 0 ? (
              <div>
                <CardEyebrow>Partidos</CardEyebrow>
                <ul className="mt-3 space-y-2">
                  {gMatches.map((m) => {
                    const result = results.find(
                      (r) => r.matchId === m.id && r.status !== 'corrected',
                    );
                    const a = pairPlayers(m.pairAId);
                    const b = pairPlayers(m.pairBId);
                    const status = result?.status ?? 'pending';
                    return (
                      <li key={m.id}>
                        <Link
                          href={`/app/tournaments/${tournamentId}/matches/${m.id}`}
                          className="group flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-2.5 transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--color-accent)]/40"
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-3 text-sm">
                            <PairLine playerA={a.a ?? null} playerB={a.b ?? null} size="xs" avatarsOnly />
                            <span className="text-[color:var(--color-ink-mute)]">vs</span>
                            <PairLine playerA={b.a ?? null} playerB={b.b ?? null} size="xs" avatarsOnly />
                          </span>
                          <Badge tone={STATUS_TONE[status as keyof typeof STATUS_TONE] ?? 'neutral'}>
                            {STATUS_LABEL[status] ?? status}
                          </Badge>
                          <ArrowRight
                            className="h-4 w-4 text-[color:var(--color-ink-mute)] transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-[color:var(--color-accent)]"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
