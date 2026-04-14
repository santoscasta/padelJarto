import { cn } from '@/lib/utils/cn';

export const Input = ({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      'h-10 w-full rounded-[var(--radius-md)] px-3 text-base',
      'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink-soft)]',
      'ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]',
      className,
    )}
    {...rest}
  />
);

export const Select = ({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className={cn(
      'h-10 w-full rounded-[var(--radius-md)] px-3 text-base',
      'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)]',
      'ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]',
      className,
    )}
    {...rest}
  >
    {children}
  </select>
);
