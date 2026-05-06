// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface GradusApiError {
  type: string
  title: string
  status: number
  errors?: Record<string, string[]>
}

// Preview
export interface PreviewResponse {
  draftRequestId: string
  student: StudentSummary
  sourceProgram: ProgramSummary
  targetProgram: ProgramSummary
  rule: RuleSummary
  homologableSubjects: HomologableSubject[]
  rejectedSubjects: RejectedSubject[]
  metrics: HomologationMetrics
}

export interface StudentSummary {
  identity: string
  azureOid: string
  fullName: string
  studentCode: string
  campus: string
}

export interface ProgramSummary {
  code: string
  name: string
  mode: string
}

export interface RuleSummary {
  minGrade: number
  maxCreditsPercentage: number
  requiresSameArea: boolean
}

export interface HomologableSubject {
  sourceCode: string
  sourceName: string
  sourceGrade: number
  sourceCredits: number
  sourceArea: string
  targetCode: string
  targetName: string
  targetCredits: number
  autoApproved: boolean
}

export interface RejectedSubject {
  sourceCode: string
  sourceName: string
  sourceGrade: number | null
  sourceCredits: number
  sourceArea: string
  rejectionReason: string
  rejectionReasonDescription: string
}

export interface HomologationMetrics {
  totalSubjectsInHistory: number
  totalSubjectsEvaluated: number
  totalHomologable: number
  totalRejected: number
  creditsHomologable: number
  totalTargetCredits: number
  homologationPercentage: number
}

// Submit
export interface SubmitResponse {
  requestId: string
  status: string
  message: string
}

// Review
export interface SubjectOverride {
  subjectId: string
  isHomologable: boolean
  notes?: string
}

export interface ReviewResponse {
  requestId: string
  status: string
  message: string
}

// My requests
export interface RequestSummary {
  id: string
  sourceProgramCode: string
  sourceProgramName: string
  targetProgramCode: string
  targetProgramName: string
  status: HomologationStatus
  totalSubjectsApproved: number
  totalCreditsHomologated: number
  createdAt: string
  reviewedAt: string | null
  documentUrl: string | null
}

// Pending requests (coordinador)
export interface PendingRequest {
  id: string
  studentName: string
  studentCode: string
  sourceProgramCode: string
  targetProgramCode: string
  status: HomologationStatus
  totalSubjectsApproved: number
  totalCreditsHomologated: number
  createdAt: string
}

// Request detail
export interface RequestDetail {
  id: string
  studentName: string
  studentCode: string
  studentAzureOid: string
  sourceProgramCode: string
  sourceProgramName: string
  targetProgramCode: string
  targetProgramName: string
  status: HomologationStatus
  studentNotes: string | null
  coordinatorNotes: string | null
  documentUrl: string | null
  createdAt: string
  reviewedAt: string | null
  metrics: {
    totalEvaluated: number
    totalApproved: number
    totalRejected: number
    creditsHomologated: number
  }
  homologableSubjects: SubjectDetail[]
  rejectedSubjects: SubjectDetail[]
}

export interface SubjectDetail {
  id: string
  sourceCode: string
  sourceName: string
  sourceGrade: number
  sourceCredits: number
  sourceArea: string
  targetCode: string
  targetName: string
  targetCredits: number
  isHomologable: boolean
  rejectionReason: string | null
  coordinatorOverride: boolean
  coordinatorNotes: string | null
}

// Students (coordinator view)
export interface StudentRecord {
  studentAzureOid: string
  studentName: string
  studentCode: string
  sourceProgramCode: string
  targetProgramCode: string
  totalRequests: number
  lastRequestDate: string
  lastStatus: HomologationStatus
}

// Rules
export interface HomologationRule {
  id: string
  sourceProgramCode: string
  targetProgramCode: string
  minGrade: number
  maxCreditsPercentage: number
  requiresSameArea: boolean
  active: boolean
  createdAt: string
  equivalencesCount: number
}

export interface HomologationRuleDetail {
  id: string
  sourceProgramCode: string
  targetProgramCode: string
  minGrade: number
  maxCreditsPercentage: number
  requiresSameArea: boolean
  active: boolean
  createdAt: string
  updatedAt: string
  equivalences: SubjectEquivalence[]
}

