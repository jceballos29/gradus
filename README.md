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
> `apps/gradus/` · En desarrollo

Plantilla base Next.js con shadcn/ui. Será el frontend principal de la plataforma de homologación.

**Stack:** Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui

---

### Gradus.API — Backend
> `apps/Gradus/` · Puerto `5002`

API REST con Clean Architecture en 4 capas. En etapa inicial (boilerplate).

**Stack:** .NET 10 · ASP.NET Core · C#

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

### 4. Gradus.API

```bash
cd apps/Gradus
dotnet restore
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
| Backend | ASP.NET Core 10, C# |
| ORM | Prisma |
| Base de datos | PostgreSQL 18 |
| Caché | Redis 8.4 |
| Autenticación | Azure AD / Entra ID, JWT |
| Contenedores | Docker Compose |
