"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createGradusClient, HomologationRuleDetail, SubjectEquivalence, GradusApiException } from "@/lib/gradus-api"
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react"
import Link from "next/link"

async function getToken(): Promise<string> {
  const res = await fetch("/api/auth/token")
  if (!res.ok) throw new Error("No autenticado")
  const data = await res.json()
  return data.accessToken
}

// ── Modal de equivalencia ────────────────────────────────────────────────────

type EquivFormData = {
  sourceSubjectCode: string
  sourceSubjectName: string
  sourceCredits: string
  targetSubjectCode: string
  targetSubjectName: string
  targetCredits: string
  minGradeOverride: string
}

function emptyEquivForm(): EquivFormData {
  return {
    sourceSubjectCode: "",
    sourceSubjectName: "",
    sourceCredits: "",
    targetSubjectCode: "",
    targetSubjectName: "",
    targetCredits: "",
    minGradeOverride: "",
  }
}

function EquivalenceModal({
  ruleId,
  editing,
  onClose,
  onSaved,
}: {
  ruleId: string
  editing: SubjectEquivalence | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<EquivFormData>(() =>
    editing
      ? {
          sourceSubjectCode: editing.sourceSubjectCode,
          sourceSubjectName: editing.sourceSubjectName,
          sourceCredits: String(editing.sourceCredits),
          targetSubjectCode: editing.targetSubjectCode,
          targetSubjectName: editing.targetSubjectName,
          targetCredits: String(editing.targetCredits),
          minGradeOverride: editing.minGradeOverride != null ? String(editing.minGradeOverride) : "",
        }
      : emptyEquivForm()
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof EquivFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const srcCredits = parseInt(form.sourceCredits)
    const tgtCredits = parseInt(form.targetCredits)
    const override = form.minGradeOverride.trim() !== "" ? parseFloat(form.minGradeOverride) : null

    if (isNaN(srcCredits) || srcCredits < 1) { setError("Créditos origen inválidos."); return }
    if (isNaN(tgtCredits) || tgtCredits < 1) { setError("Créditos destino inválidos."); return }
    if (override !== null && (isNaN(override) || override < 0 || override > 5)) {
      setError("Override de nota debe estar entre 0 y 5.")
      return
    }

    const data = {
      sourceSubjectCode: form.sourceSubjectCode.trim(),
      sourceSubjectName: form.sourceSubjectName.trim(),
      sourceCredits: srcCredits,
      targetSubjectCode: form.targetSubjectCode.trim(),
      targetSubjectName: form.targetSubjectName.trim(),
      targetCredits: tgtCredits,
      minGradeOverride: override,
    }

    setSubmitting(true)
    try {
      const token = await getToken()
      const api = createGradusClient(token)
      if (editing) {
        await api.updateEquivalence(ruleId, editing.id, data)
      } else {
        await api.addEquivalence(ruleId, data)
      }
      onSaved()
    } catch (err) {
      if (err instanceof GradusApiException) {
        setError(err.getAllErrors().join(", "))
      } else {
        setError("Error al guardar la equivalencia.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            {editing ? "Editar equivalencia" : "Nueva equivalencia"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Materia origen */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Materia origen
              </p>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Código</label>
                <input
                  value={form.sourceSubjectCode}
                  onChange={(e) => set("sourceSubjectCode", e.target.value)}
                  placeholder="Ej: MAT001"
                  required
                  maxLength={20}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Nombre</label>
                <input
                  value={form.sourceSubjectName}
                  onChange={(e) => set("sourceSubjectName", e.target.value)}
                  placeholder="Nombre de la materia"
                  required
                  maxLength={255}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Créditos</label>
                <input
                  type="number"
                  value={form.sourceCredits}
                  onChange={(e) => set("sourceCredits", e.target.value)}
                  min={1}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Materia destino */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Materia destino
              </p>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Código</label>
                <input
                  value={form.targetSubjectCode}
                  onChange={(e) => set("targetSubjectCode", e.target.value)}
                  placeholder="Ej: MAT102"
                  required
                  maxLength={20}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Nombre</label>
                <input
                  value={form.targetSubjectName}
                  onChange={(e) => set("targetSubjectName", e.target.value)}
                  placeholder="Nombre de la materia"
                  required
                  maxLength={255}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Créditos</label>
                <input
                  type="number"
                  value={form.targetCredits}
                  onChange={(e) => set("targetCredits", e.target.value)}
                  min={1}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Override nota mínima{" "}
              <span className="font-normal text-slate-400">(opcional, sobreescribe la regla general)</span>
            </label>
            <input
              type="number"
              value={form.minGradeOverride}
              onChange={(e) => set("minGradeOverride", e.target.value)}
              min={0}
              max={5}
              step={0.1}
              placeholder="Ej: 3.5"
              className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? "Guardar cambios" : "Agregar equivalencia"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function RuleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ruleId = params.ruleId as string

  const [rule, setRule] = useState<HomologationRuleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit rule form state
  const [minGrade, setMinGrade] = useState("")
  const [maxCreditsPercentage, setMaxCreditsPercentage] = useState("")
  const [requiresSameArea, setRequiresSameArea] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Deactivate state
  const [deactivating, setDeactivating] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  // Equivalences modal
  const [showModal, setShowModal] = useState(false)
  const [editingEquiv, setEditingEquiv] = useState<SubjectEquivalence | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function load() {
    try {
      const token = await getToken()
      const api = createGradusClient(token)
      const data = await api.getRuleDetail(ruleId)
      setRule(data)
      setMinGrade(data.minGrade.toFixed(1))
      setMaxCreditsPercentage(String(data.maxCreditsPercentage))
      setRequiresSameArea(data.requiresSameArea)
    } catch {
      setError("No se pudo cargar la regla.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [ruleId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveError(null)
    setSaveSuccess(false)

    const grade = parseFloat(minGrade)
    const pct = parseInt(maxCreditsPercentage)

    if (isNaN(grade) || grade < 0 || grade > 5) { setSaveError("Nota mínima debe estar entre 0 y 5."); return }
    if (isNaN(pct) || pct < 1 || pct > 100) { setSaveError("Porcentaje debe estar entre 1 y 100."); return }

    setSaving(true)
    try {
      const token = await getToken()
      const api = createGradusClient(token)
      await api.updateRule(ruleId, { minGrade: grade, maxCreditsPercentage: pct, requiresSameArea })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      await load()
    } catch (err) {
      if (err instanceof GradusApiException) {
        setSaveError(err.getAllErrors().join(", "))
      } else {
        setSaveError("Error al guardar los cambios.")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    setDeactivating(true)
    try {
      const token = await getToken()
      const api = createGradusClient(token)
      await api.deactivateRule(ruleId)
      router.push("/coordinator/rules")
    } catch {
      setConfirmDeactivate(false)
      setDeactivating(false)
    }
  }

  async function handleRemoveEquivalence(equivalenceId: string) {
    setRemovingId(equivalenceId)
    try {
      const token = await getToken()
      const api = createGradusClient(token)
      await api.removeEquivalence(ruleId, equivalenceId)
      await load()
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error || !rule) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center">
        <p className="text-slate-500">{error ?? "Regla no encontrada."}</p>
        <Link href="/coordinator/rules" className="mt-4 block text-sm text-blue-600 hover:underline">
          Volver a reglas
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      {showModal && (
        <EquivalenceModal
          ruleId={ruleId}
          editing={editingEquiv}
          onClose={() => { setShowModal(false); setEditingEquiv(null) }}
          onSaved={async () => { setShowModal(false); setEditingEquiv(null); await load() }}
        />
      )}

      <Link
        href="/coordinator/rules"
        className="mb-6 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a reglas
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-lg font-bold text-slate-900">{rule.sourceProgramCode}</span>
            <span className="text-slate-400">→</span>
            <span className="font-mono text-lg font-bold text-slate-900">{rule.targetProgramCode}</span>
            {rule.active ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Activa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                <XCircle className="h-3 w-3" /> Inactiva
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">
            Creada el{" "}
            {new Date(rule.createdAt).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        {rule.active && (
          <div>
            {!confirmDeactivate ? (
              <button
                onClick={() => setConfirmDeactivate(true)}
                className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Desactivar regla
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">¿Confirmar?</span>
                <button
                  onClick={handleDeactivate}
                  disabled={deactivating}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {deactivating && <Loader2 className="h-3 w-3 animate-spin" />}
                  Sí, desactivar
                </button>
                <button
                  onClick={() => setConfirmDeactivate(false)}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editar parámetros */}
      <form onSubmit={handleSave} className="mb-6 rounded-xl border border-slate-100 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Parámetros de la regla</h2>

        {saveError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Cambios guardados correctamente.
          </div>
        )}

        <div className="mb-5 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Nota mínima</label>
            <input
              type="number"
              value={minGrade}
              onChange={(e) => setMinGrade(e.target.value)}
              min={0}
              max={5}
              step={0.1}
              disabled={!rule.active}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Máx. % créditos</label>
            <input
              type="number"
              value={maxCreditsPercentage}
              onChange={(e) => setMaxCreditsPercentage(e.target.value)}
              min={1}
              max={100}
              disabled={!rule.active}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Requiere misma área de formación</p>
            <p className="text-xs text-slate-400">
              La materia debe pertenecer a la misma área en ambos programas
            </p>
          </div>
          <button
            type="button"
            disabled={!rule.active}
            onClick={() => setRequiresSameArea(!requiresSameArea)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
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

        {rule.active && (
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar cambios
          </button>
        )}
      </form>

      {/* Tabla de equivalencias */}
      <div className="rounded-xl border border-slate-100 bg-white">
        <div className="flex items-center justify-between border-b border-slate-50 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Equivalencias de materias ({rule.equivalences.length})
          </h2>
          {rule.active && (
            <button
              onClick={() => { setEditingEquiv(null); setShowModal(true) }}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar equivalencia
            </button>
          )}
        </div>

        {rule.equivalences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-slate-400">No hay equivalencias configuradas aún.</p>
            {rule.active && (
              <button
                onClick={() => { setEditingEquiv(null); setShowModal(true) }}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Agregar la primera equivalencia
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-400">Materia origen</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-slate-400">Materia destino</th>
                  <th className="px-5 py-2.5 text-center text-xs font-medium text-slate-400">Créditos</th>
                  <th className="px-5 py-2.5 text-center text-xs font-medium text-slate-400">Nota override</th>
                  {rule.active && (
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-slate-400">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rule.equivalences.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-slate-900">{eq.sourceSubjectName}</p>
                      <p className="font-mono text-xs text-slate-400">{eq.sourceSubjectCode}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-slate-900">{eq.targetSubjectName}</p>
                      <p className="font-mono text-xs text-slate-400">{eq.targetSubjectCode}</p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-slate-600">{eq.sourceCredits}</span>
                      <span className="mx-1 text-slate-300">→</span>
                      <span className="text-slate-600">{eq.targetCredits}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {eq.minGradeOverride != null ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {eq.minGradeOverride.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    {rule.active && (
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditingEquiv(eq); setShowModal(true) }}
                            className="p-1.5 text-slate-400 transition-colors hover:text-blue-600"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveEquivalence(eq.id)}
                            disabled={removingId === eq.id}
                            className="p-1.5 text-slate-400 transition-colors hover:text-red-600 disabled:opacity-50"
                            title="Eliminar"
                          >
                            {removingId === eq.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
