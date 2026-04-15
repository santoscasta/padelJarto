import { Bell, ShieldCheck, Trophy, Flag, UserPlus, ClipboardCheck } from 'lucide-react';
import type { ComponentType } from 'react';
import { Card, CardEyebrow } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { requireSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { MarkReadButton } from './MarkReadButton';
import { cn } from '@/lib/utils/cn';
import type { NotificationKind } from '@/lib/domain/types';

const KIND_LABEL: Record<NotificationKind, string> = {
  inscription_new: 'Nueva inscripción',
  tournament_open: 'Inscripciones abiertas',
  tournament_started: 'Torneo arrancado',
  result_reported: 'Resultado reportado',
  result_validated: 'Resultado validado',
};

const KIND_ICON: Record<NotificationKind, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  inscription_new: UserPlus,
  tournament_open: Trophy,
  tournament_started: Flag,
  result_reported: ClipboardCheck,
  result_validated: ShieldCheck,
};

const KIND_TONE: Record<NotificationKind, 'accent' | 'spark' | 'info' | 'ok' | 'warn'> = {
  inscription_new: 'info',
  tournament_open: 'accent',
  tournament_started: 'spark',
  result_reported: 'warn',
  result_validated: 'ok',
};

export default async function NotificationsPage() {
  const session = await requireSession();
  const repo = await getRepo();
  const notes = await repo.listNotifications(session.userId);
  const unreadCount = notes.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <CardEyebrow>Actividad</CardEyebrow>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[length:var(--text-display)] font-bold uppercase tracking-tight">
            Notificaciones
          </h1>
        </div>
        {unreadCount > 0 ? (
          <Badge tone="spark">{unreadCount} sin leer</Badge>
        ) : null}
      </header>

      {notes.length === 0 ? (
        <Card variant="flat" className="border border-dashed border-[color:var(--color-line)] py-10 text-center">
          <Bell className="mx-auto h-10 w-10 text-[color:var(--color-ink-mute)]" aria-hidden />
          <p className="mt-4 font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-tight">
            Todo en silencio
          </p>
          <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
            Cuando pase algo en tus torneos lo verás aquí.
          </p>
        </Card>
      ) : (
        <ol className="relative space-y-3 pl-6">
          <span
            aria-hidden="true"
            className="absolute left-3 top-1 bottom-1 w-px bg-[color:var(--color-line)]"
          />
          {notes.map((n) => {
            const kind = n.kind as NotificationKind;
            const Icon = KIND_ICON[kind] ?? Bell;
            const tone = KIND_TONE[kind] ?? 'accent';
            const isUnread = !n.readAt;
            return (
              <li key={n.id} className="relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute -left-[1.0625rem] top-5 grid h-6 w-6 place-items-center rounded-full border-2 border-[color:var(--color-bg)]',
                    isUnread
                      ? 'bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]'
                      : 'bg-[color:var(--color-surface-3)] text-[color:var(--color-ink-mute)]',
                  )}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                </span>
                <Card
                  className={cn(
                    'transition-colors',
                    isUnread ? '' : 'opacity-70',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge tone={tone}>{KIND_LABEL[kind] ?? kind}</Badge>
                      <p className="mt-2 text-xs text-[color:var(--color-ink-soft)]">
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>
                    {isUnread ? <MarkReadButton id={n.id} /> : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const sec = Math.round(diffMs / 1000);
    if (sec < 60) return 'hace unos segundos';
    const min = Math.round(sec / 60);
    if (min < 60) return `hace ${min} min`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `hace ${hr} h`;
    const day = Math.round(hr / 24);
    if (day < 7) return `hace ${day} d`;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}
