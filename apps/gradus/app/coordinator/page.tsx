import { getSession } from "@/lib/auth"
import { createGradusClient, PendingRequest } from "@/lib/gradus-api"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ClipboardList, Clock, ChevronRight, CheckCircle2 } from "lucide-react"

function PendingCard({ request }: { request: PendingRequest }) {
  const isReviewing = request.status === "Reviewing"

  return (
    <Link
      href={`/coordinator/${request.id}`}
      className="block rounded-xl border border-slate-100 bg-white p-5 transition-all hover:border-slate-200 hover:shadow-sm"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rounded bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-400">
              {request.sourceProgramCode}
            </span>
            <span className="text-xs text-slate-300">→</span>
            <span className="rounded bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-400">
              {request.targetProgramCode}
            </span>
            {isReviewing && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                En revisión
              </span>
            )}
          </div>
          <p className="truncate font-semibold text-slate-900">
            {request.studentName}
          </p>
          <p className="mt-0.5 font-mono text-xs text-slate-400">
            {request.studentCode}
          </p>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3">
        {[
          {
            label: "Homologables",
            value: request.totalSubjectsApproved,
            color: "text-emerald-600",
          },
          {
            label: "Créditos",
            value: request.totalCreditsHomologated,
            color: "text-blue-600",
          },
        ].map((m) => (
          <div key={m.label} className="rounded-lg bg-slate-50 p-2.5">
            <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-slate-400">{m.label}</p>
          </div>
        ))}
        <div className="rounded-lg bg-slate-50 p-2.5">
          <p className="mb-1 text-xs text-slate-400">Recibida</p>
          <p className="text-xs font-medium text-slate-600">
            {new Date(request.createdAt).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
        <Clock className="h-3.5 w-3.5" />
        Revisar solicitud
      </div>
    </Link>
  )
}

export default async function CoordinatorPage() {
  const session = await getSession()
  if (!session) redirect("/api/auth/login")

  const api = createGradusClient(session.accessToken)
  const requests = await api.getPendingRequests().catch(() => [])

  const pending = requests.filter((r) => r.status === "Pending")
  const reviewing = requests.filter((r) => r.status === "Reviewing")

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Solicitudes pendientes
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Revisa y resuelve las solicitudes de homologación de tus estudiantes
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <CheckCircle2 className="h-8 w-8 text-slate-300" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-700">
            Todo al día
          </h2>
          <p className="max-w-sm text-sm text-slate-400">
            No hay solicitudes pendientes de revisión en este momento.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {reviewing.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                En revisión ({reviewing.length})
              </h2>
              <div className="space-y-3">
                {reviewing.map((r) => (
                  <PendingCard key={r.id} request={r} />
                ))}
              </div>
            </section>
          )}

          {pending.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                Nuevas ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((r) => (
                  <PendingCard key={r.id} request={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
