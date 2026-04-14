import { cn } from '@/lib/utils/cn';

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] bg-[color:var(--color-surface)] ring-1 ring-black/5',
        'shadow-[var(--shadow-card)] p-5',
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-baseline justify-between gap-4', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-[length:var(--text-h1)] font-semibold', className)} {...rest} />;
}
