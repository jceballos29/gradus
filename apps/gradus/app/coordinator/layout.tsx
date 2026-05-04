import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import Link from "next/link"
import { ClipboardList, LogOut, GraduationCap } from "lucide-react"
import { createGradusClient } from "@/lib/gradus-api"
import { NotificationProvider } from "@/components/notifications/NotificationProvider"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { NotificationPanel } from "@/components/notifications/NotificationPanel"

export default async function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/api/auth/login")
  if (session.role !== "COORDINATOR") redirect("/student")

  const api = createGradusClient(session.accessToken)
  const pending = await api.getPendingRequests().catch(() => [])
  const initialNotifications = await api.getAllNotifications().catch(() => [])

  const fullName =
    `${session.firstName} ${session.lastName}`.trim() ||
    session.email.split("@")[0]
  const initials =
    `${session.firstName?.[0] ?? ""}${session.lastName?.[0] ?? ""}`.toUpperCase() ||
    session.email[0].toUpperCase()

  return (
    <NotificationProvider
      azureOid={session.azureOid}
      accessToken={session.accessToken}
      initialNotifications={initialNotifications}
      role={session.role}
    >
      <div className="flex min-h-screen bg-slate-50">
        <aside className="fixed z-10 flex h-full w-64 flex-col bg-slate-900 text-white">
          <div className="border-b border-slate-700 p-6">
            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-semibold tracking-wide text-slate-300">
                GRADUS
              </span>
              <span className="text-xs text-slate-500">· Coordinación</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{fullName}</p>
                <p className="truncate text-xs text-slate-400">
                  {session.email}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            <Link
              href="/coordinator"
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="h-4 w-4 shrink-0" />
                Solicitudes pendientes
              </div>
              {pending.length > 0 && (
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
                  {pending.length}
                </span>
              )}
            </Link>
          </nav>

          <div className="space-y-1 border-t border-slate-700 p-4">
            <div className="relative flex items-center justify-between px-3 py-2">
              <span className="text-xs text-slate-400">Notificaciones</span>
              <NotificationBell />
              <NotificationPanel />
            </div>

            <Link
              href="/api/auth/logout"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Cerrar sesión
            </Link>
          </div>
        </aside>

        <main className="ml-64 min-h-screen flex-1 p-8">{children}</main>
      </div>
    </NotificationProvider>
  )
}
