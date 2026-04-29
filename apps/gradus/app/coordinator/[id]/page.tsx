"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  createGradusClient,
  RequestDetail,
  GradusApiException,
} from "@/lib/gradus-api";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Download,
} from "lucide-react";

const AREA_LABELS: Record<string, string> = {
  BASIC: "Básica",
  SPECIFIC: "Específica",
  COMPLEMENTARY: "Complementaria",
};

type Decision = "approve" | "reject" | null;

export default function ReviewRequestPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [decision, setDecision] = useState<Decision>(null);
  const [coordinatorNotes, setCoordinatorNotes] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_GRADUS_API_URL ?? "http://localhost:5002";

  async function getToken(): Promise<string> {
    const res = await fetch("/api/auth/token");
    if (!res.ok) throw new Error("No autenticado");
    const data = await res.json();
    return data.accessToken;
  }

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const api = createGradusClient(token);
        const detail = await api.getRequestDetail(requestId);
        setRequest(detail);
      } catch {
        setError("No se pudo cargar la solicitud.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [requestId]);

  async function handleSubmitReview() {
    if (!decision || !request) return;
    if (decision === "reject" && !coordinatorNotes.trim()) {
      setError("Debes incluir observaciones al rechazar una solicitud.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      const api = createGradusClient(token);
      await api.reviewHomologation(
        requestId,
        decision === "approve",
        coordinatorNotes || undefined
      );
      router.push("/coordinator");
    } catch (err) {
      if (err instanceof GradusApiException) {
        setError(err.title);
      } else {
        setError("Error al procesar la revisión. Intenta de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isResolved = request
    ? ["Approved", "Rejected", "DocumentReady"].includes(request.status)
    : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-slate-500">Solicitud no encontrada.</p>
        <button
          onClick={() => router.push("/coordinator")}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => router.push("/coordinator")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a solicitudes
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              {request.sourceProgramCode}
            </span>
            <span className="text-slate-300 text-xs">→</span>
            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              {request.targetProgramCode}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {request.studentName}
          </h1>
          <p className="text-sm text-slate-400 font-mono mt-0.5">
            {request.studentCode}
          </p>
        </div>
        {request.documentUrl && (
          <a
            href={`${apiUrl}${request.documentUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            Descargar PDF
          </a>
        )}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Evaluadas", value: request.metrics.totalEvaluated, color: "text-slate-900" },
          { label: "Aprobadas", value: request.metrics.totalApproved, color: "text-emerald-600" },
          { label: "Créditos", value: request.metrics.creditsHomologated, color: "text-blue-600" },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-slate-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Notas del estudiante */}
      {request.studentNotes && (
        <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl mb-4">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">
              Observaciones del estudiante
            </p>
            <p className="text-sm text-slate-700">{request.studentNotes}</p>
          </div>
        </div>
      )}

      {/* Materias homologables */}
      {request.homologableSubjects.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-sm text-slate-900">
              Homologables ({request.homologableSubjects.length})
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-400">Asignatura origen</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-400">Asignatura destino</th>
                <th className="text-center px-5 py-2.5 text-xs font-medium text-slate-400">Nota</th>
                <th className="text-center px-5 py-2.5 text-xs font-medium text-slate-400">Créditos</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-slate-400">Área</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {request.homologableSubjects.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-slate-900">{s.sourceName}</p>
                    <p className="text-xs text-slate-400 font-mono">{s.sourceCode}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-slate-900">{s.targetName}</p>
                    <p className="text-xs text-slate-400 font-mono">{s.targetCode}</p>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="font-bold text-emerald-600">
                      {s.sourceGrade.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center text-slate-600">
                    {s.sourceCredits}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
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
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <h3 className="font-semibold text-sm text-slate-900">
              No homologables ({request.rejectedSubjects.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {request.rejectedSubjects.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-700">{s.sourceName}</p>
                  <p className="text-xs text-red-500 mt-0.5">{s.rejectionReason}</p>
                </div>
                <p className="text-sm font-semibold text-slate-400 shrink-0">
                  {s.sourceGrade.toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel de decisión */}
      {!isResolved ? (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Tomar decisión</h2>

          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg mb-4 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Botones de decisión */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setDecision(decision === "approve" ? null : "approve")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                decision === "approve"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50"
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              Aprobar solicitud
            </button>
            <button
              onClick={() => setDecision(decision === "reject" ? null : "reject")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                decision === "reject"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50/50"
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              Rechazar solicitud
            </button>
          </div>

          {/* Observaciones */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Observaciones
              {decision === "reject" && (
                <span className="text-red-500 ml-1">*</span>
              )}
              {decision === "approve" && (
                <span className="text-slate-400 font-normal ml-1">(opcional)</span>
              )}
            </label>
            <textarea
              value={coordinatorNotes}
              onChange={(e) => setCoordinatorNotes(e.target.value)}
              placeholder={
                decision === "reject"
                  ? "Explica las razones del rechazo..."
                  : "Agrega observaciones adicionales..."
              }
              rows={3}
              maxLength={2000}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">
              {coordinatorNotes.length}/2000
            </p>
          </div>

          <button
            onClick={handleSubmitReview}
            disabled={!decision || submitting}
            className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              decision === "approve"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : decision === "reject"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : decision === "approve" ? (
              <>
                <ThumbsUp className="w-4 h-4" />
                Confirmar aprobación
              </>
            ) : decision === "reject" ? (
              <>
                <ThumbsDown className="w-4 h-4" />
                Confirmar rechazo
              </>
            ) : (
              "Selecciona una decisión"
            )}
          </button>
        </div>
      ) : (
        <div
          className={`flex items-center gap-3 p-5 rounded-xl border ${
            request.status === "Rejected"
              ? "bg-red-50 border-red-100"
              : "bg-emerald-50 border-emerald-100"
          }`}
        >
          {request.status === "Rejected" ? (
            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          )}
          <div>
            <p className={`font-semibold text-sm ${
              request.status === "Rejected" ? "text-red-700" : "text-emerald-700"
            }`}>
              {request.status === "Rejected" ? "Solicitud rechazada" : "Solicitud aprobada"}
            </p>
            {request.coordinatorNotes && (
              <p className={`text-xs mt-0.5 ${
                request.status === "Rejected" ? "text-red-600" : "text-emerald-600"
              }`}>
                {request.coordinatorNotes}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}