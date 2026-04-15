import Link from 'next/link';
import { Plus, Trophy, ArrowRight } from 'lucide-react';
import { Card, CardEyebrow } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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

export default async function TournamentsPage() {
  const repo = await getRepo();
  const tournaments = await repo.listTournaments();
  const active = tournaments.filter((t) => t.status !== 'complete');
  const closed = tournaments.filter((t) => t.status === 'complete');

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <CardEyebrow>Torneos</CardEyebrow>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[length:var(--text-display)] font-bold uppercase tracking-tight">
            Tu calendario
          </h1>
        </div>
        <Button asChild size="sm">
          <Link href="/app/tournaments/new">
            <Plus className="h-4 w-4" aria-hidden /> Nuevo
          </Link>
        </Button>
      </header>

      {tournaments.length === 0 ? (
        <Card variant="flat" className="border border-dashed border-[color:var(--color-line)] py-10 text-center">
          <Trophy className="mx-auto h-10 w-10 text-[color:var(--color-ink-mute)]" aria-hidden />
          <p className="mt-4 font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-tight">
            Aún no hay torneos
          </p>
          <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
            Crea el primero en menos de un minuto.
          </p>
          <div className="mt-5">
            <Button asChild>
              <Link href="/app/tournaments/new">Crear torneo</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {active.length > 0 ? (
            <section aria-labelledby="active-h" className="space-y-3">
              <h2
                id="active-h"
                className="font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-tight"
              >
                Activos
              </h2>
              <ul className="space-y-3">
                {active.map((t) => (
                  <li key={t.id}>
                    <TournamentCard
                      id={t.id}
                      name={t.name}
                      status={t.status}
                      meta={`${t.size} parejas · ${t.groupCount === 1 ? 'grupo único' : `${t.groupCount} grupos`} · top ${t.playoffCutoff}`}
                      startsAt={t.startsAt}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {closed.length > 0 ? (
            <section aria-labelledby="closed-h" className="space-y-3">
              <h2
                id="closed-h"
                className="font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-tight"
              >
                Cerrados
              </h2>
              <ul className="space-y-2">
                {closed.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/app/tournaments/${t.id}`}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3 text-sm transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--color-accent)]/40"
                    >
                      <span className="truncate font-medium">{t.name}</span>
                      <Badge tone="neutral">Cerrado</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function TournamentCard({
  id,
  name,
  status,
  meta,
  startsAt,
}: {
  id: string;
  name: string;
  status: keyof typeof STATUS_TONE;
  meta: string;
  startsAt: string | null;
}) {
  return (
    <Link
      href={`/app/tournaments/${id}`}
      className="group block rounded-[var(--radius-lg)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)]"
    >
      <Card className="cursor-pointer transition-colors duration-[var(--duration-fast)] group-hover:border-[color:var(--color-accent)]/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-tight">
              {name}
            </p>
            <p className="mt-1 text-xs text-[color:var(--color-ink-soft)]">{meta}</p>
            {startsAt ? (
              <p className="mt-2 text-xs font-medium text-[color:var(--color-ink-mute)]">
                {formatStartDate(startsAt)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status] ?? status}</Badge>
            <ArrowRight
              className="h-4 w-4 text-[color:var(--color-ink-mute)] transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-[color:var(--color-accent)]"
              aria-hidden
            />
          </div>
        </div>
      </Card>
    </Link>
  );
}

function formatStartDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
