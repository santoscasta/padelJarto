import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getRepo } from '@/lib/repositories/provider';

const STATUS_TONE = {
  draft: 'neutral', open: 'accent', groups: 'ok', knockout: 'warn', complete: 'neutral',
} as const;

export default async function TournamentsPage() {
  const repo = await getRepo();
  const tournaments = await repo.listTournaments();
  return (
    <section className="space-y-4">
      <CardHeader>
        <CardTitle>Torneos</CardTitle>
        <Button asChild size="sm"><Link href="/app/tournaments/new">Nuevo</Link></Button>
      </CardHeader>
      {tournaments.length === 0 ? (
        <Card>
          <p className="text-sm text-[color:var(--color-ink-soft)]">Aún no hay torneos. Crea el primero.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {tournaments.map((t) => (
            <li key={t.id}>
              <Link href={`/app/tournaments/${t.id}`}>
                <Card className="hover:ring-2 hover:ring-[color:var(--color-accent)]/40 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold">{t.name}</p>
                      <p className="text-xs text-[color:var(--color-ink-soft)]">
                        {t.size} parejas · {t.groupCount === 1 ? 'grupo único' : `${t.groupCount} grupos`} · play-off top {t.playoffCutoff}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
