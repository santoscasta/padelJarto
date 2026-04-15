import { cn } from '@/lib/utils/cn';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Visual treatment. "default" is the standard surface; "raised" lifts via shadow;
   *  "flat" drops the border; "spotlight" highlights with the brand glow. */
  variant?: 'default' | 'raised' | 'flat' | 'spotlight';
};

const variants: Record<NonNullable<CardProps['variant']>, string> = {
  default:
    'bg-[color:var(--color-surface)] border border-[color:var(--color-line)] shadow-[var(--shadow-card)]',
  raised:
    'bg-[color:var(--color-surface)] border border-[color:var(--color-line)] shadow-[var(--shadow-lift)]',
  flat:
    'bg-[color:var(--color-surface)]',
  spotlight:
    'border border-[color:var(--color-accent)]/30 shadow-[var(--shadow-glow)] bg-[linear-gradient(180deg,oklch(72%_0.21_145/0.12)_0%,oklch(17%_0.014_260)_70%)]',
};

export function Card({ className, variant = 'default', ...rest }: CardProps) {
  return (
    <div
      className={cn('rounded-[var(--radius-lg)] p-5', variants[variant], className)}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mb-4 flex items-baseline justify-between gap-4', className)}
      {...rest}
    />
  );
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'font-[family-name:var(--font-display)] text-[length:var(--text-h1)] font-semibold uppercase tracking-tight',
        className,
      )}
      {...rest}
    />
  );
}

export function CardEyebrow({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-ink-mute)]',
        className,
      )}
      {...rest}
    />
  );
}
