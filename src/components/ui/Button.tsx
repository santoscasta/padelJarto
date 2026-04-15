import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-pill)] font-semibold ' +
  'transition-[transform,background-color,color,border-color,box-shadow] duration-[var(--duration-fast)] ' +
  'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-[color:var(--color-bg)] ' +
  'disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap';

const variants: Record<Variant, string> = {
  primary:
    'bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] ' +
    'hover:brightness-110 hover:shadow-[var(--shadow-glow)]',
  secondary:
    'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)] border border-[color:var(--color-line)] ' +
    'hover:bg-[color:var(--color-surface-3)]',
  ghost:
    'bg-transparent text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-2)]',
  danger:
    'bg-[color:var(--color-danger)] text-white hover:brightness-110',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: Variant;
  size?: Size;
};

export function Button({
  asChild,
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(base, variants[variant], sizes[size], className)} {...rest} />;
}
