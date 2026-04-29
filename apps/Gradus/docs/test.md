# Gradus API — Guía de Pruebas Manuales con Insomnia

> **Base URL**: `http://localhost:5002`  
> **Swagger UI**: `http://localhost:5002/swagger`  
> **TenantId**: `dc5b2439-1ae1-494a-9640-47ae1180d6ad`  
> **ClientId (API)**: `47ab77cc-9160-45a5-b4a0-dc52623cc325`

---

## Configuración Inicial en Insomnia

### Paso 1 — Variables de entorno

Crear un **Environment** en Insomnia con estas variables:

```json
{
  "base_url": "http://localhost:5002",
  "tenant_id": "dc5b2439-1ae1-494a-9640-47ae1180d6ad",
  "client_id": "47ab77cc-9160-45a5-b4a0-dc52623cc325",
  "token_estudiante": "",
  "token_coordinador": "",
  "draft_id": "",
  "request_id": ""
}
```

### Paso 2 — Obtener tokens de Azure AD

> [!IMPORTANT]
> Necesitas un token por cada **rol** distinto. El `access_token` se guarda en una cookie `HttpOnly` al hacer login con el frontend — no es visible con `document.cookie`, solo desde DevTools.

#### Opción A — Desde el frontend (recomendado)

1. Abre `http://localhost:3004` en Chrome/Edge/Firefox
2. Abre **DevTools** (`F12`) → pestaña **Network** → marca **"Preserve log"**
3. Filtra por `callback` en la barra de búsqueda de Network
4. Ve a `http://localhost:3004/api/auth/login` — iniciará el flujo de login con Azure AD
5. Inicia sesión con la cuenta que tiene rol **`estudiante`**
6. Haz click en la request `/api/auth/callback` → **Response Headers** → busca `Set-Cookie`
7. Copia el valor de la cookie `access_token`

   Alternativa: DevTools → **Application → Cookies → `http://localhost:3004`** → copia el valor de `access_token`

8. Pégalo en la variable `token_estudiante` del environment de Insomnia
9. **Cierra sesión** (`http://localhost:3004/api/auth/logout`) y repite desde el paso 4 con la cuenta **`coordinador`** → copia a `token_coordinador`

