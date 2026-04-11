"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { markAllReadAction } from "@/app/app/notifications/actions";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
  entityType?: string;
  entityId?: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function typeIcon(type: string): string {
  switch (type) {
    case "invitation": return "\u{1F4E9}";
    case "match_pending": return "\u{1F3F8}";
    case "validation_needed": return "\u2705";
    case "dispute": return "\u26A0\uFE0F";
    case "result_confirmed": return "\u{1F3C6}";
    case "tournament_update": return "\u{1F4E2}";
    default: return "\u{1F514}";
  }
}

export function NotificationBell({
  notifications,
  unreadCount,
}: Readonly<{
  notifications: NotificationItem[];
  unreadCount: number;
}>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
        aria-label="Notificaciones"
      >
        <Bell className="size-4 text-[#d6d3d1]" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#f97316] text-[10px] font-bold text-[#1c1917]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-white/10 bg-[#1a1412] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold">Notificaciones</p>
            {unreadCount > 0 && (
              <form action={markAllReadAction}>
                <button type="submit" className="text-xs text-[#f97316] hover:underline">
                  Marcar todas
                </button>
              </form>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[#a8a29e]">Sin notificaciones</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/5 ${
                    !n.read ? "bg-white/[0.03]" : ""
                  }`}
                >
                  <span className="mt-0.5 text-lg">{typeIcon(n.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!n.read ? "font-semibold" : "text-[#d6d3d1]"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-[#a8a29e] line-clamp-2">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-[#a8a29e]">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <div className="mt-1.5 size-2 shrink-0 rounded-full bg-[#f97316]" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
