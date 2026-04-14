import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { MarkReadButton } from './MarkReadButton';

export default async function NotificationsPage() {
  const session = await requireSession();
  const repo = await getRepo();
  const notes = await repo.listNotifications(session.userId);
  return (
    <section className="space-y-4">
      <CardHeader><CardTitle>Notificaciones</CardTitle></CardHeader>
      {notes.length === 0 ? (
        <Card><p className="text-sm text-[color:var(--color-ink-soft)]">Sin notificaciones.</p></Card>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id}>
              <Card className={n.readAt ? 'opacity-70' : ''}>
                <div className="flex items-center justify-between">
                  <div>
                    <Badge tone="accent">{n.kind}</Badge>
                    <p className="mt-2 text-xs text-[color:var(--color-ink-soft)]">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.readAt ? <MarkReadButton id={n.id} /> : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
