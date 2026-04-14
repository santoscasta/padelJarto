import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';

export default async function AppHomePage() {
  const session = await requireSession();
  const repo = await getRepo();
  const tournaments = await repo.listTournaments();
  const active = tournaments.filter((t) => t.status === 'open' || t.status === 'groups' || t.status === 'knockout');

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm text-[color:var(--color-ink-soft)]">Hola,</p>
        <h1 className="text-[length:var(--text-display)] font-semibold tracking-tight">
          {session.displayName}
        </h1>
      </section>

      <section className="grid gap-3">
        <Card>
          <h2 className="text-base font-semibold">Crear torneo</h2>
          <p className="mb-4 text-sm text-[color:var(--color-ink-soft)]">
            Configura grupos, parejas y play-off en 30 segundos.
          </p>
          <Button asChild>
            <Link href="/app/tournaments/new">Nuevo torneo</Link>
          </Button>
        </Card>

        {active.length > 0 ? (
          <Card>
            <h2 className="text-base font-semibold">En marcha</h2>
            <ul className="divide-y divide-black/5">
              {active.map((t) => (
                <li key={t.id}>
                  <Link href={`/app/tournaments/${t.id}`} className="flex items-center justify-between py-3">
                    <span>{t.name}</span>
                    <span className="text-xs uppercase tracking-wider text-[color:var(--color-ink-soft)]">{t.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
