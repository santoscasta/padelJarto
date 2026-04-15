import { cn } from '@/lib/utils/cn';

type Tone = 'neutral' | 'accent' | 'spark' | 'warn' | 'ok' | 'danger' | 'info';

const tones: Record<Tone, string> = {
  neutral:
    'bg-[color:var(--color-surface-3)] text-[color:var(--color-ink-soft)] border-[color:var(--color-line)]',
  accent:
    'bg-[color:var(--color-accent)]/15 text-[color:var(--color-accent)] border-[color:var(--color-accent)]/30',
  spark:
    'bg-[color:var(--color-spark)]/15 text-[color:var(--color-spark)] border-[color:var(--color-spark)]/30',
  warn:
    'bg-[color:var(--color-warn)]/15 text-[color:var(--color-warn)] border-[color:var(--color-warn)]/30',
  ok:
    'bg-[color:var(--color-ok)]/15 text-[color:var(--color-ok)] border-[color:var(--color-ok)]/30',
  danger:
    'bg-[color:var(--color-danger)]/15 text-[color:var(--color-danger)] border-[color:var(--color-danger)]/30',
  info:
    'bg-[color:var(--color-info)]/15 text-[color:var(--color-info)] border-[color:var(--color-info)]/30',
};

export function Badge({
  tone = 'neutral',
  className,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full border px-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em]',
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
