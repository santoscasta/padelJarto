import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TrendingUp, TrendingDown, Pencil } from 'lucide-react';
import { Card, CardEyebrow } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Stat } from '@/components/ui/Stat';
import { Button } from '@/components/ui/Button';
import { getRepo } from '@/lib/repositories/provider';
import { getSession } from '@/lib/auth/session';
import { cn } from '@/lib/utils/cn';

export default async function PlayerProfilePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepo();
  const [player, session] = await Promise.all([
    repo.getPlayer(id),
    getSession().catch(() => null),
  ]);
  if (!player) notFound();
  const isSelf = session?.player.id === player.id;
  const snapshots = await repo.listRatingSnapshotsForSubject('player', id);
  const ratings = snapshots.map((s) => s.after);
  const min = ratings.length ? Math.min(...ratings) : player.rating;
  const max = ratings.length ? Math.max(...ratings) : player.rating;
  const peak = max;
  const recent = snapshots.slice(-20).reverse();

  return (
    <div className="space-y-6">
      <Card variant="spotlight">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar src={player.avatarUrl} name={player.displayName} size="xl" />
            <div className="min-w-0">
              <CardEyebrow>Jugador</CardEyebrow>
              <h1 className="mt-1 truncate font-[family-name:var(--font-display)] text-[length:var(--text-display)] font-bold uppercase tracking-tight">
                {player.displayName}
              </h1>
            </div>
          </div>
          {isSelf ? (
            <Button asChild size="sm" variant="secondary" className="shrink-0">
              <Link href="/app/me/edit" aria-label="Editar mi perfil">
                <Pencil className="h-4 w-4" aria-hidden />
                Editar
              </Link>
            </Button>
          ) : null}
        </div>

        <dl className="mt-7 grid grid-cols-3 gap-4">
          <Stat value={Math.round(player.rating)} label="Rating" tone="accent" />
          <Stat value={player.matchesPlayed} label="Partidos" />
          <Stat value={Math.round(peak)} label="Pico" tone="spark" />
        </dl>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <CardEyebrow>Histórico</CardEyebrow>
            <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
              Rango: <span className="font-[family-name:var(--font-display)] font-bold tabular-nums text-[color:var(--color-ink)]">{Math.round(min)}</span>
              {' '}–{' '}
              <span className="font-[family-name:var(--font-display)] font-bold tabular-nums text-[color:var(--color-ink)]">{Math.round(max)}</span>
            </p>
          </div>
        </div>
        <Sparkline ratings={ratings} />
      </Card>

      <Card variant="flat" className="p-2">
        <div className="px-3 pb-3 pt-2">
          <CardEyebrow>Últimos movimientos</CardEyebrow>
        </div>
        {recent.length === 0 ? (
          <p className="px-3 pb-2 text-sm text-[color:var(--color-ink-soft)]">
            Aún sin partidos jugados.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-line)]/60">
            {recent.map((s) => {
              const positive = s.delta >= 0;
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="text-[color:var(--color-ink-soft)]">
                    {new Date(s.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="font-[family-name:var(--font-display)] tabular-nums text-[color:var(--color-ink)]">
                    {Math.round(s.before)} → {Math.round(s.after)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-[family-name:var(--font-display)] text-base font-bold tabular-nums',
                      positive ? 'text-[color:var(--color-ok)]' : 'text-[color:var(--color-danger)]',
                    )}
                  >
                    {positive ? (
                      <TrendingUp className="h-4 w-4" aria-hidden />
                    ) : (
                      <TrendingDown className="h-4 w-4" aria-hidden />
                    )}
                    {positive ? '+' : ''}
                    {Math.round(s.delta)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Sparkline({ ratings }: { ratings: ReadonlyArray<number> }) {
  if (ratings.length < 2) {
    return (
      <p className="mt-4 text-xs text-[color:var(--color-ink-mute)]">
        El gráfico aparecerá tras 2+ partidos.
      </p>
    );
  }
  const w = 320;
  const h = 80;
  const pad = 6;
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (ratings.length - 1);
  const points = ratings.map((r, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((r - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${points.join(' L ')}`;
  const areaPath = `${path} L ${pad + (ratings.length - 1) * stepX},${h - pad} L ${pad},${h - pad} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-4 h-20 w-full"
      role="img"
      aria-label="Evolución del rating"
    >
      <defs>
        <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(72% 0.21 145 / 0.45)" />
          <stop offset="100%" stopColor="oklch(72% 0.21 145 / 0)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#ratingFill)" />
      <path
        d={path}
        fill="none"
        stroke="oklch(72% 0.21 145)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
