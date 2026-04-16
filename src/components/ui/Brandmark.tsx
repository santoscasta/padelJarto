import { cn } from '@/lib/utils/cn';

type Props = Readonly<{
  /** Square side length in pixels. Default 32. */
  size?: number;
  className?: string;
}>;

/**
 * Vectorial counterpart of /public/icons/icon-source.png — a green padel ball
 * on a rounded-square tile. Used in header wordmarks, login hero, and the
 * landing nav. SVG stays crisp at small sizes where a rasterized PNG would
 * alias; the raster master still powers the favicon, apple-touch and PWA
 * manifest icons.
 */
export function Brandmark({ size = 32, className }: Props) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-[var(--radius-md)] bg-[color:var(--color-bg)] ring-1 ring-[color:var(--color-line)]',
        className,
      )}
    >
      <svg
        viewBox="0 0 64 64"
        width="72%"
        height="72%"
        fill="none"
        aria-hidden="true"
      >
        {/* Ball body */}
        <circle cx="32" cy="32" r="26" fill="var(--color-accent)" />
        {/* Soft top highlight */}
        <circle cx="24" cy="22" r="12" fill="#ffffff" opacity="0.18" />
        {/* White seam — single flowing S curve from top-left rim to bottom-right rim */}
        <path
          d="M 9 24 C 22 18, 32 34, 45 28 C 52 24, 55 32, 55 40"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
