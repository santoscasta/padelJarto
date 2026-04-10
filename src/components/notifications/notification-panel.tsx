"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { X } from "lucide-react";
import type { Notification } from "@/lib/domain/types";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/app/app/actions";

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
}

export function NotificationPanel({ notifications, onClose }: NotificationPanelProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-white/10 bg-[#1c1917] shadow-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Notificaciones</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <form action={markAllNotificationsReadAction}>
              <button
                type="submit"
                className="text-xs text-[#fdba74] hover:text-[#f97316]"
              >
                Marcar todas
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#a8a29e] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[#a8a29e]">
            Sin notificaciones
          </p>
        ) : (
          notifications.map((notification) => (
            <form key={notification.id} action={markNotificationReadAction}>
              <input type="hidden" name="notificationId" value={notification.id} />
              <button
                type="submit"
                className={`w-full border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                  notification.read ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {!notification.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f97316]" />
                  )}
                  <div className={notification.read ? "pl-4" : ""}>
                    <p className="text-sm font-medium text-white">
                      {notification.title}
                    </p>
                    {notification.body && (
                      <p className="mt-0.5 text-xs text-[#a8a29e]">
                        {notification.body}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-[#78716c]">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>
              </button>
            </form>
          ))
        )}
      </div>
    </div>
  );
}
