import { getSession } from "@/lib/auth"
import { createGradusClient } from "@/lib/gradus-api"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
} from "lucide-react"

const AREA_LABELS: Record<string, string> = {
  BASIC: "Básica",
  SPECIFIC: "Específica",
  COMPLEMENTARY: "Complementaria",
}

export default async function StudentRequestDetailPage({
  params,
}: {
  params: Promise<{ studentId: string; requestId: string }>
}) {
  const { studentId, requestId } = await params
  const session = await getSession()
  if (!session) redirect("/api/auth/login")

  const api = createGradusClient(session.accessToken)

  let request
  try {
    request = await api.getRequestDetail(requestId)
  } catch {
    notFound()
  }

  const apiUrl = process.env.NEXT_PUBLIC_GRADUS_API_URL ?? "http://localhost:5002"
  const decodedStudentId = decodeURIComponent(studentId)

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link href="/coordinator/students" className="hover:text-slate-900 transition-colors">
          Estudiantes
        </Link>
        <span>/</span>
        <Link
          href={`/coordinator/students/${studentId}`}
          className="hover:text-slate-900 transition-colors"
        >
          {request.studentName}
        </Link>
        <span>/</span>
        <span className="text-slate-600">Solicitud</span>
      </nav>

      <Link
        href={`/coordinator/students/${studentId}`}
        className="mb-6 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al historial
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
          <h1 className="text-2xl font-bold text-slate-900">{request.studentName}</h1>
          <p className="mt-0.5 font-mono text-sm text-slate-400">{request.studentCode}</p>
          <p className="mt-1 text-sm text-slate-400">
            Solicitada el{" "}
            {new Date(request.createdAt).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        {request.documentUrl && (
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

      {/* Métricas */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "Evaluadas", value: request.metrics.totalEvaluated, color: "text-slate-900" },
          { label: "Aprobadas", value: request.metrics.totalApproved, color: "text-emerald-600" },
          { label: "Créditos", value: request.metrics.creditsHomologated, color: "text-blue-600" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-slate-100 bg-white p-4 text-center">
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
            <p className={`mb-1 text-xs font-semibold ${
              request.status === "Rejected" ? "text-red-700" : "text-blue-700"
            }`}>
              Observaciones del coordinador
            </p>
            <p className={`text-sm ${
              request.status === "Rejected" ? "text-red-600" : "text-blue-600"
            }`}>
              {request.coordinatorNotes}
            </p>
          </div>
        </div>
      )}

      {/* Notas del estudiante */}
      {request.studentNotes && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">Observaciones del estudiante</p>
            <p className="text-sm text-slate-700">{request.studentNotes}</p>
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-400">Asignatura origen</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-400">Asignatura destino</th>
                <th className="px-5 py-2.5 text-center text-xs font-medium text-slate-400">Nota</th>
                <th className="px-5 py-2.5 text-center text-xs font-medium text-slate-400">Créditos</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-slate-400">Área</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {request.homologableSubjects.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-slate-900">{s.sourceName}</p>
                    <p className="font-mono text-xs text-slate-400">{s.sourceCode}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-slate-900">{s.targetName}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="font-mono text-xs text-slate-400">{s.targetCode}</p>
                      {s.coordinatorOverride && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                          Excepción
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="font-bold text-emerald-600">{s.sourceGrade.toFixed(1)}</span>
                  </td>
                  <td className="px-5 py-3 text-center text-slate-600">{s.sourceCredits}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {AREA_LABELS[s.sourceArea] ?? s.sourceArea}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">{s.sourceName}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">{s.sourceCode}</p>
                  <p className="mt-0.5 text-xs text-red-500">{s.rejectionReason}</p>
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
