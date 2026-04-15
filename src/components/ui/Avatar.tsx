import { cn } from '@/lib/utils/cn';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<Size, string> = {
  xs: 'h-6 w-6 text-[0.65rem]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

type AvatarProps = Readonly<{
  src: string | null | undefined;
  name: string;
  size?: Size;
  className?: string;
}>;

/**
 * Circular avatar. Shows the image when available (Google profile picture for
 * OAuth users) and falls back to initials on a tinted surface. Plain <img> is
 * used instead of next/image because Google's CDN rotates URLs frequently —
 * next/image's remote pattern allowlist would need maintenance and the CSP
 * already allows https: img sources.
 */
export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name);
  const base =
    'inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden border border-black/10 bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)] font-semibold uppercase tracking-tight select-none';

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ? `Avatar de ${name}` : ''}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        className={cn(base, sizeClasses[size], 'object-cover', className)}
      />
    );
  }

  return (
    <span aria-hidden={!name} className={cn(base, sizeClasses[size], className)}>
      {initials}
    </span>
  );
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '·';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
