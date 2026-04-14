import { cn } from '@/lib/utils/cn';

type Tone = 'neutral' | 'accent' | 'warn' | 'ok' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)]',
  accent: 'bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)]',
  warn: 'bg-[color:var(--color-warn)]/15 text-[color:var(--color-warn)]',
  ok: 'bg-[color:var(--color-ok)]/15 text-[color:var(--color-ok)]',
  danger: 'bg-[color:var(--color-danger)]/15 text-[color:var(--color-danger)]',
};

export function Badge({
  tone = 'neutral',
  className,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium tracking-wide',
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
