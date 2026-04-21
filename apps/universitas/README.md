# 🎓 Universitas - Gradus Academic Core

**Universitas** es el módulo central académico del ecosistema **Gradus**. Esta aplicación está diseñada para gestionar todo el ciclo de vida académico de los estudiantes, administrar los currículos (pensums), programas, facultades e instituciones, y proveer una plataforma interactiva tanto para **Estudiantes** como para **Coordinadores**.

## 🚀 Tecnologías y Stack

Esta aplicación está construida con tecnologías modernas y robustas para asegurar escalabilidad, seguridad y una experiencia de usuario fluida:

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router) usando [Turbopack](https://turbo.build/pack) para un desarrollo ultra rápido.
- **Lenguaje**: TypeScript.
- **Estilos y UI**: [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/), e iconos con [Lucide React](https://lucide.dev/). Soporte completo para Modo Claro/Oscuro mediante `next-themes`.
- **Base de Datos y ORM**: PostgreSQL gestionado a través de [Prisma ORM](https://www.prisma.io/) utilizando el adaptador nativo `pg`.
- **Autenticación e Identidad**: Integración con **Azure Active Directory (Entra ID)** para comunicación Machine-to-Machine (M2M) segura, empleando validación de tokens JWT mediante `jose` y `jwt-decode`.
- **Validación**: [Zod](https://zod.dev/) para el tipado estricto y la validación de esquemas en APIs y formularios.

## 📂 Estructura del Proyecto

```text
universitas/
├── app/
│   ├── api/m2m/      # Endpoints para comunicación segura Machine-to-Machine (Validación de tokens con Azure AD).
│   ├── coordinator/  # Vistas e interfaces dedicadas a Coordinadores Académicos (gestión de programas, alumnos).
│   ├── student/      # Portal del Estudiante (historial académico, progreso, notas).
│   └── globals.css   # Estilos globales y tokens de diseño de Tailwind v4.
├── components/       # Componentes de interfaz reutilizables (shadcn/ui, layouts, theme-providers).
├── lib/              # Utilidades centrales:
│   ├── auth.ts       # Lógica de validación de tokens M2M, JWKS de Azure AD y control de accesos.
│   ├── prisma.ts     # Instancia global del cliente de Prisma.
│   └── utils.ts      # Funciones auxiliares (ej. tailwind-merge).
└── prisma/           # Configuración de base de datos:
    ├── schema.prisma # Modelos de datos principales (Institución, Facultad, Programa, Estudiante, etc.).
    ├── seed.ts       # Script principal de inserción de datos iniciales.
    └── seed-history.ts # Script para la generación del historial académico.
```

## 🏗️ Modelos de Dominio (Catálogo Académico)

El sistema soporta una estructura jerárquica robusta:
1. **Catálogo Institucional**: `Institution` ➡️ `Faculty` ➡️ `Program` ➡️ `Pensum` ➡️ `Subject`.
2. **Usuarios y Roles**: Autenticación diferenciada entre `UserRole.STUDENT` y `UserRole.COORDINATOR`.
3. **Seguimiento Académico**: `Student` cuenta con un historial detallado a través de `AcademicRecord` (materias en curso, aprobadas, etc.) y `PartialGrade` (calificaciones parciales).
4. **Períodos**: Gestión del tiempo mediante `AcademicPeriod`.

## ⚙️ Configuración y Ejecución Local

### 1. Variables de Entorno

Debes contar con un archivo `.env` en la raíz de la aplicación para la conexión a PostgreSQL:

```env
DATABASE_URL="postgresql://postgres:secret@localhost:5432/universitas_db?schema=public"
```

Además, configura un archivo `.env.local` con las credenciales de Azure AD y la URL del entorno:

```env
# Azure AD
AZURE_TENANT_ID=tu_tenant_id
AZURE_CLIENT_ID=tu_client_id
AZURE_CLIENT_SECRET=tu_client_secret
GRADUS_API_CLIENT_ID=tu_gradus_api_client_id

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3003
SESSION_SECRET=un_string_largo_aleatorio
```

### 2. Instalación de Dependencias

Ejecuta el siguiente comando desde el Workspace raíz o desde el directorio de la aplicación:

```bash
pnpm install
```

### 3. Base de Datos (Prisma)

Asegúrate de tener la base de datos levantada y aplica las migraciones y scripts de seeding:

```bash
pnpm dlx prisma db push
pnpm dlx tsx prisma/seed.ts
pnpm dlx tsx prisma/seed-history.ts
```

### 4. Modo Desarrollo

Inicia el servidor local de desarrollo (por defecto en el puerto `3003` para no colisionar con otros módulos del monorepo):

```bash
pnpm run dev
```

## 🔐 Seguridad y Autenticación M2M

El directorio `app/api/m2m/` aloja rutas críticas que son consumidas por otros servicios del ecosistema Gradus. Estas rutas utilizan **`validateM2MToken`** (`lib/auth.ts`) que:
- Descarga y cachea las JWKS desde Azure AD.
- Valida que el token JWT (M2M) cuente con la firma correcta.
- Valida que el *Issuer* (`iss`) y el *Audience* (`aud`) sean correctos en el contexto del Tenant actual.

## 🤝 Contribución y Buenas Prácticas

- **Componentes**: Añade nuevos componentes utilizando `npx shadcn@latest add <component>`.
- **Estilos**: Utiliza clases utilitarias de Tailwind. Para colores y fuentes personalizadas, guíate por `globals.css`.
- **Servidor y Cliente**: Mantén el uso de Server Components por defecto para optimizar el rendimiento y seguridad. Usa Client Components (`"use client"`) estrictamente cuando necesites interactividad del DOM o hooks como `useState`.