export interface SubjectEquivalence {
  id: string
  sourceSubjectCode: string
  sourceSubjectName: string
  sourceCredits: number
  targetSubjectCode: string
  targetSubjectName: string
  targetCredits: number
  minGradeOverride: number | null
  active: boolean
}

// Notifications
export interface Notification {
  id: string
  title: string
  message: string
  type: string
  referenceId: string | null
  createdAt: string
  isRead: boolean
}

export type HomologationStatus =
  | "Draft"
  | "Pending"
  | "Reviewing"
  | "Approved"
  | "Rejected"
  | "DocumentReady"

// ── Cliente ───────────────────────────────────────────────────────────────────

export class GradusApiClient {
  private readonly baseUrl: string
  private readonly accessToken: string

  constructor(accessToken: string) {
    this.baseUrl =
      process.env.NEXT_PUBLIC_GRADUS_API_URL ?? "http://localhost:5002"
    this.accessToken = accessToken
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    })

    if (!res.ok) {
      // Intentar parsear el error estructurado
      let errorBody: GradusApiError | null = null
      try {
        errorBody = await res.json()
      } catch {
        // Si no es JSON, crear un error genérico
      }

      throw new GradusApiException(
        res.status,
        errorBody?.title ?? `Error ${res.status}`,
        errorBody?.type ?? "UnknownError",
        errorBody?.errors
      )
    }

    // 204 No Content — no hay body
    if (res.status === 204) return undefined as unknown as T

    return res.json()
  }

  // ── Homologaciones ─────────────────────────────────────────────────────────

  /**
   * Genera vista previa de homologación para el estudiante autenticado.
   */
  async previewHomologation(
    targetProgramCode: string
  ): Promise<PreviewResponse> {
    return this.request<PreviewResponse>("/api/homologations/preview", {
      method: "POST",
      body: JSON.stringify({ targetProgramCode }),
    })
  }

  /**
   * El estudiante envía la solicitud al coordinador.
   */
  async submitHomologation(
    draftId: string,
    studentNotes?: string
  ): Promise<SubmitResponse> {
    return this.request<SubmitResponse>(
      `/api/homologations/${draftId}/submit`,
      {
        method: "POST",
        body: JSON.stringify({ studentNotes: studentNotes ?? null }),
      }
    )
  }

  /**
   * El coordinador aprueba o rechaza una solicitud.
   */
  async reviewHomologation(
    requestId: string,
    approve: boolean,
    coordinatorNotes?: string,
    subjectOverrides?: SubjectOverride[]
  ): Promise<ReviewResponse> {
    return this.request<ReviewResponse>(
      `/api/homologations/${requestId}/review`,
      {
        method: "POST",
        body: JSON.stringify({
          approve,
          coordinatorNotes: coordinatorNotes ?? null,
          subjectOverrides: subjectOverrides ?? null,
        }),
      }
    )
  }

  /**
   * Mis solicitudes (estudiante autenticado).
   */
  async getMyRequests(): Promise<RequestSummary[]> {
    return this.request<RequestSummary[]>("/api/homologations/my")
  }

  /**
   * Solicitudes pendientes de revisión (solo coordinadores).
   */
  async getPendingRequests(): Promise<PendingRequest[]> {
    return this.request<PendingRequest[]>("/api/homologations/pending")
  }

  /**
   * Detalle completo de una solicitud.
   */
  async getRequestDetail(requestId: string): Promise<RequestDetail> {
    return this.request<RequestDetail>(`/api/homologations/${requestId}`)
  }

  // ── Estudiantes (coordinador) ──────────────────────────────────────────────

  async getAllStudents(search?: string): Promise<StudentRecord[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : ""
    return this.request<StudentRecord[]>(`/api/students${qs}`)
  }

  async getStudentRequests(studentOid: string): Promise<RequestSummary[]> {
    return this.request<RequestSummary[]>(
      `/api/students/${encodeURIComponent(studentOid)}/requests`
    )
  }

  // ── Reglas ─────────────────────────────────────────────────────────────────

  async getRules(): Promise<HomologationRule[]> {
    return this.request<HomologationRule[]>("/api/rules")
  }

  async getRuleDetail(ruleId: string): Promise<HomologationRuleDetail> {
    return this.request<HomologationRuleDetail>(`/api/rules/${ruleId}`)
  }

  async createRule(data: {
    sourceProgramCode: string
    targetProgramCode: string
    minGrade: number
    maxCreditsPercentage: number
    requiresSameArea: boolean
  }): Promise<{ ruleId: string }> {
    return this.request<{ ruleId: string }>("/api/rules", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async updateRule(
    ruleId: string,
    data: {
      minGrade: number
      maxCreditsPercentage: number
      requiresSameArea: boolean
    }
  ): Promise<void> {
    return this.request<void>(`/api/rules/${ruleId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deactivateRule(ruleId: string): Promise<void> {
    return this.request<void>(`/api/rules/${ruleId}`, { method: "DELETE" })
  }

  async addEquivalence(
    ruleId: string,
    data: {
      sourceSubjectCode: string
      sourceSubjectName: string
      sourceCredits: number
      targetSubjectCode: string
      targetSubjectName: string
      targetCredits: number
      minGradeOverride: number | null
    }
  ): Promise<{ equivalenceId: string }> {
    return this.request<{ equivalenceId: string }>(
      `/api/rules/${ruleId}/equivalences`,
      { method: "POST", body: JSON.stringify(data) }
    )
  }

  async updateEquivalence(
    ruleId: string,
    equivalenceId: string,
    data: {
      sourceSubjectCode: string
      sourceSubjectName: string
      sourceCredits: number
      targetSubjectCode: string
      targetSubjectName: string
      targetCredits: number
      minGradeOverride: number | null
    }
  ): Promise<void> {
    return this.request<void>(
      `/api/rules/${ruleId}/equivalences/${equivalenceId}`,
      { method: "PUT", body: JSON.stringify(data) }
    )
  }

  async removeEquivalence(
    ruleId: string,
    equivalenceId: string
  ): Promise<void> {
    return this.request<void>(
      `/api/rules/${ruleId}/equivalences/${equivalenceId}`,
      { method: "DELETE" }
    )
  }

  // ── Notificaciones ─────────────────────────────────────────────────────────

  /**
   * Notificaciones no leídas del usuario autenticado.
   */
  async getUnreadNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>("/api/notifications/unread")
  }

  /**
   * Todas las notificaciones del usuario (paginadas).
   */
  async getAllNotifications(page = 1, pageSize = 20): Promise<Notification[]> {
    return this.request<Notification[]>(
      `/api/notifications?page=${page}&pageSize=${pageSize}`
    )
  }

  /**
   * Marcar una notificación como leída.
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    return this.request<void>(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    })
  }

  /**
   * Marcar todas las notificaciones como leídas.
   */
  async markAllNotificationsAsRead(): Promise<void> {
    return this.request<void>("/api/notifications/read-all", {
      method: "PATCH",
    })
  }

  // ── Documentos ─────────────────────────────────────────────────────────────

  /**
   * URL completa para descargar el PDF de una solicitud aprobada.
   */
  getDocumentUrl(documentUrl: string): string {
    return `${this.baseUrl}${documentUrl}`
  }
}

// ── Error tipado ──────────────────────────────────────────────────────────────

export class GradusApiException extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly type: string,
    public readonly errors?: Record<string, string[]>
  ) {
    super(title)
    this.name = "GradusApiException"
  }

  get isUnauthorized() {
    return this.status === 401
  }
  get isForbidden() {
    return this.status === 403
  }
  get isConflict() {
    return this.status === 409
  }
  get isValidationError() {
    return this.status === 400
  }

  /**
   * Retorna el primer mensaje de error de validación de un campo.
   */
  getFieldError(field: string): string | undefined {
    return this.errors?.[field]?.[0]
  }

  /**
   * Retorna todos los errores de validación aplanados.
   */
  getAllErrors(): string[] {
    if (!this.errors) return [this.title]
    return Object.values(this.errors).flat()
  }
}

// ── Factory helper ────────────────────────────────────────────────────────────

/**
 * Crea una instancia del cliente con el token de la sesión actual.
 * Uso en Server Components y Route Handlers:
 *
 * const session = await getSession();
 * const api = createGradusClient(session.accessToken);
 */
export function createGradusClient(accessToken: string): GradusApiClient {
  return new GradusApiClient(accessToken)
}