**Verificar que el token es correcto** — pégalo en [jwt.ms](https://jwt.ms) y confirma:

```json
{
  "aud": "47ab77cc-9160-45a5-b4a0-dc52623cc325",
  "oid": "<guid-del-usuario>",
  "roles": ["estudiante"],
  "scp": "access_as_user"
}
```

#### Opción B — MSAL Playground (sin frontend)

1. Ir a: `https://login.microsoftonline.com/dc5b2439-1ae1-494a-9640-47ae1180d6ad/oauth2/v2.0/authorize`
2. Usar el flujo **Authorization Code** con scope: `api://47ab77cc-9160-45a5-b4a0-dc52623cc325/.default`

### Paso 3 — Configurar Bearer Token en Insomnia

Para cada request que requiera autenticación:

1. Pestaña **Auth** → seleccionar **Bearer Token**
2. Pegar el token (sin el prefijo `Bearer `)
3. O usar la variable del environment: `{{ token_estudiante }}`

---

## TC-00 · Health Check (Sin autenticación)

| Campo | Valor |
|---|---|
| Método | `GET` |
| URL | `{{ base_url }}/health` |
| Auth | Ninguna |

### Resultado esperado

```http
HTTP/1.1 200 OK
Content-Type: application/json
```
```json
{
  "status": "healthy",
  "timestamp": "2026-04-28T15:00:00Z"
}
```

### Casos negativos

| Escenario | Resultado esperado |
|---|---|
| API apagada | `Connection refused` en Insomnia |

---

## TC-01 · Preview de Homologación

> **Requiere**: token de `estudiante`

| Campo | Valor |
|---|---|
| Método | `POST` |
| URL | `{{ base_url }}/api/homologations/preview` |
| Auth | Bearer `{{ token_estudiante }}` |
| Content-Type | `application/json` |

### Body

```json
{
  "targetProgramCode": "INGE-002"
}
```

> Reemplaza `"INGE-002"` por un código de programa destino real que exista en la BD y sea diferente al programa actual del estudiante.

### Resultado esperado — 200 OK

```json
{
  "draftRequestId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "student": {
    "identity": "CC-1234567",
    "azureOid": "<oid-del-token>",
    "fullName": "Juan Pérez",
    "studentCode": "2021-001",
    "campus": "Bogotá"
  },
  "sourceProgram": { "code": "INGE-001", "name": "Ingeniería de Sistemas", "mode": "Presencial" },
  "targetProgram": { "code": "INGE-002", "name": "INGE-002", "mode": "" },
  "rule": { "minGrade": 3.5, "maxCreditsPercentage": 60, "requiresSameArea": false },
  "homologableSubjects": [...],
  "rejectedSubjects": [...],
  "metrics": {
    "totalSubjectsInHistory": 20,
    "totalSubjectsEvaluated": 15,
    "totalHomologable": 10,
    "totalRejected": 5,
    "creditsHomologable": 72,
    "totalTargetCredits": 120,
    "homologationPercentage": 60.0
  }
}
```

> Guardar el valor de `draftRequestId` en la variable `{{ draft_id }}` del environment.

### Casos negativos

| Escenario | Body | Auth | Resultado esperado |
|---|---|---|---|
| Sin token | igual | Ninguna | `401 Unauthorized` |
| Token de coordinador | igual | `{{ token_coordinador }}` | `403 Forbidden` |
| Programa destino = programa actual | `"targetProgramCode": "<código-actual>"` | `{{ token_estudiante }}` | `409 Conflict` — *"El programa destino no puede ser igual al programa actual"* |
| Programa sin regla configurada | `"targetProgramCode": "XXXX-999"` | `{{ token_estudiante }}` | `409 Conflict` — *"No existe una regla de homologación activa"* |
| Campo faltante | `{}` | `{{ token_estudiante }}` | `400 Bad Request` — errores de validación |
| Solicitud activa ya existente | mismo body (segunda vez) | `{{ token_estudiante }}` | `409 Conflict` — *"Ya existe una solicitud activa"* |

---

## TC-02 · Enviar Solicitud (Submit)

> **Requiere**: token de `estudiante` + `draftRequestId` del TC-01

| Campo | Valor |
|---|---|
| Método | `POST` |
| URL | `{{ base_url }}/api/homologations/{{ draft_id }}/submit` |
| Auth | Bearer `{{ token_estudiante }}` |
| Content-Type | `application/json` |

### Body

```json
{
  "studentNotes": "Solicito la homologación ya que completé el 70% de materias equivalentes con notas superiores a 4.0."
}
```

También válido con notas vacías:

```json
{
  "studentNotes": null
}
```

### Resultado esperado — 200 OK

```json
{
  "requestId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "PendingReview",
  "message": "Solicitud enviada correctamente al coordinador."
}
```

> Guardar `requestId` en la variable `{{ request_id }}`.

### Casos negativos

| Escenario | Resultado esperado |
|---|---|
| Sin token | `401 Unauthorized` |
| Token de coordinador | `403 Forbidden` |
| `draft_id` inexistente (`GET /api/homologations/00000000-0000-0000-0000-000000000001/submit`) | `404 Not Found` |
| `draft_id` ya enviado (segunda vez) | `409 Conflict` — *"La solicitud ya fue enviada"* |
| UUID malformado en URL (`/api/homologations/not-a-guid/submit`) | `400 Bad Request` |

---

## TC-03 · Revisar Solicitud (Aprobación)

> **Requiere**: token de `coordinador` + `request_id` del TC-02

| Campo | Valor |
|---|---|
| Método | `POST` |
| URL | `{{ base_url }}/api/homologations/{{ request_id }}/review` |
| Auth | Bearer `{{ token_coordinador }}` |
| Content-Type | `application/json` |

### Body — Aprobar sin excepciones

```json
{
  "approve": true,
  "coordinatorNotes": "Se aprueba la homologación. El estudiante cumple con todos los requisitos académicos.",
  "subjectOverrides": null
}
```

### Body — Aprobar con excepciones manuales

```json
{
  "approve": true,
  "coordinatorNotes": "Aprobado con ajuste manual en Cálculo II.",
  "subjectOverrides": [
    {
      "subjectId": "{{id-de-la-materia}}",
      "isHomologable": true,
      "notes": "Se aprueba excepcionalmente por experiencia laboral certificada."
    }
  ]
}
```

### Body — Rechazar

```json
{
  "approve": false,
  "coordinatorNotes": "No se cumplen los requisitos mínimos de créditos homologables.",
  "subjectOverrides": null
}
```

### Resultado esperado — 200 OK

```json
{
  "requestId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "Approved",
  "message": "Solicitud revisada correctamente."
}
```

### Casos negativos

| Escenario | Resultado esperado |
|---|---|
| Sin token | `401 Unauthorized` |
| Token de estudiante | `403 Forbidden` |
| `request_id` inexistente | `404 Not Found` |
| Solicitud ya revisada (segunda vez) | `409 Conflict` — *"La solicitud ya fue revisada"* |
| `subjectOverrides` con `subjectId` inexistente | `404 Not Found` o `409 Conflict` |

---

## TC-04 · Mis Solicitudes (Estudiante)

> **Requiere**: token de `estudiante`

| Campo | Valor |
|---|---|
| Método | `GET` |
| URL | `{{ base_url }}/api/homologations/my` |
| Auth | Bearer `{{ token_estudiante }}` |

### Resultado esperado — 200 OK

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "sourceProgramCode": "INGE-001",
    "sourceProgramName": "Ingeniería de Sistemas",
    "targetProgramCode": "INGE-002",
    "targetProgramName": "INGE-002",
    "status": "PendingReview",
    "totalSubjectsApproved": 10,
    "totalCreditsHomologated": 72,
    "createdAt": "2026-04-28T15:00:00Z",
    "reviewedAt": null,
    "documentUrl": null
  }
]
```

Lista vacía `[]` si el estudiante no tiene solicitudes.

### Casos negativos

| Escenario | Resultado esperado |
|---|---|
| Sin token | `401 Unauthorized` |
| Token de coordinador | `403 Forbidden` |

---

## TC-05 · Solicitudes Pendientes (Coordinador)

> **Requiere**: token de `coordinador`

| Campo | Valor |
|---|---|
| Método | `GET` |
| URL | `{{ base_url }}/api/homologations/pending` |
| Auth | Bearer `{{ token_coordinador }}` |

### Resultado esperado — 200 OK

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "studentName": "Juan Pérez",
    "studentCode": "2021-001",
    "sourceProgramCode": "INGE-001",
    "targetProgramCode": "INGE-002",
    "status": "PendingReview",
    "totalSubjectsApproved": 10,
    "totalCreditsHomologated": 72,
    "createdAt": "2026-04-28T15:00:00Z"
  }
]
```

