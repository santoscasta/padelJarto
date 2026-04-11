import Link from "next/link";
import { CalendarRange, LogOut, Mail, Plus, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { signOutAction } from "@/app/auth-actions";
import { initialsFromName } from "@/lib/utils";
import type { Notification, Profile } from "@/lib/domain/types";

export async function AppShell({
  children,
  currentUser,
  notifications = [],
}: Readonly<{
  children: React.ReactNode;
  currentUser: Profile;
  notifications?: Notification[];
}>) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.25),_transparent_32%),linear-gradient(180deg,#0f0c0b_0%,#191311_48%,#120f0e_100%)] text-[#fff7ed]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-20 pt-4 sm:px-6 sm:pb-0">
        <header className="mb-6 rounded-[30px] border border-white/10 bg-black/25 px-5 py-4 backdrop-blur sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f97316] text-lg font-black text-[#1c1917]">
                PF
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-[family:var(--font-display)] text-2xl tracking-tight">PadelFlow</p>
                  <Badge>Torneos</Badge>
                </div>
                <p className="text-sm text-[#d6d3d1]">
                  Gestión de torneos con liguilla, playoffs e invitaciones.
                </p>
              </div>
            </div>

            <nav className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="hidden items-center gap-2 sm:flex">
                <Button asChild variant="ghost">
                  <Link href="/app">
                    <CalendarRange className="mr-2 size-4" />
                    Inicio
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/app/invitations">
                    <Mail className="mr-2 size-4" />
                    Invitaciones
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/app/tournaments/new">
                    <Plus className="mr-2 size-4" />
                    Nuevo torneo
                  </Link>
                </Button>
              </div>

              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <NotificationBell notifications={notifications} />
                <Link
                  href="/app/profile"
                  className="flex size-10 items-center justify-center rounded-full bg-[#1f2937] text-sm font-semibold text-[#fde68a] transition-colors hover:bg-[#374151]"
                  title="Mi perfil"
                >
                  {initialsFromName(currentUser.fullName)}
                </Link>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold">{currentUser.fullName}</p>
                  <p className="text-xs text-[#d6d3d1]">{currentUser.email}</p>
                </div>
                <form action={signOutAction}>
                  <Button className="h-9 px-4" type="submit" variant="secondary">
                    <LogOut className="mr-2 size-4" />
                    Salir
                  </Button>
                </form>
              </div>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-8 flex items-center justify-between border-t border-white/10 px-2 py-4 text-sm text-[#d6d3d1]">
          <p>PadelFlow — Torneos de pádel sin fricción.</p>
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-[#fb923c]" />
            <span>Liguilla + Playoff + Parejas variables</span>
          </div>
        </footer>

        <BottomNav />
      </div>
    </div>
  );
}
