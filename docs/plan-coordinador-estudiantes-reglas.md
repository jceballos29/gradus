# Plan: Vista Coordinador — Estudiantes + Reglas de Homologación

## Contexto

Stack: Next.js App Router + ASP.NET Core + CQRS/MediatR + EF Core/PostgreSQL.

Coordinador actualmente solo tiene:
- `/coordinator/page.tsx` → lista solicitudes pending
- `/coordinator/[id]/page.tsx` → aprobar/rechazar

Falta: tabla de estudiantes con drill-down y gestión de reglas.

---

## Feature 1: Vista de Estudiantes con Drill-Down

### Flujo de navegación

```
/coordinator/students                                    → tabla de todos los estudiantes
/coordinator/students/[studentId]                        → historial de solicitudes del estudiante
/coordinator/students/[studentId]/requests/[requestId]  → detalle de solicitud (read-only)
```

### BACKEND

**B1.1 — Query: `GetAllStudentsQuery`**
- Directorio: `Gradus.Application/Queries/GetAllStudents/`
- Agrupa `HomologationRequest` por `StudentAzureOid`
- Proyecta: `StudentAzureOid`, `StudentName`, `StudentCode`, `SourceProgramCode`, `TargetProgramCode`, `TotalRequests`, `LastRequestDate`, `LastStatus`
- DTO: `StudentSummaryDto`
- Filtro opcional: `searchTerm` (nombre o código)

**B1.2 — Query: `GetStudentRequestsQuery`**
- Directorio: `Gradus.Application/Queries/GetStudentRequests/`
- Recibe `studentAzureOid`
- Retorna `List<RequestSummaryDto>` (mismo DTO que `GetMyRequests`, sin restricción de identidad)
- Reutilizar `IHomologationRepository` — agregar `GetByStudentOidAsync(string oid)`

**B1.3 — Endpoint: `GET /api/students`**
- Controlador: `StudentsController.cs` en `Gradus.API/Controllers/`
- Role: `[Authorize(Roles = "coordinador")]`
- Query param: `?search=` (opcional)
- Despacha `GetAllStudentsQuery`

**B1.4 — Endpoint: `GET /api/students/{studentOid}/requests`**
- En `StudentsController`
- Despacha `GetStudentRequestsQuery`
- Detalle por solicitud: reutilizar `GET /api/homologations/{requestId}`

**B1.5 — Repository: extender `IHomologationRepository`**
- Agregar: `Task<IReadOnlyList<HomologationRequest>> GetByStudentOidAsync(string oid, CancellationToken ct)`
- Agregar: `Task<IReadOnlyList<StudentSnapshot>> GetAllStudentsAsync(string? search, CancellationToken ct)`

**B1.6 — Migración EF Core**
- Verificar `HomologationRequestConfiguration.cs`
- Agregar índice en `StudentAzureOid` si no existe

### FRONTEND

**F1.1 — DTOs en `gradus-api.ts`**
- `StudentSummary { azureOid, name, code, sourceProgramCode, targetProgramCode, totalRequests, lastRequestDate, lastStatus }`
- Métodos cliente: `getAllStudents(search?: string)`, `getStudentRequests(studentOid: string)`

**F1.2 — Página `/coordinator/students/page.tsx`**
- Server Component
- Tabla: Nombre, Código, Programa origen → destino, Total solicitudes, Última solicitud, Estado
- Buscador con searchParams
- Cada fila linkea a `/coordinator/students/[oid]`
- Empty state si no hay estudiantes

**F1.3 — Página `/coordinator/students/[studentId]/page.tsx`**
- Server Component
- Header con info del estudiante
- Lista de RequestCard agrupadas: "En proceso" / "Resueltas"
- Cada card linkea a `/coordinator/students/[studentId]/requests/[requestId]`

**F1.4 — Página `/coordinator/students/[studentId]/requests/[requestId]/page.tsx`**
- Reutilizar lógica de `/coordinator/[id]/page.tsx`
- Detalle completo (timeline, métricas, tablas)
- Sin panel de aprobar/rechazar
- Breadcrumb: Coordinador → Estudiantes → [Nombre] → [Solicitud]

**F1.5 — Sidebar (`/coordinator/layout.tsx`)**
- Agregar link "Estudiantes" → `/coordinator/students`
- Icono: `Users` de lucide-react

---