### Casos negativos

| Escenario | Resultado esperado |
|---|---|
| Sin token | `401 Unauthorized` |
| Token de estudiante | `403 Forbidden` |

---

## TC-06 · Detalle de una Solicitud

> **Requiere**: token de `estudiante` (ve su propia) **o** `coordinador` (ve cualquiera)

| Campo | Valor |
|---|---|
| Método | `GET` |
| URL | `{{ base_url }}/api/homologations/{{ request_id }}` |
| Auth | Bearer `{{ token_estudiante }}` o `{{ token_coordinador }}` |

### Resultado esperado — 200 OK

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "studentName": "Juan Pérez",
  "studentCode": "2021-001",
  "studentAzureOid": "<oid>",
  "sourceProgramCode": "INGE-001",
  "sourceProgramName": "Ingeniería de Sistemas",
  "targetProgramCode": "INGE-002",
  "targetProgramName": "INGE-002",
  "status": "Approved",
  "studentNotes": "Solicito la homologación...",
  "coordinatorNotes": "Se aprueba la homologación.",
  "documentUrl": null,
  "createdAt": "2026-04-28T15:00:00Z",
  "reviewedAt": "2026-04-28T16:00:00Z",
  "metrics": {
    "totalEvaluated": 15,
    "totalApproved": 10,
    "totalRejected": 5,
    "creditsHomologated": 72
  },
  "homologableSubjects": [
    {
      "id": "<guid>",
      "sourceCode": "MAT101",
      "sourceName": "Cálculo I",
      "sourceGrade": 4.2,
      "sourceCredits": 4,
      "sourceArea": "BASIC",
      "targetCode": "MAT201",
      "targetName": "Cálculo Diferencial",
      "targetCredits": 4,
      "isHomologable": true,
      "rejectionReason": null,
      "coordinatorOverride": false,
      "coordinatorNotes": null
    }
  ],
  "rejectedSubjects": [...]
}
```

### Casos negativos

| Escenario | Auth | Resultado esperado |
|---|---|---|
| Sin token | Ninguna | `401 Unauthorized` |
| Estudiante viendo solicitud de otro | `{{ token_estudiante }}` (diferente OID) | `403 Forbidden` |
| UUID inexistente | cualquier token válido | `404 Not Found` |
| UUID malformado | cualquier token válido | `400 Bad Request` |

---

## TC-07 · Notificaciones No Leídas

> **Requiere**: token de cualquier usuario autenticado

| Campo | Valor |
|---|---|
| Método | `GET` |
| URL | `{{ base_url }}/api/notifications/unread` |
| Auth | Bearer `{{ token_estudiante }}` |
| Query param | `azureOid=<oid-del-usuario>` |

> **Nota**: Este endpoint aún recibe `azureOid` como query param. Obtener el OID del token decodificado en [jwt.ms](https://jwt.ms).

URL completa ejemplo:
```
http://localhost:5002/api/notifications/unread?azureOid=abc123-def456
```

### Resultado esperado — 200 OK

```json
[
  {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "title": "Solicitud aprobada",
    "message": "Tu solicitud de homologación ha sido aprobada por el coordinador.",
    "type": "HomologationApproved",
    "referenceId": "<request-id>",
    "createdAt": "2026-04-28T16:00:00Z",
    "isRead": false
  }
]
```

Lista vacía `[]` si no hay notificaciones.

### Casos negativos

| Escenario | Resultado esperado |
|---|---|
| Sin token | `401 Unauthorized` |
| Sin query param `azureOid` | `400 Bad Request` |

---

## TC-08 · Todas las Notificaciones (Paginadas)

| Campo | Valor |
|---|---|
| Método | `GET` |
| URL | `{{ base_url }}/api/notifications?azureOid=<oid>&page=1&pageSize=20` |
| Auth | Bearer `{{ token_estudiante }}` |

### Variaciones de prueba

| Query Params | Descripción |
|---|---|
| `?azureOid=<oid>&page=1&pageSize=5` | Primera página con 5 elementos |
| `?azureOid=<oid>&page=2&pageSize=5` | Segunda página |
| `?azureOid=<oid>` | Usa defaults: page=1, pageSize=20 |

### Resultado esperado — 200 OK

Mismo formato que TC-07 pero con todos los registros (leídos y no leídos).

---

## TC-09 · Marcar Notificación como Leída

| Campo | Valor |
|---|---|
| Método | `PATCH` |
| URL | `{{ base_url }}/api/notifications/<notification-id>/read` |
| Auth | Bearer `{{ token_estudiante }}` |
| Body | Vacío |

### Resultado esperado — 204 No Content

(Sin cuerpo en la respuesta)

### Casos negativos

| Escenario | Resultado esperado |
|---|---|
| Sin token | `401 Unauthorized` |
| `notification-id` inexistente | `404 Not Found` |
| UUID malformado | `400 Bad Request` |

---

## TC-10 · Marcar Todas las Notificaciones como Leídas

| Campo | Valor |
|---|---|
| Método | `PATCH` |
| URL | `{{ base_url }}/api/notifications/read-all?azureOid=<oid>` |
| Auth | Bearer `{{ token_estudiante }}` |
| Body | Vacío |

### Resultado esperado — 204 No Content

---

## TC-11 · Test M2M — Universitas Client (Solo Development)

> Verifica la conectividad con la API de Universitas desde Gradus.

| Campo | Valor |
|---|---|
| Método | `GET` |
| URL | `{{ base_url }}/test/universitas/<identity>` |
| Auth | Ninguna (endpoint interno sin `[Authorize]`) |
| Ejemplo | `http://localhost:5002/test/universitas/CC-1234567` |

