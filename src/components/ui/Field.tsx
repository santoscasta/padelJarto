import { cn } from '@/lib/utils/cn';

export function Field({
  label, hint, error, className, children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-sm font-medium text-[color:var(--color-ink)]">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-[color:var(--color-danger)]">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-[color:var(--color-ink-soft)]">{hint}</span>
      ) : null}
    </label>
  );
}
