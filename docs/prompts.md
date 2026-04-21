# Gradus — Prompts para retomar el proyecto

Estos prompts permiten retomar el proyecto desde cualquier sesión de Claude.
Úsalos al inicio de cada sesión para darle contexto completo.

---

## Prompt 1 — Contexto general del proyecto (usar siempre)

```
Estoy desarrollando el Sistema de Homologación Gradus para el Politécnico Internacional.

## El proyecto

Es un ecosistema de tres aplicaciones integradas:

1. **universitas-ui** (Next.js + Prisma, puerto 3003) — Portal académico del estudiante. Fuente de verdad del historial académico. Expone endpoints M2M para Gradus.

2. **gradus-web** (Next.js, puerto 3004) — Sistema de homologación web. Estudiantes solicitan, coordinadores aprueban.

3. **gradus-mobile** (React Native) — App móvil de Gradus.

4. **Gradus.API** (.NET 10 Clean Architecture, puerto 5002) — API que contiene la lógica de homologación, genera PDFs y maneja notificaciones.

## Autenticación

Azure AD (Microsoft Entra ID) — SSO centralizado para todas las apps.
Roles: `estudiante` y `coordinador` (definidos como App Roles en Azure AD).

## Comunicación M2M

Gradus.API obtiene datos académicos de universitas-ui usando un token M2M (client_credentials) emitido por Azure AD. universitas-ui expone `/api/m2m/students/:identity` con tres endpoints: perfil, progreso e historial.

## Stack técnico

- Next.js 16, TypeScript, Tailwind CSS
- .NET 10, Clean Architecture, EF Core, MediatR, FluentValidation
- PostgreSQL 17 (dos bases: universitas_db y gradus_db)
- Prisma (universitas-ui), EF Core (Gradus.API)
- QuestPDF (generación de PDF)
- SignalR (notificaciones in-app en tiempo real)
- Redis (caché de tokens M2M)

## Monorepo

pnpm Workspaces + Nx en la carpeta `international-polytechnic/` con esta estructura:
src/apps/universitas-ui, src/apps/gradus-web
src/services/Gradus (solución .NET)

## Proceso de homologación

1. Coordinador configura equivalencias entre programas y reglas (nota mínima, créditos)
2. Estudiante selecciona programa destino
3. Sistema genera vista previa consultando historial en universitas-ui via M2M
4. Estudiante acepta y envía a revisión
5. Coordinador revisa → aprueba o rechaza
6. Si aprueba: se genera PDF con plantilla institucional y se notifica al estudiante

## Contratos M2M

GET /api/m2m/students/:identity → { identity, nombre, apellido, programa, plan_estudios }
GET /api/m2m/students/:identity/progress → { creditos_logrados, porcentaje_avance, asignaturas: { aprobadas, cursando, reprobadas } }
GET /api/m2m/students/:identity/history → { identity, total_asignaturas, asignaturas: [{ codigo, nombre, creditos, area, periodo_pensum, trimestre, estado, nota_final }] }

Trabajamos paso a paso, con explicación conceptual breve antes de cada implementación. Usa AskUserTool para confirmar antes de pasar a la siguiente tarea.
```

---

## Prompt 2 — Retomar la Fase 0 (Azure AD)

```
[Pegar Prompt 1 completo]

Estamos en la Fase 0 — Configuración de Azure AD.
El objetivo de esta sesión es: [especificar la tarea del tasks.md, ej: T-002 Registrar universitas-ui en Azure AD]

El tenant ID de Azure AD es: [pegar el tenant ID]
```

---

## Prompt 3 — Retomar la Fase 1 (universitas-ui)

```
[Pegar Prompt 1 completo]

Estamos en la Fase 1 — Portal Universitario (universitas-ui).
El proyecto Next.js ya está creado en src/apps/universitas-ui con puerto 3003.

Configuración de Azure AD ya lista:
- Tenant ID: [pegar]
- universitas-ui Client ID: [pegar]
- gradus-api Client ID: [pegar] (para validar tokens M2M)

El objetivo de esta sesión es: [especificar la tarea, ej: T-107 Autenticación con Azure AD]

El esquema de Prisma está basado en database-schema-simple.md que incluye:
institutions → programs → study_plans → pensum_subjects → academic_records → partial_grades
users (1:1) → students

Estado actual del proyecto:
- [ ] / [x] Prisma inicializado y schema escrito
- [ ] / [x] Migración aplicada
- [ ] / [x] Seed de datos cargado
- [ ] / [x] Autenticación con Azure AD
```

---

## Prompt 4 — Retomar la Fase 2 (Gradus API)