### Resultado esperado — 200 OK

```json
{
  "profile": {
    "identity": "CC-1234567",
    "firstName": "Juan",
    "lastName": "Pérez",
    "studentCode": "2021-001",
    "campus": "Bogotá",
    "program": { "code": "INGE-001", "name": "Ingeniería de Sistemas", "mode": "Presencial" }
  },
  "history": {
    "totalSubjects": 20,
    "subjects": [...]
  }
}
```

### Casos negativos

| Escenario | Resultado esperado |
|---|---|
| `identity` inexistente | `409 Conflict` — *"No se encontró el estudiante"* |
| Universitas API apagada | `500 Internal Server Error` (con Polly retry) |
| En producción | `404 Not Found` (el endpoint no existe fuera de Development) |

---

## TC-12 · Descargar Documento PDF

| Campo | Valor |
|---|---|
| Método | `GET` |
| URL | `{{ base_url }}/documents/<fileName>` |
| Auth | Ninguna |
| Ejemplo | `http://localhost:5002/documents/homologacion-2026-001.pdf` |

### Resultado esperado — 200 OK

Respuesta con `Content-Type: application/pdf` y el archivo descargado.

### Casos negativos

| Escenario | Resultado esperado |
|---|---|
| Archivo inexistente | `404 Not Found` |

