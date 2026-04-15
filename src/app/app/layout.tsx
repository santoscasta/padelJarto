import Link from 'next/link';
import { Suspense } from 'react';
import { BottomNav } from '@/components/shell/BottomNav';
import { NotificationBell } from '@/components/shell/NotificationBell';
import { TopUserBadge } from '@/components/shell/TopUserBadge';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-[color:var(--color-bg)] pb-32">
      {/* Ambient brand glow behind the top header */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-72 overflow-hidden"
      >
        <div
          className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side, oklch(72% 0.21 145 / 0.45), transparent 70%)',
          }}
        />
      </div>

      <header className="sticky top-0 z-30 border-b border-[color:var(--color-line)]/60 bg-[color:var(--color-bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link
            href="/app"
            className="flex cursor-pointer items-center gap-2 text-[color:var(--color-ink)] transition-colors hover:text-[color:var(--color-accent)]"
          >
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-[var(--radius-md)] bg-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <circle cx="12" cy="12" r="8" />
                <path d="M6 12h12M12 6v12" opacity="0.5" />
              </svg>
            </span>
            <span className="font-[family-name:var(--font-display)] text-base font-bold uppercase tracking-tight">
              Padeljarto
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <NotificationBell />
            </Suspense>
            <Suspense fallback={null}>
              <TopUserBadge />
            </Suspense>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-4 py-6 sm:py-8">{children}</main>

      <InstallPrompt />
      <BottomNav />
    </div>
  );
}
