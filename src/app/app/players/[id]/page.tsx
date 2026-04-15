import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { getRepo } from '@/lib/repositories/provider';

export default async function PlayerProfilePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepo();
  const player = await repo.getPlayer(id);
  if (!player) notFound();
  const snapshots = await repo.listRatingSnapshotsForSubject('player', id);
  const min = snapshots.length ? Math.min(...snapshots.map((s) => s.after)) : player.rating;
  const max = snapshots.length ? Math.max(...snapshots.map((s) => s.after)) : player.rating;

  return (
    <section className="space-y-4">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar src={player.avatarUrl} name={player.displayName} size="lg" />
          <CardTitle>{player.displayName}</CardTitle>
        </div>
        <Badge tone="accent">{Math.round(player.rating)}</Badge>
      </CardHeader>
      <Card>
        <p className="text-sm text-[color:var(--color-ink-soft)]">
          Partidos jugados: <span className="text-[color:var(--color-ink)]">{player.matchesPlayed}</span>
        </p>
        <p className="text-sm text-[color:var(--color-ink-soft)]">
          Rango histórico: {Math.round(min)} – {Math.round(max)}
        </p>
      </Card>
      <Card>
        <p className="mb-2 text-sm font-semibold">Últimos movimientos</p>
        <ul className="divide-y divide-black/5 text-sm">
          {snapshots.slice(-20).reverse().map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 tabular-nums">
              <span className="text-[color:var(--color-ink-soft)]">{new Date(s.createdAt).toLocaleDateString()}</span>
              <span>{Math.round(s.before)} → {Math.round(s.after)}</span>
              <span className={s.delta >= 0 ? 'text-[color:var(--color-ok)]' : 'text-[color:var(--color-danger)]'}>
                {s.delta >= 0 ? '+' : ''}{Math.round(s.delta)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