---

## Flujo Completo de Prueba (Happy Path)

Orden recomendado para validar el flujo de punta a punta:

```
TC-00  →  Health ✅
TC-01  →  Preview (guardar draftRequestId)
TC-04  →  Mis solicitudes (verificar que aparece como Draft)
TC-02  →  Submit (guardar requestId)
TC-04  →  Mis solicitudes (verificar estado PendingReview)
TC-05  →  Pending (coordinador ve la solicitud)
TC-06  →  Detalle (coordinador ve materias)
TC-03  →  Review - Aprobar
TC-06  →  Detalle (verificar estado Approved)
TC-07  →  Notificaciones del estudiante (debe haber una nueva)
TC-09  →  Marcar notificación como leída
TC-07  →  Notificaciones (lista vacía o sin la notificación)
```

---

## Referencia Rápida de Códigos de Estado

| Código | Significado en Gradus |
|---|---|
| `200 OK` | Operación exitosa con cuerpo de respuesta |
| `204 No Content` | Operación exitosa sin cuerpo (PATCH de notificaciones) |
| `400 Bad Request` | Validación fallida (FluentValidation) o ruta malformada |
| `401 Unauthorized` | Token ausente, expirado o inválido |
| `403 Forbidden` | Token válido pero sin el rol requerido |
| `404 Not Found` | Recurso no encontrado en la BD |
| `409 Conflict` | Regla de negocio violada (solicitud duplicada, estado incorrecto, etc.) |
| `500 Internal Server Error` | Error no controlado (revisar logs de la API) |
