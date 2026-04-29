"use client"

import { useEffect, useRef } from "react"
import { useNotificationContext } from "./NotificationProvider"
import { useRouter } from "next/navigation"
import {
  X,
  CheckCheck,
  Bell,
  CheckCircle2,
  FileText,
  XCircle,
  Clock,
} from "lucide-react"

const TYPE_CONFIG: Record<
  string,
  {
    icon: React.ReactNode
    color: string
  }
> = {
  HomologationSubmitted: {
    icon: <FileText className="h-4 w-4" />,
    color: "text-blue-500 bg-blue-50",
  },
  HomologationUnderReview: {
    icon: <Clock className="h-4 w-4" />,
    color: "text-amber-500 bg-amber-50",
  },
  HomologationApproved: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-500 bg-emerald-50",
  },
  HomologationRejected: {
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-500 bg-red-50",
  },
  DocumentReady: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-500 bg-emerald-50",
  },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return "Ahora mismo"
  if (mins < 60) return `Hace ${mins} min`
  if (hours < 24) return `Hace ${hours}h`
  return `Hace ${days}d`
}

export function NotificationPanel() {
  const {
    notifications,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    unreadCount,
  } = useNotificationContext()
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="absolute top-0 left-64 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
      style={{ maxHeight: "calc(100vh - 32px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">
            Notificaciones
          </h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              title="Marcar todas como leídas"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Todas leídas
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <Bell className="mb-3 h-8 w-8 text-slate-200" />
            <p className="text-sm text-slate-400">Sin notificaciones</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((n) => {
              const cfg =
                TYPE_CONFIG[n.type] ?? TYPE_CONFIG.HomologationSubmitted
              return (
                <button
                  key={n.id}
                  onClick={async () => {
                    if (!n.isRead) await markAsRead(n.id)
                    if (n.referenceId) {
                      setIsOpen(false)
                      router.push(`/student/${n.referenceId}`)
                    }
                  }}
                  className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 ${
                    !n.isRead ? "bg-blue-50/40" : ""
                  }`}
                >
                  {/* Icono */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.color}`}
                  >
                    {cfg.icon}
                  </div>

                  {/* Contenido */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm leading-snug ${
                        !n.isRead
                          ? "font-semibold text-slate-900"
                          : "text-slate-700"
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {n.message}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>

                  {/* Punto no leído */}
                  {!n.isRead && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
