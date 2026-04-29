"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  createGradusClient,
  PreviewResponse,
  GradusApiException,
} from "@/lib/gradus-api"
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  AlertCircle,
  Loader2,
} from "lucide-react"

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Step = "select" | "preview" | "submit"

const PROGRAMS = [
  {
    code: "372V",
    name: "Tecnología en Desarrollo de Software y Aplicativos Móviles",
    mode: "Virtual",
  },
  {
    code: "351C",
    name: "Tecnología en Desarrollo de Software y Aplicativos Móviles",
    mode: "Presencial",
  },
  {
    code: "GABD",
    name: "Tecnología en Gestión y Análisis de Big Data",
    mode: "Virtual",
  },
  {
    code: "GSDIA",
    name: "Tecnología en Sistemas de Inteligencia Artificial",
    mode: "Virtual",
  },
]

const AREA_LABELS: Record<string, string> = {
  BASIC: "Básica",
  SPECIFIC: "Específica",
  COMPLEMENTARY: "Complementaria",
}

// ── Componentes ───────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "select", label: "Seleccionar programa" },
    { key: "preview", label: "Vista previa" },
    { key: "submit", label: "Enviar" },
  ]
  const current = steps.findIndex((s) => s.key === step)

  return (
    <div className="mb-8 flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                i < current
                  ? "bg-blue-600 text-white"
                  : i === current
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`hidden text-sm sm:block ${
                i === current
                  ? "font-semibold text-slate-900"
                  : "text-slate-400"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mx-3 h-px w-16 transition-all ${
                i < current ? "bg-blue-600" : "bg-slate-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function NewRequestPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("select")
  const [selectedProgram, setSelectedProgram] = useState("")
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [studentNotes, setStudentNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Obtener accessToken desde cookie del cliente
  // En producción esto se haría via Server Action — aquí usamos fetch al route handler
  async function getToken(): Promise<string> {
    const res = await fetch("/api/auth/token")
    if (!res.ok) throw new Error("No autenticado")
    const data = await res.json()
    return data.accessToken
  }

  async function handlePreview() {
    if (!selectedProgram) return
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      const api = createGradusClient(token)
      const result = await api.previewHomologation(selectedProgram)
      setPreview(result)
      setStep("preview")
    } catch (err) {
      if (err instanceof GradusApiException) {
        setError(err.title)
      } else {
        setError("Error al generar la vista previa. Intenta de nuevo.")
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!preview) return
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      const api = createGradusClient(token)
      await api.submitHomologation(
        preview.draftRequestId,
        studentNotes || undefined
      )
      setStep("submit")
    } catch (err) {
      if (err instanceof GradusApiException) {
        setError(err.title)
      } else {
        setError("Error al enviar la solicitud. Intenta de nuevo.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <button
          onClick={() => router.push("/student")}
          className="mb-4 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mis solicitudes
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Nueva solicitud</h1>
        <p className="mt-1 text-sm text-slate-500">
          Genera una vista previa y envía tu solicitud de homologación
        </p>
      </div>

      <StepIndicator step={step} />

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Paso 1: Seleccionar programa ──────────────────────────────────── */}
      {step === "select" && (
        <div className="rounded-xl border border-slate-100 bg-white p-6">
          <h2 className="mb-1 font-semibold text-slate-900">
            Programa destino
          </h2>
          <p className="mb-5 text-sm text-slate-500">
            Selecciona el programa al que deseas trasladarte
          </p>

          <div className="mb-6 space-y-2">
            {PROGRAMS.map((p) => (
              <button
                key={p.code}
                onClick={() => setSelectedProgram(p.code)}
                className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                  selectedProgram === p.code
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-100 hover:border-slate-200"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    selectedProgram === p.code
                      ? "border-blue-500 bg-blue-500"
                      : "border-slate-300"
                  }`}
                >
                  {selectedProgram === p.code && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-500">
                      {p.code}
                    </span>
                    <span className="text-xs text-slate-400">{p.mode}</span>
                  </div>
                  <p className="truncate text-sm font-medium text-slate-900">
                    {p.name}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handlePreview}
            disabled={!selectedProgram || loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Generar vista previa
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Paso 2: Vista previa ──────────────────────────────────────────── */}
      {step === "preview" && preview && (
        <div className="space-y-4">
          {/* Métricas */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Materias evaluadas",
                value: preview.metrics.totalSubjectsEvaluated,
                color: "text-slate-900",
              },
              {
                label: "Homologables",
                value: preview.metrics.totalHomologable,
                color: "text-emerald-600",
              },
              {
                label: "Créditos",
                value: preview.metrics.creditsHomologable,
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

          {/* Regla aplicada */}
          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <p className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Regla aplicada
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>
                Nota mínima:{" "}
                <strong className="text-slate-900">
                  {preview.rule.minGrade.toFixed(1)}
                </strong>
              </span>
              <span>
                Máx. créditos:{" "}
                <strong className="text-slate-900">
                  {preview.rule.maxCreditsPercentage}%
                </strong>
              </span>
              <span>
                Misma área:{" "}
                <strong className="text-slate-900">
                  {preview.rule.requiresSameArea ? "Sí" : "No"}
                </strong>
              </span>
            </div>
          </div>

          {/* Materias homologables */}
          {preview.homologableSubjects.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-50 px-5 py-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Materias homologables ({preview.homologableSubjects.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {preview.homologableSubjects.map((s) => (
                  <div
                    key={s.sourceCode}
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
                      </div>
                      <p className="truncate text-sm text-slate-900">
                        {s.sourceName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {AREA_LABELS[s.sourceArea] ?? s.sourceArea} ·{" "}
                        {s.sourceCredits} créditos
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-emerald-600">
                        {s.sourceGrade.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Materias rechazadas */}
          {preview.rejectedSubjects.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
              <div className="flex items-center gap-2 border-b border-slate-50 px-5 py-3">
                <XCircle className="h-4 w-4 text-red-400" />
                <h3 className="text-sm font-semibold text-slate-900">
                  No homologables ({preview.rejectedSubjects.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {preview.rejectedSubjects.map((s) => (
                  <div
                    key={s.sourceCode}
                    className="flex items-center justify-between gap-4 px-5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-700">
                        {s.sourceName}
                      </p>
                      <p className="mt-0.5 text-xs text-red-500">
                        {s.rejectionReasonDescription}
                      </p>
                    </div>
                    {s.sourceGrade != null && (
                      <p className="shrink-0 text-sm font-semibold text-slate-400">
                        {s.sourceGrade.toFixed(1)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas y envío */}
          <div className="rounded-xl border border-slate-100 bg-white p-5">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Observaciones{" "}
              <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              value={studentNotes}
              onChange={(e) => setStudentNotes(e.target.value)}
              placeholder="Agrega observaciones para el coordinador..."
              rows={3}
              maxLength={1000}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-right text-xs text-slate-400">
              {studentNotes.length}/1000
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("select")}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar solicitud
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 3: Confirmación ──────────────────────────────────────────── */}
      {step === "submit" && (
        <div className="rounded-xl border border-slate-100 bg-white p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">
            Solicitud enviada
          </h2>
          <p className="mx-auto mb-6 max-w-sm text-sm text-slate-500">
            Tu solicitud fue enviada correctamente. El coordinador la revisará
            pronto y recibirás una notificación con el resultado.
          </p>
          <button
            onClick={() => router.push("/student")}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Ver mis solicitudes
          </button>
        </div>
      )}
    </div>
  )
}
