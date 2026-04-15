import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { Avatar } from '@/components/ui/Avatar';

/**
 * Compact identity chip rendered in the top app bar. Shows the player's
 * Google avatar (or initials) and links to the profile page. Hidden when
 * there's no session (e.g. on /app routes accessed mid-redirect).
 */
export async function TopUserBadge() {
  const session = await getSession().catch(() => null);
  if (!session) return null;

  return (
    <Link
      href={`/app/players/${session.player.id}`}
      aria-label={`Mi perfil — ${session.displayName}`}
      className="flex cursor-pointer items-center gap-2 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] py-1 pl-1 pr-3 transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--color-accent)]/40 hover:bg-[color:var(--color-surface-2)]"
    >
      <Avatar src={session.player.avatarUrl} name={session.displayName} size="sm" />
      <span className="hidden text-sm font-medium text-[color:var(--color-ink)] sm:inline">
        {firstName(session.displayName)}
      </span>
    </Link>
  );
}

function firstName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? full;
}
