# Gradus

Plataforma de homologación académica para el **Politécnico Internacional**. Permite gestionar solicitudes de homologación de materias entre programas e instituciones, con portal estudiantil, portal de coordinadores y API REST.

## Arquitectura

Monorepo con tres servicios independientes:

```
gradus/
├── apps/
│   ├── universitas/     # Portal académico (Next.js + Prisma + PostgreSQL)
│   ├── gradus/          # Frontend web (Next.js — en desarrollo)
│   └── Gradus/          # API REST (ASP.NET Core 10 — Clean Architecture)
├── docs/                # Documentación del proyecto
├── docker-compose.yml   # Infraestructura local (PostgreSQL + Redis)
└── init-databases.sh    # Inicialización de bases de datos
```

## Servicios

### Universitas — Portal Académico
> `apps/universitas/` · Puerto `3003`

Portal para estudiantes y coordinadores. Gestiona instituciones, facultades, programas, pensums, materias e historial académico.

**Stack:** Next.js 16 · TypeScript · Prisma · PostgreSQL · Tailwind CSS v4 · shadcn/ui · Azure AD (Entra ID)

**Funcionalidades:**
- Autenticación M2M con Azure AD / JWT (JWKS)
- Portal del estudiante: historial académico, progreso por semestre
- Portal del coordinador: gestión académica
- API interna (`/api/m2m/`)

**Modelos principales:** `Institution → Faculty → Program → Pensum → Subject · Student · AcademicRecord · PartialGrade`

---

### Gradus Web — Frontend
> `apps/gradus/` · Puerto `3004`

Frontend principal de la plataforma de homologación.

**Stack:** Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui · SignalR Client

**Funcionalidades:**
- Autenticación con Azure AD y redirección basada en roles.
- Conexión en tiempo real para notificaciones (SignalR).

---

### Gradus.API — Backend
> `apps/Gradus/` · Puerto `5002`

API REST con Clean Architecture en 4 capas. Soporta el core de la plataforma de homologación.

**Stack:** .NET 10 · ASP.NET Core · C# · Entity Framework Core · MediatR · SignalR · QuestPDF

**Funcionalidades:**
- Autenticación y Autorización JWT Bearer (Azure AD).
- Arquitectura CQRS con MediatR.
- Generación de documentos en formato PDF con QuestPDF.
- WebSockets para notificaciones en tiempo real (SignalR).

**Proyectos:**
| Capa | Proyecto |
|------|----------|
| Web / HTTP | `Gradus.API` |
| Lógica de negocio | `Gradus.Application` |
| Entidades de dominio | `Gradus.Domain` |
| Datos / externos | `Gradus.Infrastructure` |

---

## Infraestructura

Levantada con Docker Compose:

| Servicio | Imagen | Puerto | Base de datos |
|----------|--------|--------|---------------|
| PostgreSQL | `postgres:18-alpine` | `5432` | `identity_db`, `universitas_db`, `gradus_db` |
| Redis | `redis:8.4-alpine` | `6379` | — |

## Inicio rápido

### 1. Variables de entorno

```bash
cp .env.example .env   # Ajustar POSTGRES_DB_PASSWORD
```

### 2. Infraestructura

```bash
docker compose up -d
```

### 3. Universitas

```bash
cd apps/universitas
cp .env.example .env.local   # Configurar Azure AD credentials
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev                   # http://localhost:3003
```

### 4. Gradus Web

```bash
cd apps/gradus
npm install
npm run dev                   # http://localhost:3004
```

### 5. Gradus.API

```bash
cd apps/Gradus
dotnet restore

# Configurar secretos (evitar comitear contraseñas en appsettings.json)
# Puedes usar appsettings.Development.json o user-secrets:
dotnet user-secrets init --project Gradus.API
dotnet user-secrets set "ConnectionStrings:GradusDb" "Host=localhost;Port=5432;Database=gradus_db;Username=postgres;Password=secret" --project Gradus.API
dotnet user-secrets set "ConnectionStrings:Redis" "localhost:6379" --project Gradus.API
dotnet user-secrets set "Universitas:TenantId" "<azure-tenant-id>" --project Gradus.API
dotnet user-secrets set "Universitas:ClientId" "<azure-client-id>" --project Gradus.API
dotnet user-secrets set "Universitas:ClientSecret" "<azure-client-secret>" --project Gradus.API
dotnet user-secrets set "MediatR:LicenseKey" "<mediatR-license-key>" --project Gradus.API

dotnet run --project Gradus.API   # http://localhost:5002
```

## Variables de entorno

### Raíz (`.env`)
| Variable | Descripción |
|----------|-------------|
| `POSTGRES_DB_PASSWORD` | Contraseña de PostgreSQL |

### Universitas (`.env.local`)
| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `AZURE_AD_TENANT_ID` | Tenant ID de Azure AD |
| `AZURE_AD_CLIENT_ID` | Client ID de la aplicación |
| `SESSION_SECRET` | Secreto para sesiones |

## Documentación

| Archivo | Contenido |
|---------|-----------|
| [docs/brief.md](docs/brief.md) | Descripción del producto, problema y personas |
| [docs/plan.md](docs/plan.md) | Fases de desarrollo y cronograma |
| [docs/tasks.md](docs/tasks.md) | Tareas de implementación por módulo |
| [docs/universitas-database-schema.md](docs/universitas-database-schema.md) | Esquema de BD académica |
| [docs/gradus-database-schema.md](docs/gradus-database-schema.md) | Esquema de BD de homologación |

## Tecnologías

| Categoría | Tecnología |
|-----------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | ASP.NET Core 10, C#, MediatR (CQRS) |
| ORM | Prisma (Universitas), Entity Framework Core (Gradus) |
| Base de datos | PostgreSQL 18 |
| Caché | Redis 8.4 |
| Autenticación | Azure AD / Entra ID, JWT |
| Contenedores | Docker Compose |
| Tiempo Real | SignalR (WebSockets) |
| Documentos | QuestPDF |
