'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Users, UserRound, Home } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const items = [
  { href: '/app', label: 'Inicio', Icon: Home },
  { href: '/app/tournaments', label: 'Torneos', Icon: Trophy },
  { href: '/app/leaderboard', label: 'Ranking', Icon: Users },
  { href: '/app/me', label: 'Yo', Icon: UserRound },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 pb-3 pt-8 [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-[color:var(--color-bg)] from-55% to-transparent"
      />
      <div className="relative flex justify-center px-4">
        <ul className="flex w-full max-w-sm items-stretch gap-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-1.5 shadow-[var(--shadow-lift)]">
          {items.map(({ href, label, Icon }) => {
            const active = href === '/app' ? path === '/app' : path.startsWith(href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-full transition-colors duration-[var(--duration-fast)]',
                    active
                      ? 'bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)] shadow-[var(--shadow-glow)]'
                      : 'text-[color:var(--color-ink-soft)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-ink)]',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span
                    className={cn(
                      'overflow-hidden whitespace-nowrap text-xs font-semibold tracking-tight transition-[max-width,opacity] duration-[var(--duration-normal)]',
                      active ? 'max-w-[5rem] opacity-100' : 'max-w-0 opacity-0',
                    )}
                  >
                    {label}
                  </span>
                  <span className="sr-only">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
