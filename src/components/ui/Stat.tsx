import { cn } from '@/lib/utils/cn';

type StatProps = Readonly<{
  /** Big condensed number / value */
  value: React.ReactNode;
  /** Eyebrow label above the value */
  label: string;
  /** Small caption below the value (e.g. delta, sub-unit) */
  hint?: string;
  /** Optional value tone — accent, spark, danger, ok */
  tone?: 'default' | 'accent' | 'spark' | 'ok' | 'danger';
  className?: string;
}>;

const tones: Record<NonNullable<StatProps['tone']>, string> = {
  default: 'text-[color:var(--color-ink)]',
  accent: 'text-[color:var(--color-accent)]',
  spark: 'text-[color:var(--color-spark)]',
  ok: 'text-[color:var(--color-ok)]',
  danger: 'text-[color:var(--color-danger)]',
};

export function Stat({ value, label, hint, tone = 'default', className }: StatProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-ink-mute)]">
        {label}
      </span>
      <span
        className={cn(
          'font-[family-name:var(--font-display)] text-[length:var(--text-stat)] font-bold leading-none tracking-tight tabular-nums',
          tones[tone],
        )}
      >
        {value}
      </span>
      {hint ? (
        <span className="text-xs text-[color:var(--color-ink-soft)]">{hint}</span>
      ) : null}
    </div>
  );
}
