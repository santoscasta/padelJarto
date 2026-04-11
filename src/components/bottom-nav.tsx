"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Swords, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/app", label: "Inicio", icon: Home },
  { href: "/app/tournaments", label: "Torneos", icon: Trophy },
  { href: "/app/matches", label: "Partidos", icon: Swords },
  { href: "/app/profile", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/90 backdrop-blur-lg sm:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/app" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-medium transition ${
                isActive
                  ? "text-[#f97316]"
                  : "text-[#a8a29e] hover:text-[#fff7ed]"
              }`}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
