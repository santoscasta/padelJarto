import Link from 'next/link';
import { Bell } from 'lucide-react';
import { getSession } from '@/lib/auth/session';
import { getRepo } from '@/lib/repositories/provider';
import { Badge } from '@/components/ui/Badge';

export async function NotificationBell() {
  const session = await getSession();
  if (!session) return null;
  const repo = await getRepo();
  const notes = await repo.listNotifications(session.userId);
  const unread = notes.filter((n) => !n.readAt).length;
  return (
    <Link href="/app/notifications" aria-label="Notificaciones" className="relative inline-flex items-center gap-2">
      <Bell className="h-5 w-5" aria-hidden />
      {unread > 0 ? <Badge tone="accent">{unread}</Badge> : null}
    </Link>
  );
}
