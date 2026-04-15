import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';

export async function NotificationBell() {
  const session = await getSession();
  if (!session) return null;
  const repo = await getRepo();
  const notes = await repo.listNotifications(session.userId);
  const unread = notes.filter((n) => !n.readAt).length;

  return (
    <Link
      href="/app/notifications"
      aria-label={unread > 0 ? `Notificaciones (${unread} sin leer)` : 'Notificaciones'}
      className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] text-[color:var(--color-ink-soft)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--color-accent)]/40 hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)]"
    >
      <Bell className="h-5 w-5" aria-hidden />
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[color:var(--color-spark)] px-1 font-[family-name:var(--font-display)] text-[0.7rem] font-bold text-[color:var(--color-spark-ink)] tabular-nums shadow-[0_0_0_2px_var(--color-bg)]"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
    </Link>
  );
}
