import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import Link from "next/link"
import {
  Users,
  BookOpen,
  ClipboardList,
  LogOut,
  GraduationCap,
} from "lucide-react"

export default async function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/api/auth/login")
  if (session.role !== "COORDINATOR") redirect("/student")

  const initials =
    `${session.firstName?.[0] ?? ""}${session.lastName?.[0] ?? ""}`.toUpperCase() ||
    session.email[0].toUpperCase()

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed flex h-full w-64 flex-col bg-slate-900 text-white">
        <div className="border-b border-slate-700 p-6">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-400" />
            <span className="text-sm font-semibold text-slate-300">
              Coordinación
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {session.firstName || session.email.split("@")[0]}
              </p>
              <p className="truncate text-xs text-slate-400">{session.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <Link
            href="/coordinator"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <Users className="h-4 w-4" />
            Estudiantes
          </Link>
          <Link
            href="/coordinator/grades"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <ClipboardList className="h-4 w-4" />
            Registro de notas
          </Link>
          <Link
            href="/coordinator/pensum"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <BookOpen className="h-4 w-4" />
            Pensum
          </Link>
        </nav>

        <div className="border-t border-slate-700 p-4">
          <Link
            href="/api/auth/logout"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Link>
        </div>
      </aside>

      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  )
}
