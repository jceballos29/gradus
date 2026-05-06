import { getSession } from "@/lib/auth"
import { createGradusClient, StudentRecord, HomologationStatus } from "@/lib/gradus-api"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Users, ChevronRight, Search } from "lucide-react"

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  Draft: { label: "Borrador", color: "text-slate-600", bg: "bg-slate-100" },
  Pending: { label: "Pendiente", color: "text-amber-700", bg: "bg-amber-50" },
  Reviewing: { label: "En revisión", color: "text-blue-700", bg: "bg-blue-50" },
  Approved: { label: "Aprobada", color: "text-emerald-700", bg: "bg-emerald-50" },
  Rejected: { label: "Rechazada", color: "text-red-700", bg: "bg-red-50" },
  DocumentReady: { label: "Documento listo", color: "text-emerald-700", bg: "bg-emerald-50" },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? STATUS_LABELS.Draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function StudentRow({ student }: { student: StudentRecord }) {
  return (
    <Link
      href={`/coordinator/students/${encodeURIComponent(student.studentAzureOid)}`}
      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
        {student.studentName[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
          {student.studentName}
        </p>
        <p className="text-xs text-slate-400 font-mono mt-0.5">{student.studentCode}</p>
      </div>
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
          {student.sourceProgramCode}
        </span>
        <span className="text-xs text-slate-300">→</span>
        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
          {student.targetProgramCode}
        </span>
      </div>
      <div className="shrink-0 text-center min-w-[60px]">
        <p className="text-sm font-semibold text-slate-700">{student.totalRequests}</p>
        <p className="text-xs text-slate-400">solicitud{student.totalRequests !== 1 ? "es" : ""}</p>
      </div>
      <div className="shrink-0">
        <StatusBadge status={student.lastStatus} />
      </div>
      <div className="shrink-0 text-xs text-slate-400 hidden md:block min-w-[80px] text-right">
        {new Date(student.lastRequestDate).toLocaleDateString("es-CO", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
    </Link>
  )
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>
}) {
  const session = await getSession()
  if (!session) redirect("/api/auth/login")

  const { search } = await searchParams
  const api = createGradusClient(session.accessToken)
  const students = await api.getAllStudents(search).catch(() => [])

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Estudiantes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Historial de solicitudes de homologación por estudiante
          </p>
        </div>
      </div>

      {/* Buscador */}
      <form method="GET" className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            name="search"
            defaultValue={search ?? ""}
            placeholder="Buscar por nombre o código..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </form>

      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Users className="h-8 w-8 text-slate-300" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-700">
            {search ? "Sin resultados" : "Sin estudiantes"}
          </h2>
          <p className="max-w-sm text-sm text-slate-400">
            {search
              ? `No hay estudiantes que coincidan con "${search}".`
              : "Aún no hay solicitudes de homologación registradas."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <div className="border-b border-slate-50 px-5 py-3">
            <p className="text-xs font-medium text-slate-400">
              {students.length} estudiante{students.length !== 1 ? "s" : ""}
              {search ? ` · búsqueda: "${search}"` : ""}
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {students.map((s) => (
              <StudentRow key={s.studentAzureOid} student={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
