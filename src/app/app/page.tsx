import Link from 'next/link';
import { Plus, ArrowRight, Trophy, Target, Flame } from 'lucide-react';
import { Card, CardEyebrow } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Stat } from '@/components/ui/Stat';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  groups: 'Grupos',
  knockout: 'Play-off',
  complete: 'Cerrado',
};

const STATUS_TONE = {
  draft: 'neutral',
  open: 'accent',
  groups: 'info',
  knockout: 'spark',
  complete: 'neutral',
} as const;

export default async function AppHomePage() {
  const session = await requireSession();
  const repo = await getRepo();
  const [tournaments, snapshots] = await Promise.all([
    repo.listTournaments(),
    repo.listRatingSnapshotsForSubject('player', session.player.id),
  ]);

  const active = tournaments.filter(
    (t) => t.status === 'open' || t.status === 'groups' || t.status === 'knockout',
  );
  const closed = tournaments.filter((t) => t.status === 'complete');

  const lastDelta =
    snapshots.length === 0 ? 0 : snapshots[snapshots.length - 1].delta;
  const matchesPlayed = session.player.matchesPlayed;
  const rating = Math.round(session.player.rating);

  return (
    <div className="space-y-8">
      <AthleteHero
        name={session.displayName}
        avatarUrl={session.player.avatarUrl}
        rating={rating}
        matchesPlayed={matchesPlayed}
        delta={Math.round(lastDelta)}
      />

      <section aria-labelledby="actions-heading" className="grid grid-cols-2 gap-3">
        <h2 id="actions-heading" className="sr-only">Acciones rápidas</h2>
        <ActionTile
          href="/app/tournaments/new"
          label="Crear torneo"
          sublabel="30 segundos"
          Icon={Plus}
          tone="accent"
        />
        <ActionTile
          href="/app/leaderboard"
          label="Ver ranking"
          sublabel="Tu posición"
          Icon={Trophy}
          tone="muted"
        />
      </section>

      <section aria-labelledby="active-heading" className="space-y-3">
        <header className="flex items-baseline justify-between">
          <h2
            id="active-heading"
            className="font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-tight"
          >
            En juego
          </h2>
          <Link
            href="/app/tournaments"
            className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-ink-soft)] transition-colors hover:text-[color:var(--color-accent)]"
          >
            Ver todos →
          </Link>
        </header>

        {active.length === 0 ? (
          <Card variant="flat" className="border border-dashed border-[color:var(--color-line)]">
            <div className="flex flex-col items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--color-surface-2)] text-[color:var(--color-ink-mute)]">
                <Target className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-semibold">Sin torneos en marcha</p>
                <p className="text-sm text-[color:var(--color-ink-soft)]">
                  Crea uno y empieza a jugar este finde.
                </p>
              </div>
              <Button asChild size="sm">
                <Link href="/app/tournaments/new">Nuevo torneo</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <ul className="space-y-3">
            {active.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/app/tournaments/${t.id}`}
                  className="group block rounded-[var(--radius-lg)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)]"
                >
                  <Card className="cursor-pointer transition-colors duration-[var(--duration-fast)] group-hover:border-[color:var(--color-accent)]/40">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-tight">
                          {t.name}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-ink-soft)]">
                          {t.size} parejas · {t.groupCount === 1 ? 'grupo único' : `${t.groupCount} grupos`} · top {t.playoffCutoff}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={STATUS_TONE[t.status as keyof typeof STATUS_TONE]}>
                          {STATUS_LABEL[t.status] ?? t.status}
                        </Badge>
                        <ArrowRight
                          className="h-4 w-4 text-[color:var(--color-ink-mute)] transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-[color:var(--color-accent)]"
                          aria-hidden
                        />
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {closed.length > 0 ? (
        <section aria-labelledby="closed-heading" className="space-y-3">
          <h2
            id="closed-heading"
            className="font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-tight"
          >
            Cerrados
          </h2>
          <ul className="space-y-2">
            {closed.slice(0, 3).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/app/tournaments/${t.id}`}
                  className="flex cursor-pointer items-center justify-between rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3 text-sm transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--color-accent)]/40"
                >
                  <span className="font-medium">{t.name}</span>
                  <Badge tone="neutral">Cerrado</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ hero */

function AthleteHero({
  name,
  avatarUrl,
  rating,
  matchesPlayed,
  delta,
}: {
  name: string;
  avatarUrl: string | null;
  rating: number;
  matchesPlayed: number;
  delta: number;
}) {
  const deltaTone: 'ok' | 'danger' | 'default' =
    delta > 0 ? 'ok' : delta < 0 ? 'danger' : 'default';
  const deltaPrefix = delta > 0 ? '+' : '';
  return (
    <Card variant="spotlight" className="overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar src={avatarUrl} name={name} size="xl" />
          <div className="min-w-0">
            <CardEyebrow>Buenas</CardEyebrow>
            <h1 className="mt-1 truncate font-[family-name:var(--font-display)] text-[length:var(--text-display)] font-bold uppercase tracking-tight">
              {name}
            </h1>
          </div>
        </div>
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-spark)]/15 text-[color:var(--color-spark)] sm:inline-flex">
          <Flame className="h-5 w-5" aria-hidden />
        </span>
      </div>

      <dl className="mt-7 grid grid-cols-3 gap-4">
        <Stat value={rating} label="Rating" tone="accent" />
        <Stat value={matchesPlayed} label="Partidos" />
        <Stat
          value={`${deltaPrefix}${delta}`}
          label="Último Δ"
          tone={deltaTone}
        />
      </dl>
    </Card>
  );
}

/* ------------------------------------------------------------------ tile */

type ActionTileProps = {
  href: string;
  label: string;
  sublabel: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  tone: 'accent' | 'muted';
};

function ActionTile({ href, label, sublabel, Icon, tone }: ActionTileProps) {
  const styles =
    tone === 'accent'
      ? 'border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/10 hover:bg-[color:var(--color-accent)]/15'
      : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)] hover:border-[color:var(--color-accent)]/40';
  const iconStyles =
    tone === 'accent'
      ? 'bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]'
      : 'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)]';
  return (
    <Link
      href={href}
      className={`flex cursor-pointer flex-col gap-3 rounded-[var(--radius-lg)] border p-4 transition-colors duration-[var(--duration-fast)] ${styles}`}
    >
      <span className={`grid h-10 w-10 place-items-center rounded-full ${iconStyles}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span>
        <span className="block font-[family-name:var(--font-display)] text-base font-bold uppercase tracking-tight">
          {label}
        </span>
        <span className="block text-xs text-[color:var(--color-ink-soft)]">{sublabel}</span>
      </span>
    </Link>
  );
}