## Feature 2: Gestión de Reglas de Homologación

### Flujo de navegación

```
/coordinator/rules              → tabla de reglas
/coordinator/rules/new          → crear regla
/coordinator/rules/[ruleId]     → detalle + editar + equivalencias
```

### BACKEND

**B2.1 — Query: `GetAllRulesQuery`**
- Directorio: `Gradus.Application/Queries/GetAllRules/`
- Retorna todas las reglas (activas e inactivas)
- Filtro opcional: `?activeOnly=true`
- DTO: `HomologationRuleDto { id, sourceProgramCode, targetProgramCode, minGrade, maxCreditsPercentage, requiresSameArea, active, createdAt, equivalencesCount }`

**B2.2 — Query: `GetRuleDetailQuery`**
- Recibe `ruleId`
- Retorna regla + lista completa de equivalencias
- DTO: `HomologationRuleDetailDto` con `SubjectEquivalenceDto[]`

**B2.3 — Command: `CreateRuleCommand`**
- Directorio: `Gradus.Application/Commands/CreateRule/`
- Input: `sourceProgramCode`, `targetProgramCode`, `minGrade`, `maxCreditsPercentage`, `requiresSameArea`
- Validación FluentValidation: grade 0.0–5.0, percentage 1–100, programCodes requeridos
- Setea `CreatedByAzureOid` desde `ICurrentUserService`
- Retorna `ruleId`

**B2.4 — Command: `UpdateRuleCommand`**
- Input: `ruleId` + `minGrade`, `maxCreditsPercentage`, `requiresSameArea`
- Setea `UpdatedByAzureOid`
- Llama `rule.Update(...)` en domain entity

**B2.5 — Command: `DeactivateRuleCommand`**
- Input: `ruleId`
- Llama `rule.Deactivate()` — soft delete
- No borra físicamente

**B2.6 — Commands CRUD Equivalencias**
- `AddSubjectEquivalenceCommand`: agrega equivalencia a regla
- `UpdateSubjectEquivalenceCommand`: modifica equivalencia
- `RemoveSubjectEquivalenceCommand`: soft delete (`Active = false`)
- Input: `sourceProgramCode`, `targetProgramCode`, `sourceSubjectCode/Name/Credits`, `targetSubjectCode/Name/Credits`, `minGradeOverride?`

**B2.7 — Repository: extender `IEquivalenceRepository`**
- Verificar métodos existentes (tiene `GetRulesAsync`)
- Agregar si faltan: `GetByIdAsync`, `AddRuleAsync`, `UpdateRuleAsync`
- CRUD equivalencias si no existen

**B2.8 — Controlador: `RulesController.cs`**
```
GET    /api/rules                              → GetAllRulesQuery
GET    /api/rules/{ruleId}                     → GetRuleDetailQuery
POST   /api/rules                              → CreateRuleCommand
PUT    /api/rules/{ruleId}                     → UpdateRuleCommand
DELETE /api/rules/{ruleId}                     → DeactivateRuleCommand
POST   /api/rules/{ruleId}/equivalences        → AddSubjectEquivalenceCommand
PUT    /api/rules/{ruleId}/equivalences/{eqId} → UpdateSubjectEquivalenceCommand
DELETE /api/rules/{ruleId}/equivalences/{eqId} → RemoveSubjectEquivalenceCommand
```
- Todo con `[Authorize(Roles = "coordinador")]`

### FRONTEND

**F2.1 — DTOs en `gradus-api.ts`**
- `HomologationRule { id, sourceProgramCode, targetProgramCode, minGrade, maxCreditsPercentage, requiresSameArea, active, createdAt, equivalencesCount }`
- `HomologationRuleDetail` extiende con `equivalences: SubjectEquivalence[]`
- `SubjectEquivalence { id, sourceSubjectCode, sourceSubjectName, sourceCredits, targetSubjectCode, targetSubjectName, targetCredits, minGradeOverride, active }`
- Métodos cliente: `getRules()`, `getRuleDetail(id)`, `createRule(data)`, `updateRule(id, data)`, `deactivateRule(id)`, CRUD equivalencias

**F2.2 — Página `/coordinator/rules/page.tsx`**
- Server Component
- Tabla: Origen → Destino, Nota mínima, Máx. créditos %, Requiere misma área, Equivalencias, Estado, Acciones
- Botón "Nueva regla" → `/coordinator/rules/new`
- Badge: activa (verde) / inactiva (gris)

