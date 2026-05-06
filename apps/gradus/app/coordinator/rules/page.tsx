import { getSession } from "@/lib/auth"
import { createGradusClient, HomologationRule } from "@/lib/gradus-api"
import { redirect } from "next/navigation"
import Link from "next/link"
import { BookOpen, Plus, ChevronRight, CheckCircle2, XCircle } from "lucide-react"

function RuleRow({ rule }: { rule: HomologationRule }) {
  return (
    <Link
      href={`/coordinator/rules/${rule.id}`}
      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
            {rule.sourceProgramCode}
          </span>
          <span className="text-slate-300">→</span>
          <span className="font-mono text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
            {rule.targetProgramCode}
          </span>
          {rule.active ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Activa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              <XCircle className="h-3 w-3" />
              Inactiva
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">
          Creada el{" "}
          {new Date(rule.createdAt).toLocaleDateString("es-CO", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-6 shrink-0 text-center">
        <div>
          <p className="text-sm font-semibold text-slate-700">{rule.minGrade.toFixed(1)}</p>
          <p className="text-xs text-slate-400">Nota mín.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">{rule.maxCreditsPercentage}%</p>
          <p className="text-xs text-slate-400">Máx. créditos</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">{rule.equivalencesCount}</p>
          <p className="text-xs text-slate-400">Equivalencias</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {rule.requiresSameArea ? "Sí" : "No"}
          </p>
          <p className="text-xs text-slate-400">Misma área</p>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
    </Link>
  )
}

export default async function RulesPage() {
  const session = await getSession()
  if (!session) redirect("/api/auth/login")

  const api = createGradusClient(session.accessToken)
  const rules = await api.getRules().catch(() => [])

  const active = rules.filter((r) => r.active)
  const inactive = rules.filter((r) => !r.active)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reglas de homologación</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configura las reglas y equivalencias de materias entre programas
          </p>
        </div>
        <Link
          href="/coordinator/rules/new"
          className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva regla
        </Link>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <BookOpen className="h-8 w-8 text-slate-300" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-slate-700">Sin reglas configuradas</h2>
          <p className="mb-6 max-w-sm text-sm text-slate-400">
            Crea la primera regla de homologación para habilitar solicitudes entre programas.
          </p>
          <Link
            href="/coordinator/rules/new"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Crear primera regla
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
              <div className="border-b border-slate-50 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Activas ({active.length})
                </p>
              </div>
              <div className="divide-y divide-slate-50">
                {active.map((r) => (
                  <RuleRow key={r.id} rule={r} />
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white opacity-75">
              <div className="border-b border-slate-50 px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Inactivas ({inactive.length})
                </p>
              </div>
              <div className="divide-y divide-slate-50">
                {inactive.map((r) => (
                  <RuleRow key={r.id} rule={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
