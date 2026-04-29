"use client"

import { Bell } from "lucide-react"
import { useNotificationContext } from "./NotificationProvider"

export function NotificationBell() {
  const { unreadCount, isOpen, setIsOpen } = useNotificationContext()

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-slate-800"
      aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
    >
      <Bell className="h-4 w-4 text-slate-300" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  )
}
