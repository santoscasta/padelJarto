import { cn } from '@/lib/utils/cn';

const fieldClasses =
  'h-11 w-full rounded-[var(--radius-md)] px-3.5 text-base ' +
  'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)] ' +
  'placeholder:text-[color:var(--color-ink-mute)] ' +
  'border border-[color:var(--color-line)] ' +
  'transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] ' +
  'focus:outline-none focus:border-[color:var(--color-accent)] ' +
  'focus:shadow-[0_0_0_3px_oklch(72%_0.21_145/0.18)]';

export const Input = ({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(fieldClasses, className)} {...rest} />
);

export const Select = ({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(fieldClasses, 'cursor-pointer appearance-none pr-9', className)} {...rest}>
    {children}
  </select>
);
