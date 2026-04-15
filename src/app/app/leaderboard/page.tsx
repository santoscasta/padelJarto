import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { getRepo } from '@/lib/repositories/provider';

export default async function LeaderboardPage({
  searchParams,
}: { searchParams: Promise<{ tab?: 'players' | 'pairs' }> }) {
  const sp = await searchParams;
  const tab = sp.tab === 'pairs' ? 'pairs' : 'players';
  const repo = await getRepo();
  const [players, pairs] = await Promise.all([repo.listPlayers(), repo.listPairsRanked(50)]);
  const playersById = new Map(players.map((p) => [p.id, p] as const));

  return (
    <section className="space-y-4">
      <CardHeader>
        <CardTitle>Ranking</CardTitle>
        <div className="flex gap-2">
          <Link href="/app/leaderboard?tab=players"><Badge tone={tab === 'players' ? 'accent' : 'neutral'}>Jugadores</Badge></Link>
          <Link href="/app/leaderboard?tab=pairs"><Badge tone={tab === 'pairs' ? 'accent' : 'neutral'}>Parejas</Badge></Link>
        </div>
      </CardHeader>
      {tab === 'players' ? (
        <Card>
          <ol className="space-y-1 text-sm">
            {players.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between py-1">
                <Link href={`/app/players/${p.id}`} className="flex items-center gap-3">
                  <span className="w-6 text-right tabular-nums text-[color:var(--color-ink-soft)]">{i + 1}.</span>
                  <Avatar src={p.avatarUrl} name={p.displayName} size="sm" />
                  <span>{p.displayName}</span>
                </Link>
                <span className="tabular-nums">{Math.round(p.rating)}</span>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <Card>
          <ol className="space-y-1 text-sm">
            {pairs.map((pair, i) => {
              const pa = playersById.get(pair.playerAId);
              const pb = playersById.get(pair.playerBId);
              return (
                <li key={pair.id} className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-3">
                    <span className="w-6 text-right tabular-nums text-[color:var(--color-ink-soft)]">{i + 1}.</span>
                    <span className="flex -space-x-2">
                      <Avatar src={pa?.avatarUrl ?? null} name={pa?.displayName ?? ''} size="sm" className="ring-2 ring-[color:var(--color-surface)]" />
                      <Avatar src={pb?.avatarUrl ?? null} name={pb?.displayName ?? ''} size="sm" className="ring-2 ring-[color:var(--color-surface)]" />
                    </span>
                    <span>
                      {pa?.displayName ?? '—'} / {pb?.displayName ?? '—'}
                    </span>
                  </span>
                  <span className="tabular-nums">{Math.round(pair.rating)}</span>
                </li>
              );
            })}
          </ol>
        </Card>
      )}
    </section>
  );
}
