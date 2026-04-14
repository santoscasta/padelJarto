import Link from 'next/link';
import { Suspense } from 'react';
import { BottomNav } from '@/components/shell/BottomNav';
import { NotificationBell } from '@/components/shell/NotificationBell';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-20">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[color:var(--color-surface)]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <Link href="/app" className="font-semibold tracking-tight">Padeljarto</Link>
          <Suspense fallback={null}>
            <NotificationBell />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
      <InstallPrompt />
      <BottomNav />
    </div>
  );
}
