import { getSession } from "@/lib/auth"
import { createGradusClient, RequestSummary } from "@/lib/gradus-api"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  FileText,
} from "lucide-react"

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; icon: React.ReactNode
}> = {
  Draft: { label: "Borrador", color: "text-slate-600", bg: "bg-slate-100", icon: <Clock className="w-3.5 h-3.5" /> },
  Pending: { label: "Pendiente", color: "text-amber-700", bg: "bg-amber-50", icon: <Clock className="w-3.5 h-3.5" /> },
  Reviewing: { label: "En revisión", color: "text-blue-700", bg: "bg-blue-50", icon: <Clock className="w-3.5 h-3.5" /> },
  Approved: { label: "Aprobada", color: "text-emerald-700", bg: "bg-emerald-50", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  Rejected: { label: "Rechazada", color: "text-red-700", bg: "bg-red-50", icon: <XCircle className="w-3.5 h-3.5" /> },
  DocumentReady: { label: "Documento listo", color: "text-emerald-700", bg: "bg-emerald-50", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Draft
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function RequestCard({
  request,
  studentId,
}: {
  request: RequestSummary
  studentId: string
}) {
  const apiUrl = process.env.NEXT_PUBLIC_GRADUS_API_URL ?? "http://localhost:5002"

  return (
    <div className="bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                {request.sourceProgramCode}
              </span>
              <span className="text-slate-300 text-xs">→</span>
              <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                {request.targetProgramCode}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">{request.sourceProgramName}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Materias homologadas</p>
            <p className="text-lg font-semibold text-slate-900">{request.totalSubjectsApproved}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Créditos</p>
            <p className="text-lg font-semibold text-slate-900">{request.totalCreditsHomologated}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {new Date(request.createdAt).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="flex items-center gap-2">
            {request.status === "DocumentReady" && request.documentUrl && (
              <a
                href={`${apiUrl}${request.documentUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                PDF
              </a>
            )}
            <Link
              href={`/coordinator/students/${studentId}/requests/${request.id}`}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Ver detalle
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const session = await getSession()
  if (!session) redirect("/api/auth/login")

  const api = createGradusClient(session.accessToken)
  const requests = await api.getStudentRequests(decodeURIComponent(studentId)).catch(() => null)

  if (!requests) notFound()

  const active = requests.filter((r) => ["Draft", "Pending", "Reviewing"].includes(r.status))
  const resolved = requests.filter((r) =>
    ["Approved", "Rejected", "DocumentReady"].includes(r.status)
  )

  const studentName = requests[0]
    ? `Solicitudes de ${requests[0].sourceProgramName ? "estudiante" : "estudiante"}`
    : "Estudiante"

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/coordinator/students"
        className="mb-6 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a estudiantes
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Historial de solicitudes</h1>
        <p className="mt-1 text-sm text-slate-500">
          {requests.length} solicitud{requests.length !== 1 ? "es" : ""} registrada{requests.length !== 1 ? "s" : ""}
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <FileText className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-slate-400 text-sm">Este estudiante no tiene solicitudes registradas.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                En proceso ({active.length})
              </h2>
              <div className="space-y-3">
                {active.map((r) => (
                  <RequestCard key={r.id} request={r} studentId={studentId} />
                ))}
              </div>
            </section>
          )}
          {resolved.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Resueltas ({resolved.length})
              </h2>
              <div className="space-y-3">
                {resolved.map((r) => (
                  <RequestCard key={r.id} request={r} studentId={studentId} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
