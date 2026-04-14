import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium ' +
  'transition-[transform,background,color,border-color] duration-[var(--duration-fast)] ' +
  'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] disabled:opacity-60 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary: 'bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] hover:brightness-110',
  secondary: 'bg-[color:var(--color-surface-2)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-2)]/90',
  ghost: 'bg-transparent text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface-2)]',
  danger: 'bg-[color:var(--color-danger)] text-white hover:brightness-110',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-base',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: Variant;
  size?: Size;
};

export function Button({ asChild, variant = 'primary', size = 'md', className, ...rest }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(base, variants[variant], sizes[size], className)} {...rest} />;
}
