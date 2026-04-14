import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Group, Match, Pair, Player, Result } from '@/lib/domain/types';
import { computeStandings } from '@/lib/domain/standings';

type Props = {
  tournamentId: string;
  groups: ReadonlyArray<Group>;
  pairs: ReadonlyArray<Pair>;
  players: ReadonlyArray<Player>;
  matches: ReadonlyArray<Match>;
  results: ReadonlyArray<Result>;
};

export function GroupsView({ tournamentId, groups, pairs, players, matches, results }: Props) {
  const pairById = new Map(pairs.map((p) => [p.id, p] as const));
  const playerById = new Map(players.map((p) => [p.id, p] as const));
  const pairLabel = (id: string) => {
    const p = pairById.get(id);
    if (!p) return id;
    const a = playerById.get(p.playerAId)?.displayName ?? '—';
    const b = playerById.get(p.playerBId)?.displayName ?? '—';
    return `${a} / ${b}`;
  };
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const gPairs = g.pairIds.map((id) => pairById.get(id)).filter((p): p is Pair => !!p);
        const gMatches = matches.filter((m) => m.groupId === g.id);
        const standings = computeStandings(gPairs, gMatches, results);
        return (
          <Card key={g.id}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Grupo {g.label}</h3>
              <Badge tone="neutral">{gPairs.length} parejas</Badge>
            </div>
            <ol className="mb-4 space-y-1 text-sm">
              {standings.map((s, i) => (
                <li key={s.pairId} className="flex justify-between">
                  <span>
                    <span className="mr-2 text-[color:var(--color-ink-soft)]">{i + 1}.</span>
                    {pairLabel(s.pairId)}
                  </span>
                  <span className="tabular-nums text-[color:var(--color-ink-soft)]">
                    {s.wins}W · {s.setsFor}-{s.setsAgainst}
                  </span>
                </li>
              ))}
            </ol>
            <ul className="divide-y divide-black/5 text-sm">
              {gMatches.map((m) => {
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
        );
      })}
    </div>
  );
}
