"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createGradusClient, GradusApiException } from "@/lib/gradus-api"
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"

async function getToken(): Promise<string> {
  const res = await fetch("/api/auth/token")
  if (!res.ok) throw new Error("No autenticado")
  const data = await res.json()
  return data.accessToken
}

export default function NewRulePage() {
  const router = useRouter()

  const [sourceProgramCode, setSourceProgramCode] = useState("")
  const [targetProgramCode, setTargetProgramCode] = useState("")
  const [minGrade, setMinGrade] = useState("3.0")
  const [maxCreditsPercentage, setMaxCreditsPercentage] = useState("60")
  const [requiresSameArea, setRequiresSameArea] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const grade = parseFloat(minGrade)
    const pct = parseInt(maxCreditsPercentage)

    if (isNaN(grade) || grade < 0 || grade > 5) {
      setError("La nota mínima debe estar entre 0 y 5.")
      return
    }
    if (isNaN(pct) || pct < 1 || pct > 100) {
      setError("El porcentaje de créditos debe estar entre 1 y 100.")
      return
    }
    if (sourceProgramCode.trim().toUpperCase() === targetProgramCode.trim().toUpperCase()) {
      setError("El programa origen y destino no pueden ser iguales.")
      return
    }

    setSubmitting(true)
    try {
      const token = await getToken()
      const api = createGradusClient(token)
      const result = await api.createRule({
        sourceProgramCode: sourceProgramCode.trim().toUpperCase(),
        targetProgramCode: targetProgramCode.trim().toUpperCase(),
        minGrade: grade,
        maxCreditsPercentage: pct,
        requiresSameArea,
      })
      router.push(`/coordinator/rules/${result.ruleId}`)
    } catch (err) {
      if (err instanceof GradusApiException) {
        setError(err.getAllErrors().join(", "))
      } else {
        setError("Error al crear la regla. Intenta de nuevo.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/coordinator/rules"
        className="mb-6 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a reglas
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Nueva regla de homologación</h1>
        <p className="mt-1 text-sm text-slate-500">
          Define las condiciones para homologar materias entre dos programas
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-100 bg-white p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-700">Programas</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Programa origen <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sourceProgramCode}
                onChange={(e) => setSourceProgramCode(e.target.value.toUpperCase())}
                placeholder="Ej: 351C"
                required
                maxLength={20}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Programa destino <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={targetProgramCode}
                onChange={(e) => setTargetProgramCode(e.target.value.toUpperCase())}
                placeholder="Ej: 372V"
                required
                maxLength={20}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-700">Condiciones de homologación</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Nota mínima <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={minGrade}
                onChange={(e) => setMinGrade(e.target.value)}
                min={0}
                max={5}
                step={0.1}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="mt-1 text-xs text-slate-400">Entre 0.0 y 5.0</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Máx. % de créditos <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={maxCreditsPercentage}
                onChange={(e) => setMaxCreditsPercentage(e.target.value)}
                min={1}
                max={100}
                step={1}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="mt-1 text-xs text-slate-400">Máximo del programa destino a homologar</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Requiere misma área de formación</p>
              <p className="text-xs text-slate-400">
                La materia debe pertenecer a la misma área (básica, específica, complementaria)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRequiresSameArea(!requiresSameArea)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                requiresSameArea ? "bg-blue-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  requiresSameArea ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear regla
          </button>
          <Link
            href="/coordinator/rules"
            className="px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
