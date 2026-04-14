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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-[color:var(--color-surface)]/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-xl">
        {items.map(({ href, label, Icon }) => {
          const active = path === href || (href !== '/app' && path.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-xs',
                  active
                    ? 'text-[color:var(--color-accent)]'
                    : 'text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
