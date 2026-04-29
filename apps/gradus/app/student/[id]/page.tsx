import { getSession } from "@/lib/auth"
import { createGradusClient } from "@/lib/gradus-api"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  FileText,
  AlertCircle,
} from "lucide-react"

const STATUS_STEPS = [
  { key: "Draft", label: "Borrador generado" },
  { key: "Pending", label: "Enviada al coordinador" },
  { key: "Reviewing", label: "En revisión" },
  { key: "Approved", label: "Aprobada" },
  { key: "DocumentReady", label: "Documento listo" },
]

const AREA_LABELS: Record<string, string> = {
  BASIC: "Básica",
  SPECIFIC: "Específica",
  COMPLEMENTARY: "Complementaria",
}

function Timeline({ status }: { status: string }) {
  const isRejected = status === "Rejected"
  const currentIndex = isRejected
    ? 2
    : STATUS_STEPS.findIndex((s) => s.key === status)

  if (isRejected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
        <XCircle className="h-5 w-5 shrink-0 text-red-500" />
        <div>
          <p className="text-sm font-semibold text-red-700">
            Solicitud rechazada
          </p>
          <p className="mt-0.5 text-xs text-red-500">
            El coordinador rechazó la solicitud. Revisa las observaciones.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((s, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                  done
                    ? "bg-blue-600 text-white"
                    : active
                      ? "bg-blue-600 text-white ring-4 ring-blue-100"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : active ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-semibold">{i + 1}</span>
                )}
              </div>
              <p
                className={`mt-2 max-w-[80px] text-center text-xs leading-tight ${
                  active
                    ? "font-semibold text-slate-900"
                    : done
                      ? "text-slate-600"
                      : "text-slate-400"
                }`}
              >
                {s.label}
              </p>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div
                className={`mx-2 mb-6 h-px flex-1 transition-all ${
                  done ? "bg-blue-600" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()
  if (!session) redirect("/api/auth/login")

  const api = createGradusClient(session.accessToken)

  let request
  try {
    request = await api.getRequestDetail(id)
  } catch {
    notFound()
  }

  const apiUrl =
    process.env.NEXT_PUBLIC_GRADUS_API_URL ?? "http://localhost:5002"

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/student"
        className="mb-6 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a mis solicitudes
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-400">
              {request.sourceProgramCode}
            </span>
            <span className="text-xs text-slate-300">→</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-400">
              {request.targetProgramCode}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {request.sourceProgramName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Solicitada el{" "}
            {new Date(request.createdAt).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        {request.status === "DocumentReady" && request.documentUrl && (
          <a
            href={`${apiUrl}${request.documentUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </a>
        )}
      </div>

      {/* Timeline */}
      <div className="mb-4 rounded-xl border border-slate-100 bg-white p-6">
        <Timeline status={request.status} />
      </div>

      {/* Métricas */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          {
            label: "Evaluadas",
            value: request.metrics.totalEvaluated,
            color: "text-slate-900",
          },
          {
            label: "Aprobadas",
            value: request.metrics.totalApproved,
            color: "text-emerald-600",
          },
          {
            label: "Créditos",
            value: request.metrics.creditsHomologated,
            color: "text-blue-600",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-slate-100 bg-white p-4 text-center"
          >
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="mt-1 text-xs text-slate-500">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Observaciones del coordinador */}
      {request.coordinatorNotes && (
        <div
          className={`mb-4 flex items-start gap-3 rounded-xl border p-4 ${
            request.status === "Rejected"
              ? "border-red-100 bg-red-50"
              : "border-blue-100 bg-blue-50"
          }`}
        >
          <AlertCircle
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              request.status === "Rejected" ? "text-red-500" : "text-blue-500"
            }`}
          />
          <div>
            <p
              className={`mb-1 text-xs font-semibold ${
                request.status === "Rejected" ? "text-red-700" : "text-blue-700"
              }`}
            >
              Observaciones del coordinador
            </p>
            <p
              className={`text-sm ${
                request.status === "Rejected" ? "text-red-600" : "text-blue-600"
              }`}
            >
              {request.coordinatorNotes}
            </p>
          </div>
        </div>
      )}

      {/* Materias homologables */}
      {request.homologableSubjects.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-xl border border-slate-100 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-50 px-5 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900">
              Materias homologadas ({request.homologableSubjects.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {request.homologableSubjects.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">
                      {s.sourceCode}
                    </span>
                    <span className="text-xs text-slate-300">→</span>
                    <span className="font-mono text-xs text-slate-400">
                      {s.targetCode}
                    </span>
                    {s.coordinatorOverride && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                        Excepción
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-900">{s.sourceName}</p>
                  <p className="text-xs text-slate-400">
                    {AREA_LABELS[s.sourceArea] ?? s.sourceArea} ·{" "}
                    {s.sourceCredits} créditos
                  </p>
                </div>
                <p className="shrink-0 text-lg font-bold text-emerald-600">
                  {s.sourceGrade.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materias rechazadas */}
      {request.rejectedSubjects.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-50 px-5 py-3">
            <XCircle className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-semibold text-slate-900">
              No homologadas ({request.rejectedSubjects.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {request.rejectedSubjects.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">{s.sourceName}</p>
                  <p className="mt-0.5 text-xs text-red-500">
                    {s.rejectionReason}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-slate-400">
                  {s.sourceGrade.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