**F2.3 — Página `/coordinator/rules/new/page.tsx`**
- Client Component
- Campos: Source Program Code, Target Program Code, Nota mínima, Máx. % créditos, Requiere misma área (switch)
- Validación client-side
- Submit → `POST /api/rules` → redirect a `/coordinator/rules/[newId]`

**F2.4 — Página `/coordinator/rules/[ruleId]/page.tsx`**
- Sección superior: formulario editable (Client Component)
  - Botón "Guardar cambios" → `PUT /api/rules/{ruleId}`
  - Botón "Desactivar" con confirmación modal → `DELETE /api/rules/{ruleId}`
- Sección inferior: tabla de equivalencias de materias
  - Columnas: Código origen, Materia, Créditos, → Código destino, Materia, Créditos, Nota override, Acciones
  - Botón "Agregar equivalencia" → modal

**F2.5 — Componente: `RuleForm`**
- Reutilizable en `/rules/new` y `/rules/[id]`
- Props: `initialData?`, `onSubmit`, `loading`

**F2.6 — Componente: `EquivalencesTable`**
- Client Component con estado local
- Add/edit/delete en modal (`AddEquivalenceModal`)
- Refetch tras mutación

**F2.7 — Sidebar (`/coordinator/layout.tsx`)**
- Agregar link "Reglas" → `/coordinator/rules`
- Icono: `BookOpen` de lucide-react

---

## Orden de implementación

```
Sprint 1 — Backend base
  B1.5 → B1.1 → B1.2 → B1.3 → B1.4   (estudiantes)
  B2.7 → B2.1 → B2.2 → B2.8 GETs      (reglas read)

Sprint 2 — Backend mutaciones + Frontend Feature 1
  B2.3 → B2.4 → B2.5 → B2.6 → B2.8 writes
  F1.1 → F1.2 → F1.3 → F1.4 → F1.5

Sprint 3 — Frontend Feature 2
  F2.1 → F2.2 → F2.3 → F2.4 → F2.5 → F2.6 → F2.7
```

---

## Lista de tareas

| # | Área | Tarea | Dep |
|---|------|-------|-----|
| B1.1 | API | `GetAllStudentsQuery` + DTO | B1.5 |
| B1.2 | API | `GetStudentRequestsQuery` | B1.5 |
| B1.3 | API | `GET /api/students` | B1.1 |
| B1.4 | API | `GET /api/students/{oid}/requests` | B1.2 |
| B1.5 | API | Extender `IHomologationRepository` | — |
| B1.6 | API | Índice DB en `StudentAzureOid` | B1.5 |
| B2.1 | API | `GetAllRulesQuery` + DTO | B2.7 |
| B2.2 | API | `GetRuleDetailQuery` + DTO | B2.7 |
| B2.3 | API | `CreateRuleCommand` + validación | — |
| B2.4 | API | `UpdateRuleCommand` | B2.3 |
| B2.5 | API | `DeactivateRuleCommand` | B2.3 |
| B2.6 | API | Commands CRUD equivalencias | B2.3 |
| B2.7 | API | Extender `IEquivalenceRepository` | — |
| B2.8 | API | `RulesController` todos los endpoints | B2.1–B2.6 |
| F1.1 | FE | DTOs + métodos API client (estudiantes) | B1.3 |
| F1.2 | FE | `/coordinator/students/page.tsx` | F1.1 |
| F1.3 | FE | `/coordinator/students/[oid]/page.tsx` | F1.1 |
| F1.4 | FE | `/coordinator/students/[oid]/requests/[id]/page.tsx` | F1.3 |
| F1.5 | FE | Sidebar link "Estudiantes" | — |
| F2.1 | FE | DTOs + métodos API client (reglas) | B2.8 |
| F2.2 | FE | `/coordinator/rules/page.tsx` | F2.1 |
| F2.3 | FE | `/coordinator/rules/new/page.tsx` | F2.1 |
| F2.4 | FE | `/coordinator/rules/[id]/page.tsx` | F2.1 |
| F2.5 | FE | Componente `RuleForm` | F2.3 |
| F2.6 | FE | Componente `EquivalencesTable` + modal | F2.4 |
| F2.7 | FE | Sidebar link "Reglas" | — |