```
[Pegar Prompt 1 completo]

Estamos en la Fase 2 — Gradus API (.NET 10).
La solución está en src/services/Gradus/ con proyectos: Domain, Application, Infrastructure, API.

Configuración de Azure AD:
- Tenant ID: [pegar]
- gradus-api Client ID: [pegar]
- gradus-api Client Secret: [pegar]
- universitas-ui Client ID: [pegar] (audience para tokens M2M)
- Scope M2M: api://[universitas-ui-client-id]/universitas.read

universitas-ui ya está corriendo en http://localhost:3003 y sus endpoints M2M responden correctamente.

El objetivo de esta sesión es: [especificar la tarea, ej: T-205 UniversitasClient M2M]

Estado actual:
- [ ] / [x] Solución .NET creada con 4 proyectos
- [ ] / [x] Domain: entidades y repositorios
- [ ] / [x] Infrastructure: EF Core + migración
- [ ] / [x] UniversitasClient M2M implementado
- [ ] / [x] Lógica de homologación (Commands/Queries)
- [ ] / [x] Generación de PDF
- [ ] / [x] Notificaciones
```

---

## Prompt 5 — Retomar la Fase 3 (Gradus Web)

```
[Pegar Prompt 1 completo]

Estamos en la Fase 3 — Gradus Web (Next.js 16).
El proyecto está en src/apps/gradus-web con puerto 3004.

Gradus API ya está funcionando en http://localhost:5002.
universitas-ui ya está funcionando en http://localhost:3003.

Configuración de Azure AD:
- Tenant ID: [pegar]
- gradus-web Client ID: [pegar]
- gradus-web Client Secret: [pegar]

La autenticación usa el mismo patrón que universitas-ui:
- proxy.ts para proteger rutas
- /api/auth/login → genera PKCE → redirige a Azure AD
- /api/auth/callback → intercambia code por tokens
- /api/auth/logout → revoca tokens + sesión Azure AD

El objetivo de esta sesión es: [especificar la tarea, ej: T-303 Vista del Estudiante]

Estado actual de gradus-web:
- [ ] / [x] Proyecto Next.js creado
- [ ] / [x] Autenticación Azure AD
- [ ] / [x] proxy.ts configurado
- [ ] / [x] Cliente de Gradus API
- [ ] / [x] Vista del Estudiante
- [ ] / [x] Vista del Coordinador
- [ ] / [x] Notificaciones in-app
```

---

## Prompt 6 — Resolver un problema específico

```
[Pegar Prompt 1 completo]

Tengo este problema en [nombre del archivo o módulo]:

[Describir el error o comportamiento inesperado]

Código actual:
[Pegar el código relevante]

Error que obtengo:
[Pegar el mensaje de error completo]

Contexto adicional:
- Fase actual: [Fase 0/1/2/3/4/5/6]
- Tarea actual: [T-XXX]
- Lo que intenté: [describir intentos previos]
```

---

## Prompt 7 — Generar documentos (PDF de homologación)

```
[Pegar Prompt 1 completo]

Estamos implementando la generación del documento legal de homologación en T-207.

Tengo la plantilla del documento en formato [Word/PDF].
El documento debe incluir:
- Datos del estudiante: nombre, código, sede, fecha de ingreso
- Programa origen y programa destino
- Lista de materias homologadas:
  | Materia Origen | Nota | Materia Destino | Créditos |
- Firma del coordinador
- Fecha de aprobación
- Número de resolución (generado automáticamente)

Tecnología: QuestPDF en Gradus.Infrastructure.

Ayúdame a implementar IDocumentService con QuestPDF.
```

---

## Variables de entorno de referencia

### universitas-ui `.env.local`
```env
DATABASE_URL="postgresql://postgres:secret@localhost:5432/universitas_db"
IDENTITY_API_URL=http://localhost:5000
AZURE_TENANT_ID=[pegar]
AZURE_CLIENT_ID=[client-id de universitas-ui]
AZURE_CLIENT_SECRET=[secret de universitas-ui]
REDIRECT_URI=http://localhost:3003/api/auth/callback
NEXT_PUBLIC_APP_URL=http://localhost:3003
GRADUS_API_CLIENT_ID=[client-id de gradus-api]
```

### gradus-web `.env.local`
```env
AZURE_TENANT_ID=[pegar]
AZURE_CLIENT_ID=[client-id de gradus-web]
AZURE_CLIENT_SECRET=[secret de gradus-web]
REDIRECT_URI=http://localhost:3004/api/auth/callback
NEXT_PUBLIC_APP_URL=http://localhost:3004
GRADUS_API_URL=http://localhost:5002
NEXT_PUBLIC_GRADUS_API_URL=http://localhost:5002
```

### Gradus.API `appsettings.json`
```json
{
  "AzureAd": {
    "TenantId": "[pegar]",
    "ClientId": "[client-id de gradus-api]",
    "ClientSecret": "[secret de gradus-api]"
  },
  "UniversitasApi": {
    "BaseUrl": "http://localhost:3003",
    "Scope": "api://[universitas-ui-client-id]/universitas.read"
  },
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=gradus_db;Username=postgres;Password=secret"
  },
  "Redis": {
    "ConnectionString": "localhost:6379"
  }
}
```

---

## Puertos del sistema

| Servicio | Puerto |
|---|---|
| universitas-ui | 3003 |
| gradus-web | 3004 |
| Gradus.API | 5002 |
| PostgreSQL | 5432 |
| Redis | 6379 |
