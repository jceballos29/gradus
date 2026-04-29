# Gradus — Plan Técnico

**Politécnico Internacional — Sistema de Homologación**  
**Versión:** 1.0 | **Fecha:** Abril 2026

---

## Índice

1. [Arquitectura general](#arquitectura-general)
2. [Stack tecnológico](#stack-tecnológico)
3. [Azure AD — Configuración completa](#azure-ad--configuración-completa)
4. [Portal Universitario (universitas-ui)](#portal-universitario-universitas-ui)
5. [Gradus API (.NET 10)](#gradus-api-net-10)
6. [Gradus Web (Next.js)](#gradus-web-nextjs)
7. [Gradus Mobile (React Native)](#gradus-mobile-react-native)
8. [Comunicación M2M](#comunicación-m2m)
9. [Base de datos](#base-de-datos)
10. [Contratos de API](#contratos-de-api)
11. [Seguridad](#seguridad)
12. [Notificaciones](#notificaciones)
13. [Generación de documentos](#generación-de-documentos)
14. [Despliegue](#despliegue)
15. [Limitaciones y decisiones técnicas](#limitaciones-y-decisiones-técnicas)

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────────┐
│                      Azure AD (Microsoft Entra ID)              │
│          SSO centralizado para todo el ecosistema               │
└─────────────────────┬───────────────────────────────────────────┘
                      │ OAuth 2.0 + OIDC (tokens JWT)
          ┌───────────┼───────────────┐
          ↓           ↓               ↓
  ┌──────────────┐ ┌─────────┐ ┌───────────┐
  │universitas-ui│ │gradus-  │ │gradus-    │
  │  (port 3003) │ │web      │ │mobile     │
  │  Next.js 16  │ │(port    │ │React      │
  │  + Prisma    │ │3004)    │ │Native     │
  └──────┬───────┘ └────┬────┘ └─────┬─────┘
         │              │             │
         │              └──────┬──────┘
         │                     ↓ Bearer Token (usuario)
         │              ┌──────────────┐
         │              │  Gradus API  │
         │              │  .NET 10     │
         │              │  (port 5002) │
         │              └──────┬───────┘
         │                     │ Bearer Token (M2M)
         ↑ M2M Token            │
         └─────────────────────┘
         GET /api/m2m/students/:identity
         GET /api/m2m/students/:identity/progress
         GET /api/m2m/students/:identity/history

┌─────────────────┐    ┌─────────────────┐
│  universitas_db  │    │    gradus_db     │
│  PostgreSQL      │    │    PostgreSQL    │
│  (Prisma)        │    │    (EF Core)     │
└─────────────────┘    └─────────────────┘
```

**Principio clave:** Gradus NUNCA accede directamente a `universitas_db`. Solo consume la API de Portal Universitario usando un token M2M emitido por Azure AD.

---

## Stack tecnológico

| Componente | Tecnología | Justificación |
|---|---|---|
| Autenticación | Azure AD (Microsoft Entra ID) | SSO institucional, MFA integrado, sin infraestructura propia |
| Portal Universitario (web) | Next.js 16 + Prisma | FullStack simplificado, Prisma compatible con el esquema definido |
| Gradus API | .NET 10 + EF Core + Clean Architecture | Robusto para lógica de homologación compleja |
| Gradus Web | Next.js 16 | Consistente con el ecosistema |
| Gradus Mobile | React Native | Comparte lógica con la web, un solo equipo |
| Base de datos | PostgreSQL 17 | Estándar del proyecto |
| Caché | Redis 7 | Tokens M2M, notificaciones en tiempo real |
| Generación PDF | .NET QuestPDF | Plantillas con datos dinámicos en .NET |
| Notificaciones email | SendGrid / SMTP institucional | Email transaccional confiable |
| Notificaciones in-app | SignalR (WebSockets en .NET) | Tiempo real para coordinadores |
| Monorepo | pnpm Workspaces + Nx | Ya configurado en el proyecto |

---

## Azure AD — Configuración completa

### Paso 1 — Crear o acceder al tenant

**Si el Politécnico ya tiene Microsoft 365:**
El tenant ya existe. Pedir al administrador de TI acceso con rol `Application Administrator`.

**Si no hay tenant:**
1. Ir a [portal.azure.com](https://portal.azure.com)
2. Crear cuenta Microsoft gratuita
3. Azure AD free tier incluye SSO básico sin costo

### Paso 2 — Registrar las aplicaciones

En Azure Portal → Microsoft Entra ID → App registrations → New registration.

Registrar **4 aplicaciones**:

#### 2.1 `universitas-ui`
```
Nombre: Universitas UI
Tipo de cuenta: Cuentas de este directorio organizacional únicamente
Redirect URI: Web → http://localhost:3003/api/auth/callback
```

Configuración adicional:
- Authentication → Implicit grant: NO (usamos Authorization Code + PKCE)
- Certificates & secrets → New client secret → copiar el valor
- API permissions → Microsoft Graph → User.Read (delegated)

#### 2.2 `gradus-web`
```
Nombre: Gradus Web
Tipo de cuenta: Cuentas de este directorio organizacional únicamente
Redirect URI: Web → http://localhost:3004/api/auth/callback
             SPA → http://localhost:3004/api/auth/callback (para PKCE)
```

#### 2.3 `gradus-mobile`
```
Nombre: Gradus Mobile
Tipo de cuenta: Cuentas de este directorio organizacional únicamente
Redirect URI: Mobile and desktop → msauth://com.politecnico.gradus/callback
```

#### 2.4 `gradus-api` (M2M — sin usuario)
```
Nombre: Gradus API
Tipo de cuenta: Cuentas de este directorio organizacional únicamente
Redirect URI: (ninguna — es M2M)
```

Configuración adicional para `gradus-api`:
- Certificates & secrets → New client secret
- Expose an API → Add a scope:
  ```
  Scope name: universitas.read
  Who can consent: Admins only
  Display name: Leer datos académicos de Universitas
  ```
- En `universitas-ui` → API permissions → Add permission → My APIs → gradus-api → universitas.read

### Paso 3 — Definir App Roles

Los roles determinan qué puede hacer cada usuario en cada app.

#### En `universitas-ui` — App roles:
```json
[
  {
    "displayName": "Estudiante",
    "description": "Acceso de lectura al historial académico propio",
    "value": "estudiante",
    "allowedMemberTypes": ["User"]
  },
  {
    "displayName": "Coordinador",
    "description": "Gestión completa de estudiantes y calificaciones",
    "value": "coordinador",
    "allowedMemberTypes": ["User"]
  }
]
```

#### En `gradus-web` y `gradus-mobile` — App roles:
```json
[
  {
    "displayName": "Estudiante",
    "description": "Puede solicitar homologaciones",
    "value": "estudiante",
    "allowedMemberTypes": ["User"]
  },
  {
    "displayName": "Coordinador",
    "description": "Puede revisar y aprobar homologaciones",
    "value": "coordinador",
    "allowedMemberTypes": ["User"]
  }
]
```

### Paso 4 — Asignar usuarios a roles

Azure Portal → Enterprise Applications → [nombre de la app] → Users and groups → Add user/group → seleccionar usuario → seleccionar rol.

### Paso 5 — Recopilar datos de configuración

Por cada app registrada, anotar:
```
Tenant ID:        (mismo para todas las apps)
Client ID:        (diferente por app)
Client Secret:    (solo para apps confidenciales)
```

Endpoints estándar de Azure AD:
```
Authorization: https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize
Token:         https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token
JWKS:          https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys
UserInfo:      https://graph.microsoft.com/oidc/userinfo
```

### Paso 6 — Configurar claims en los tokens

Para que los roles lleguen en el JWT:
Azure Portal → App registrations → [app] → Token configuration → Add groups claim → Security groups.

Y para roles:
Token configuration → Add optional claim → Access token → roles.

### Variables de entorno resultantes

```env
# Compartidas (mismo tenant para todas las apps)
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# universitas-ui
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# gradus-web
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# gradus-api (M2M)
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# La universitas-ui valida tokens de gradus-api usando el tenant-id
```

---

## Portal Universitario (universitas-ui)

### Estructura

```
src/apps/universitas-ui/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      → genera PKCE → redirige a Azure AD
│   │   │   ├── callback/route.ts   → intercambia code por tokens
│   │   │   └── logout/route.ts     → revoca sesión
│   │   ├── m2m/
│   │   │   └── students/
│   │   │       └── [identity]/
│   │   │           ├── route.ts           → GET perfil
│   │   │           ├── progress/route.ts  → GET progreso
│   │   │           └── history/route.ts   → GET historial
│   │   ├── students/               → endpoints para UI
│   │   ├── programs/               → gestión de programas
│   │   └── academic-records/       → calificaciones
│   ├── (student)/                  → rutas del estudiante
│   │   ├── page.tsx                → mi historial
│   │   └── active/page.tsx         → trimestre activo
│   ├── (coordinator)/              → rutas del coordinador
│   │   ├── students/page.tsx       → lista de estudiantes
│   │   └── grades/page.tsx         → registro de notas
│   └── layout.tsx
├── lib/
│   ├── auth.ts                     → helpers de Azure AD
│   ├── prisma.ts                   → cliente Prisma singleton
│   └── m2m-validator.ts            → valida tokens M2M de Azure AD
├── prisma/
│   └── schema.prisma               → esquema de la DB
└── proxy.ts                        → protección de rutas
```

### Autenticación con Azure AD en Next.js

```typescript
// lib/auth.ts
const AZURE_AUTH_URL = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`;
const AZURE_TOKEN_URL = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

// Scopes para universitas-ui
const SCOPES = ['openid', 'profile', 'email', 'offline_access'];
```

### Validación de tokens M2M

```typescript
// lib/m2m-validator.ts
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`)
);

export async function validateM2MToken(token: string) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    audience: process.env.AZURE_CLIENT_ID, // audience = universitas-ui client_id
  });

  // Verificar que es el gradus-api quien llama
  const appId = payload['appid'] as string;
  if (appId !== process.env.GRADUS_API_CLIENT_ID) {
    throw new Error('Token no autorizado — appid no corresponde a gradus-api');
  }

  return payload;
}
```

### Esquema Prisma

El esquema completo está definido en `database-schema-simple.md`. Se implementa en `prisma/schema.prisma` siguiendo esa especificación exacta.

---

## Gradus API (.NET 10)

### Arquitectura: Clean Architecture

```
src/services/Gradus/
├── Gradus.Domain/
│   ├── Entities/
│   │   ├── HomologationRequest.cs   → solicitud de homologación
│   │   ├── HomologationSubject.cs   → materia incluida en la solicitud
│   │   ├── SubjectEquivalence.cs    → equivalencias configuradas
│   │   └── HomologationRule.cs      → reglas de negocio
│   ├── Enums/
│   │   ├── HomologationStatus.cs    → PENDING, REVIEWING, APPROVED, REJECTED
│   │   └── RejectionReason.cs
│   └── Interfaces/
│       ├── IHomologationRepository.cs
│       ├── IEquivalenceRepository.cs
│       └── IUniversitasClient.cs     → contrato M2M hacia Portal
├── Gradus.Application/
│   ├── Commands/
│   │   ├── CreateRequest/            → estudiante inicia solicitud
│   │   ├── PreviewHomologation/      → genera vista previa
│   │   ├── AcceptPreview/            → estudiante acepta
│   │   ├── ReviewRequest/            → coordinador aprueba/rechaza
│   │   └── GenerateDocument/         → genera PDF legal
│   ├── Queries/
│   │   ├── GetMyRequests/            → solicitudes del estudiante
│   │   ├── GetPendingRequests/       → pendientes para coordinador
│   │   └── GetRequestDetail/         → detalle de una solicitud
│   └── Common/
│       ├── Interfaces/IDocumentService.cs
│       └── Interfaces/INotificationService.cs
├── Gradus.Infrastructure/
│   ├── Persistence/                  → EF Core + gradus_db
│   ├── ExternalServices/
│   │   └── UniversitasClient.cs     → llama a Portal via M2M
│   ├── Documents/
│   │   └── QuestPdfDocumentService.cs
│   └── Notifications/
│       ├── EmailNotificationService.cs
│       └── InAppNotificationService.cs (SignalR)
└── Gradus.API/
    ├── Controllers/
    │   ├── HomologationController.cs
    │   └── EquivalenceController.cs (coordinador)
    └── Hubs/
        └── NotificationHub.cs (SignalR)
```

### Base de datos de Gradus (`gradus_db`)

```sql
-- Equivalencias configuradas por el coordinador
subject_equivalences
  id                UUID PK
  source_program_id VARCHAR   -- programa origen
  target_program_id VARCHAR   -- programa destino
  source_subject_code VARCHAR -- código materia origen
  target_subject_code VARCHAR -- código materia destino
  min_grade         NUMERIC(4,2) -- nota mínima requerida
  min_credits       INT          -- créditos mínimos equivalentes
  requires_same_area BOOLEAN     -- mismo área de formación
  notes             TEXT         -- observaciones del coordinador
  created_by        VARCHAR      -- Azure OID del coordinador
  created_at        TIMESTAMPTZ
  updated_at        TIMESTAMPTZ

-- Reglas globales por par de programas
homologation_rules
  id                UUID PK
  source_program_id VARCHAR
  target_program_id VARCHAR
  min_grade         NUMERIC(4,2)  -- nota mínima global
  max_credits_pct   INT           -- % máximo de créditos homologables
  active            BOOLEAN
  created_at        TIMESTAMPTZ

-- Solicitudes de homologación
homologation_requests
  id                UUID PK
  student_identity  VARCHAR       -- ID en Universitasxxi
  student_azure_oid VARCHAR       -- OID de Azure AD
  source_program    VARCHAR       -- programa actual
  target_program    VARCHAR       -- programa destino
  status            VARCHAR       -- DRAFT, PENDING, REVIEWING, APPROVED, REJECTED
  coordinator_notes TEXT          -- observaciones del coordinador
  reviewed_by       VARCHAR       -- Azure OID del coordinador
  reviewed_at       TIMESTAMPTZ
  document_url      TEXT          -- URL del PDF generado
  created_at        TIMESTAMPTZ
  updated_at        TIMESTAMPTZ

-- Materias incluidas en la solicitud
homologation_subjects
  id                        UUID PK
  homologation_request_id   UUID FK
  source_subject_code       VARCHAR
  source_subject_name       VARCHAR
  source_grade              NUMERIC(4,2)
  source_credits            INT
  target_subject_code       VARCHAR
  target_subject_name       VARCHAR
  target_credits            INT
  auto_approved             BOOLEAN   -- aprobada por reglas automáticas
  coordinator_override      BOOLEAN   -- excepción manual del coordinador
  created_at                TIMESTAMPTZ

-- Notificaciones in-app
notifications
  id                UUID PK
  recipient_oid     VARCHAR      -- Azure OID del destinatario
  title             VARCHAR
  message           TEXT
  type              VARCHAR      -- HOMOLOGATION_SUBMITTED, APPROVED, REJECTED
  reference_id      UUID         -- ID de la solicitud relacionada
  read_at           TIMESTAMPTZ  -- null = no leída
  created_at        TIMESTAMPTZ
```

---

## Gradus Web (Next.js)

### Estructura de rutas

```
src/apps/gradus-web/
├── app/
│   ├── api/
│   │   ├── auth/                    → login, callback, logout (Azure AD)
│   │   └── notifications/route.ts   → marcar como leídas
│   ├── (student)/                   → rutas del estudiante
│   │   ├── page.tsx                 → mis solicitudes
│   │   ├── new/page.tsx             → nueva solicitud
│   │   └── [id]/page.tsx            → detalle de solicitud
│   ├── (coordinator)/               → rutas del coordinador
│   │   ├── page.tsx                 → solicitudes pendientes
│   │   └── [id]/page.tsx            → revisar solicitud
│   └── layout.tsx
├── lib/
│   ├── auth.ts                      → Azure AD helpers
│   └── gradus-api.ts                → cliente de Gradus API
└── proxy.ts
```

---

## Gradus Mobile (React Native)

### Autenticación con Azure AD en React Native

```typescript
// Usar react-native-app-auth
import { authorize } from 'react-native-app-auth';

const config = {
  issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
  clientId: GRADUS_MOBILE_CLIENT_ID,
  redirectUrl: 'msauth://com.politecnico.gradus/callback',
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  usePKCE: true,
};
```

---

## Comunicación M2M

### Flujo completo

```
Gradus.API necesita historial del estudiante
         ↓
Obtiene token M2M de Azure AD:
POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
  grant_type=client_credentials
  client_id={gradus-api client_id}
  client_secret={gradus-api secret}
  scope=api://{universitas-ui client_id}/universitas.read
         ↓
Token cacheado en Redis (TTL = exp - 60s)
         ↓
Gradus.API llama a universitas-ui:
GET http://universitas-ui:3003/api/m2m/students/{identity}
Authorization: Bearer {m2m_token}
         ↓
universitas-ui valida el token con Azure AD JWKS
Verifica que appid = gradus-api client_id
         ↓
Retorna datos del estudiante
```

---

## Contratos de API

### Endpoints M2M (universitas-ui)

#### `GET /api/m2m/students/:identity`

```json
{
  "identity": "707207",
  "nombre": "Juan",
  "apellido": "Ceballos",
  "email": "juan@politecnico.edu.co",
  "codigo_estudiante": "2021-12345",
  "sede": "SEDE CALLE 73",
  "fecha_ingreso": "2021-02-01",
  "estado": "ACTIVO",
  "programa": {
    "codigo": "351C",
    "nombre": "Tecnología en Desarrollo de Software",
    "modalidad": "PRESENCIAL"
  },
  "plan_estudios": {
    "codigo_plan": "35-1",
    "total_creditos": 120,
    "num_periodos": 8
  },
  "institucion": {
    "nombre": "Politécnico Internacional",
    "nit": "900123456-7"
  }
}
```

#### `GET /api/m2m/students/:identity/progress`

```json
{
  "identity": "707207",
  "creditos_logrados": 78,
  "total_creditos": 120,
  "porcentaje_avance": 65.0,
  "asignaturas": {
    "aprobadas": 26,
    "cursando": 4,
    "reprobadas": 2,
    "retiradas": 1
  },
  "trimestre_activo": "2026-1T"
}
```

#### `GET /api/m2m/students/:identity/history`

```json
{
  "identity": "707207",
  "total_asignaturas": 28,
  "asignaturas": [
    {
      "codigo": "0547",
      "nombre": "Fundamentos de Programación",
      "creditos": 4,
      "area": "FORMACION_ESPECIFICA",
      "periodo_pensum": 1,
      "trimestre": "2025-1T",
      "estado": "APROBADA",
      "nota_final": 3.80
    }
  ]
}
```

### Endpoints de Gradus API (.NET)

```
# Estudiante
POST /api/homologations/preview          → genera vista previa
POST /api/homologations                  → crea solicitud (acepta preview)
GET  /api/homologations/my               → mis solicitudes
GET  /api/homologations/{id}             → detalle de solicitud

# Coordinador
GET  /api/homologations/pending          → solicitudes pendientes
PUT  /api/homologations/{id}/approve     → aprobar
PUT  /api/homologations/{id}/reject      → rechazar con motivo
GET  /api/homologations/{id}/document    → descargar PDF

# Configuración (coordinador)
GET  /api/equivalences                   → lista de equivalencias
POST /api/equivalences                   → crear equivalencia
PUT  /api/equivalences/{id}              → actualizar
GET  /api/rules                          → reglas por par de programas
PUT  /api/rules/{sourceProgram}/{targetProgram} → actualizar reglas
```

---

## Seguridad

### Roles en Azure AD

| App | Rol | Permisos |
|---|---|---|
| universitas-ui | `estudiante` | Ver su propio historial |
| universitas-ui | `coordinador` | Ver todos los estudiantes, registrar notas |
| gradus-web | `estudiante` | Solicitar homologaciones, ver sus solicitudes |
| gradus-web | `coordinador` | Revisar y aprobar/rechazar solicitudes |
| gradus-mobile | `estudiante` | Igual que gradus-web |
| gradus-mobile | `coordinador` | Igual que gradus-web |

### Validación de tokens

Cada aplicación valida el JWT con la clave pública de Azure AD descargada automáticamente desde el endpoint JWKS. No hay clave privada en los servicios — solo validación con la clave pública.

### Seguridad M2M

- Los endpoints `/api/m2m/*` de universitas-ui solo aceptan tokens con `appid = gradus-api client_id`
- El token M2M se cachea en Redis — no se solicita uno nuevo en cada request
- Los datos del estudiante solo se retornan si el estudiante existe en `universitas_db`

---

## Notificaciones

### Email (SendGrid / SMTP institucional)

Eventos que disparan email:
- Coordinador: nueva solicitud pendiente de revisión
- Estudiante: solicitud aprobada (con PDF adjunto)
- Estudiante: solicitud rechazada (con motivo)

### In-app (SignalR)

- El coordinador ve un badge con el número de solicitudes pendientes
- Al aprobar/rechazar, el estudiante recibe una notificación en tiempo real si está conectado
- Las notificaciones no leídas persisten en `gradus_db.notifications`

---

## Generación de documentos

### Tecnología: QuestPDF (.NET)

```
Proceso de generación:
  1. Coordinador aprueba la solicitud
  2. Gradus.API carga la plantilla institucional (Word/PDF)
  3. QuestPDF inyecta los datos dinámicos:
     - Nombre del estudiante
     - Código estudiantil
     - Programa origen y destino
     - Lista de materias homologadas con notas
     - Fecha de aprobación
     - Nombre del coordinador
  4. Genera el PDF
  5. Guarda en almacenamiento (local en dev, Azure Blob en prod)
  6. Actualiza document_url en la solicitud
  7. Envía email al estudiante con el PDF adjunto
```

---

## Despliegue

**Decisión pendiente.** Las opciones evaluadas:

| Opción | Ventaja | Desventaja |
|---|---|---|
| Azure App Service + Azure Database for PostgreSQL | Integración nativa con Azure AD | Costo más alto |
| VPS (DigitalOcean/Hetzner) + Docker Compose | Económico, control total | Sin integración nativa |
| Kubernetes (AKS) | Escalable | Complejidad alta para el volumen actual |

**Recomendación para MVP:** VPS con Docker Compose. Migrar a Azure App Service cuando el sistema esté en producción estable.

---

## Limitaciones y decisiones técnicas

### Universitasxxi API
Los datos del historial académico vienen de Universitasxxi. En el MVP se usan datos mock en `universitas_db`. La integración real se implementa en Fase 6 cuando se tenga acceso a las credenciales de la API.

### Sin historial en `gradus_db`
Gradus no almacena el historial académico — lo consulta en tiempo real desde universitas-ui. Esto evita duplicación de datos pero requiere que universitas-ui esté disponible durante el proceso de homologación.

### Roles en Azure AD vs base de datos
Los roles se gestionan en Azure AD (no en base de datos). Esto simplifica la gestión pero limita la granularidad — no hay permisos por asignatura o programa, solo por rol global.

### Una solicitud a la vez por estudiante
Un estudiante no puede tener dos solicitudes activas (PENDING o REVIEWING) al mismo tiempo. Debe esperar la resolución antes de iniciar una nueva.

### El documento PDF no se modifica después de generado
Una vez generado el PDF legal, no se modifica. Si hay un error, el coordinador debe rechazar y crear una nueva solicitud.

### Idioma
El sistema es completamente en español. No hay soporte multiidioma en el MVP.
