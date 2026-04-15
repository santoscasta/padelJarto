import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils/cn';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

type Player = Readonly<{ displayName: string; avatarUrl: string | null }>;

type PairLineProps = Readonly<{
  playerA: Player | null | undefined;
  playerB: Player | null | undefined;
  size?: AvatarSize;
  /** Glyph between the two names. Default "/". */
  separator?: string;
  className?: string;
  /** Hide names and only render stacked avatars. */
  avatarsOnly?: boolean;
}>;

/**
 * Pair of players rendered as overlapping avatars + "Name / Name". Keeps the
 * presentation consistent across groups, knockout, and pair-management UIs.
 */
export function PairLine({
  playerA,
  playerB,
  size = 'sm',
  separator = '/',
  className,
  avatarsOnly = false,
}: PairLineProps) {
  const nameA = playerA?.displayName ?? '—';
  const nameB = playerB?.displayName ?? '—';
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      <span className="flex shrink-0 -space-x-2">
        <Avatar
          src={playerA?.avatarUrl ?? null}
          name={nameA}
          size={size}
          className="ring-2 ring-[color:var(--color-surface)]"
        />
        <Avatar
          src={playerB?.avatarUrl ?? null}
          name={nameB}
          size={size}
          className="ring-2 ring-[color:var(--color-surface)]"
        />
      </span>
      {avatarsOnly ? null : (
        <span className="min-w-0 truncate text-sm font-medium text-[color:var(--color-ink)]">
          {nameA} <span className="text-[color:var(--color-ink-mute)]">{separator}</span> {nameB}
        </span>
      )}
    </span>
  );
}
