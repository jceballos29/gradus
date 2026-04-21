# Gradus — Tasks

**Politécnico Internacional — Sistema de Homologación**  
**Formato:** Checklist por fase. Marcar con `[x]` al completar.

---

## Fase 0 — Configuración de Azure AD

### T-001 — Acceso al tenant de Azure AD
- [x] Verificar si el Politécnico tiene tenant de Microsoft 365 activo
- [x] Solicitar acceso con rol `Application Administrator` al admin de TI
- [x] Confirmar Tenant ID (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- [x] Verificar acceso a [portal.azure.com](https://portal.azure.com) con la cuenta correcta

### T-002 — Registrar `universitas-ui` en Azure AD
- [ ] Azure Portal → Microsoft Entra ID → App registrations → New registration
- [ ] Nombre: `Universitas UI`
- [ ] Tipo de cuenta: `Accounts in this organizational directory only`
- [ ] Redirect URI: `Web` → `http://localhost:3003/api/auth/callback`
- [ ] Guardar el **Client ID** generado
- [ ] Certificates & secrets → New client secret → guardar el **valor** (no el ID)
- [ ] Token configuration → Add optional claim → Access token → `roles`
- [ ] Manifest → `requestedAccessTokenVersion`: cambiar a `2`

### T-003 — Registrar `gradus-web` en Azure AD
- [ ] New registration → Nombre: `Gradus Web`
- [ ] Redirect URI: `Web` → `http://localhost:3004/api/auth/callback`
- [ ] Guardar Client ID y crear Client Secret
- [ ] Token configuration → Add optional claim → Access token → `roles`
- [ ] Manifest → `accessTokenAcceptedVersion`: `2`

### T-004 — Registrar `gradus-mobile` en Azure AD
- [ ] New registration → Nombre: `Gradus Mobile`
- [ ] Redirect URI: `Mobile and desktop` → `msauth://com.politecnico.gradus/callback`
- [ ] Guardar Client ID
- [ ] Token configuration → `roles`
- [ ] Manifest → `accessTokenAcceptedVersion`: `2`

### T-005 — Registrar `gradus-api` en Azure AD (M2M)
- [x] New registration → Nombre: `Gradus API`
- [x] Sin Redirect URI (es M2M)
- [x] Guardar Client ID y crear Client Secret
- [x] Expose an API → Set Application ID URI → aceptar el default
- [x] Add a scope:
  - Scope name: `universitas.read`
  - Who can consent: `Admins only`
  - Display name: `Leer datos académicos de Universitas`
  - State: `Enabled`
- [x] En `universitas-ui` → API permissions → Add permission → My APIs → `gradus-api` → `universitas.read`
- [x] Grant admin consent

### T-006 — Definir App Roles en `universitas-ui`
- [ ] App registrations → universitas-ui → App roles → Create app role
- [ ] Crear rol `estudiante`:
  - Display name: `Estudiante`
  - Allowed member types: `Users/Groups`
  - Value: `estudiante`
- [ ] Crear rol `coordinador`:
  - Display name: `Coordinador`
  - Allowed member types: `Users/Groups`
  - Value: `coordinador`

### T-007 — Definir App Roles en `gradus-web` y `gradus-mobile`
- [ ] Mismos roles que universitas-ui: `estudiante` y `coordinador`
- [ ] Repetir proceso para `gradus-web`
- [ ] Repetir proceso para `gradus-mobile`

### T-008 — Crear usuarios de prueba en Azure AD
- [ ] Microsoft Entra ID → Users → New user
- [ ] Crear usuario estudiante de prueba:
  - Username: `estudiante@[tenant].onmicrosoft.com`
  - Name: `Estudiante Prueba`
- [ ] Crear usuario coordinador de prueba:
  - Username: `coordinador@[tenant].onmicrosoft.com`
  - Name: `Coordinador Prueba`

### T-009 — Asignar roles a usuarios de prueba
- [ ] Enterprise Applications → universitas-ui → Users and groups → Add user
- [ ] Asignar `estudiante@` → rol `Estudiante`
- [ ] Asignar `coordinador@` → rol `Coordinador`
- [ ] Repetir para `gradus-web`
- [ ] Repetir para `gradus-mobile`

### T-010 — Verificar configuración de Azure AD
- [x] Usar [jwt.ms](https://jwt.ms) para decodificar un token de prueba
- [x] Verificar que el token incluye el claim `roles`
- [x] Verificar que `iss` es `https://login.microsoftonline.com/{tenant-id}/v2.0`
- [x] Verificar que `appid` está presente en tokens M2M

---

## Fase 1 — Portal Universitario (universitas-ui)

### T-101 — Crear proyecto Next.js
- [ ] `cd src/apps && pnpm create next-app@latest universitas-ui --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"`
- [ ] Configurar puerto 3003 en `package.json`
- [ ] Limpiar archivos de ejemplo (page.tsx, globals.css)

### T-102 — Instalar dependencias
- [ ] `pnpm add prisma @prisma/client jose`
- [ ] `npx prisma init --datasource-provider postgresql`

### T-103 — Configurar variables de entorno
- [ ] Crear `.env.local` con variables de Azure AD y DB
- [ ] Crear `.env` para Prisma CLI
- [ ] Agregar `.env.local` al `.gitignore`

### T-104 — Implementar esquema Prisma
- [ ] Escribir `prisma/schema.prisma` basado en `database-schema-simple.md`
- [ ] Definir modelos: `Institution`, `Program`, `StudyPlan`, `PensumSubject`, `User`, `Student`, `AcademicRecord`, `PartialGrade`
- [ ] Definir enums: `Modalidad`, `UserRole`, `AreaFormacion`, `TipoAsignatura`, `EstadoMatricula`, `EstadoAsignatura`

### T-105 — Crear y aplicar migración
- [ ] `npx prisma migrate dev --name init`
- [ ] Verificar tablas en `universitas_db`

### T-106 — Seed de datos de prueba
- [ ] Crear `prisma/seed.ts` con datos mock realistas
- [ ] Al menos 2 programas, 3 planes de estudios, 10+ asignaturas por plan
- [ ] Al menos 5 estudiantes con historial académico completo (4+ trimestres)
- [ ] `npx prisma db seed`

### T-107 — Autenticación con Azure AD
- [ ] Crear `lib/auth.ts` con helpers de Azure AD (PKCE, token exchange, refresh)
- [ ] Crear `app/api/auth/login/route.ts`
- [ ] Crear `app/api/auth/callback/route.ts`
- [ ] Crear `app/api/auth/logout/route.ts`
- [ ] Crear `proxy.ts` con rutas públicas y protegidas por rol

### T-108 — Endpoints M2M
- [ ] Crear `lib/m2m-validator.ts` — valida tokens de `gradus-api`
- [ ] Crear `app/api/m2m/students/[identity]/route.ts` — perfil
- [ ] Crear `app/api/m2m/students/[identity]/progress/route.ts` — progreso
- [ ] Crear `app/api/m2m/students/[identity]/history/route.ts` — historial plano
- [ ] Probar endpoints con Postman/HTTP client con token M2M simulado

### T-109 — UI del Estudiante
- [ ] Página principal: historial académico por trimestre
- [ ] Página trimestre activo: 3 parciales con porcentajes
- [ ] Página progreso: créditos logrados, % avance, gráfica

### T-110 — UI del Coordinador
- [ ] Lista de estudiantes con búsqueda y filtros
- [ ] Perfil completo del estudiante
- [ ] Formulario de registro de calificaciones (parciales)
- [ ] Vista del pensum por plan de estudios

### T-111 — Validación Fase 1
- [ ] Login con cuenta estudiante → ve solo su historial
- [ ] Login con cuenta coordinador → ve todos los estudiantes
- [ ] Endpoints M2M retornan 401 sin token, 403 con token de usuario, 200 con token M2M
- [ ] Datos del historial son consistentes con la DB

---

## Fase 2 — Gradus API (.NET 10)

### T-201 — Crear solución .NET
- [ ] `cd src/services/Gradus`
- [ ] `dotnet new sln -n Gradus`
- [ ] Crear proyectos: Domain, Application, Infrastructure, API
- [ ] Configurar referencias entre proyectos
- [ ] Configurar `launchSettings.json` (puerto 5002)

### T-202 — Instalar paquetes NuGet
- [ ] Application: MediatR, FluentValidation
- [ ] Infrastructure: EF Core, Npgsql, QuestPDF, SendGrid
- [ ] API: Authentication.JwtBearer, SignalR, Swashbuckle

### T-203 — Domain: Entidades y reglas de negocio
- [ ] `HomologationRequest.cs` con estados y transiciones válidas
- [ ] `HomologationSubject.cs` — materia en una solicitud
- [ ] `SubjectEquivalence.cs` — equivalencias configuradas
- [ ] `HomologationRule.cs` — reglas globales por par de programas
- [ ] `Notification.cs` — notificaciones in-app
- [ ] Interfaces de repositorios

### T-204 — Infrastructure: Persistencia
- [ ] `GradusDbContext.cs` con snake_case automático
- [ ] Configuraciones Fluent API para todas las entidades
- [ ] Migración inicial: `dotnet ef migrations add InitialCreate`
- [ ] `DataSeeder.cs` — datos de equivalencias de prueba

### T-205 — Infrastructure: UniversitasClient (M2M)
- [ ] Implementar `IUniversitasClient` que obtiene token M2M de Azure AD
- [ ] Cachear el token M2M en Redis (TTL = exp - 60s)
- [ ] Métodos: `GetStudentAsync`, `GetProgressAsync`, `GetHistoryAsync`

### T-206 — Application: Lógica de homologación
- [ ] `PreviewHomologationCommand` — genera vista previa aplicando reglas
- [ ] `CreateHomologationRequestCommand` — estudiante acepta y envía
- [ ] `ReviewHomologationCommand` — coordinador aprueba/rechaza
- [ ] `GenerateDocumentCommand` — genera PDF tras aprobación
- [ ] Queries: `GetMyRequestsQuery`, `GetPendingRequestsQuery`, `GetRequestDetailQuery`

### T-207 — Infrastructure: Generación de documentos
- [ ] Integrar QuestPDF
- [ ] Implementar `IDocumentService` con la plantilla institucional
- [ ] Datos dinámicos: estudiante, materias homologadas, coordinador, fecha
- [ ] Guardar PDF en sistema de archivos local (dev) / Azure Blob (prod)

### T-208 — Infrastructure: Notificaciones
- [ ] Email con SendGrid o SMTP institucional
- [ ] Templates de email: solicitud recibida, aprobada, rechazada
- [ ] SignalR Hub para notificaciones in-app en tiempo real
- [ ] Persistencia de notificaciones en `gradus_db.notifications`

### T-209 — API: Controllers y SignalR
- [ ] `HomologationController.cs` — todos los endpoints
- [ ] `EquivalenceController.cs` — gestión de equivalencias (coordinador)
- [ ] `NotificationHub.cs` — SignalR para tiempo real
- [ ] Configurar autenticación JWT con Azure AD
- [ ] Configurar CORS para gradus-web y gradus-mobile

### T-210 — Validación Fase 2
- [ ] Preview de homologación aplica reglas correctamente
- [ ] Solicitud cambia de estado según flujo correcto
- [ ] PDF generado tiene los datos correctos
- [ ] Email enviado al aprobar/rechazar
- [ ] Notificación in-app llega en tiempo real

---

## Fase 3 — Gradus Web (Next.js)

### T-301 — Crear proyecto Next.js
- [ ] `pnpm create next-app@latest gradus-web --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"`
- [ ] Configurar puerto 3004
- [ ] Configurar autenticación Azure AD (mismo patrón que universitas-ui)

### T-302 — Cliente de Gradus API
- [ ] Crear `lib/gradus-api.ts` — wrapper de todos los endpoints de Gradus API
- [ ] Manejo de errores centralizado
- [ ] Renovación automática de token si expira

### T-303 — Vista del Estudiante
- [ ] Página principal: mis solicitudes con estado y acciones
- [ ] Página nueva solicitud:
  - [ ] Selector de programa destino
  - [ ] Vista previa generada automáticamente (materias que aplican y que no)
  - [ ] Resumen: créditos homologables, materias pendientes
  - [ ] Botón de aceptar y enviar
- [ ] Página detalle de solicitud:
  - [ ] Estado actual con timeline
  - [ ] Materias incluidas con notas
  - [ ] Botón descargar PDF (si está aprobada)
  - [ ] Observaciones del coordinador (si fue rechazada)

### T-304 — Vista del Coordinador
- [ ] Dashboard: contador de solicitudes pendientes
- [ ] Lista de solicitudes pendientes con filtros
- [ ] Página revisar solicitud:
  - [ ] Datos del estudiante (consumidos de universitas-ui via Gradus API)
  - [ ] Lista de materias con origen y destino
  - [ ] Opción de agregar excepciones manuales
  - [ ] Formulario de aprobación/rechazo con observaciones
- [ ] Gestión de equivalencias entre programas
- [ ] Configuración de reglas por par de programas

### T-305 — Notificaciones in-app
- [ ] Conexión a SignalR Hub de Gradus API
- [ ] Badge con contador de notificaciones no leídas
- [ ] Panel de notificaciones con historial
- [ ] Marcar como leída al abrir

### T-306 — Validación Fase 3
- [ ] Flujo completo: solicitud → revisión → aprobación → PDF descargable
- [ ] Notificaciones llegan en tiempo real
- [ ] Manejo correcto de roles (estudiante vs coordinador)

---

## Fase 4 — Gradus Mobile (React Native)

### T-401 — Configurar proyecto React Native
- [ ] `npx create-expo-app gradus-mobile --template`
- [ ] Instalar `react-native-app-auth` para Azure AD
- [ ] Configurar deep linking para redirect URI

### T-402 — Autenticación
- [ ] Login con Azure AD via `react-native-app-auth`
- [ ] Almacenamiento seguro de tokens con `expo-secure-store`
- [ ] Renovación automática de token

### T-403 — Funcionalidades del Estudiante (mobile)
- [ ] Pantalla mis solicitudes
- [ ] Pantalla nueva solicitud con preview
- [ ] Pantalla detalle con descarga de PDF
- [ ] Push notifications para cambios de estado

### T-404 — Funcionalidades del Coordinador (mobile)
- [ ] Pantalla solicitudes pendientes
- [ ] Pantalla revisar solicitud
- [ ] Aprobar/rechazar con confirmación

### T-405 — Push Notifications
- [ ] Integrar Expo Notifications
- [ ] Registrar token de push en Gradus API
- [ ] Enviar push al coordinador cuando hay nueva solicitud
- [ ] Enviar push al estudiante cuando hay resolución

---

## Fase 5 — Integración real con Universitasxxi
- [ ] Obtener credenciales de la API de Universitasxxi
- [ ] Analizar estructura de respuestas de la API real
- [ ] Crear adaptadores que mapeen la respuesta de Universitasxxi al esquema de Prisma
- [ ] Implementar sincronización de datos (¿en tiempo real o por batch?)
- [ ] Probar con datos reales de estudiantes
- [ ] Validar que los codes de programa y asignatura coinciden

---

## Fase 6 — Despliegue en producción
- [ ] Definir proveedor de hosting
- [ ] Configurar dominio y SSL
- [ ] Actualizar Redirect URIs en Azure AD con URLs de producción
- [ ] Configurar variables de entorno de producción
- [ ] Configurar backups de PostgreSQL
- [ ] Configurar monitoreo y alertas
- [ ] Pruebas de carga

---

## Registro de progreso

| Fase | Inicio | Completada | Notas |
|---|---|---|---|
| Fase 0 — Azure AD | | | |
| Fase 1 — Universitas | | | |
| Fase 2 — Gradus API | | | |
| Fase 3 — Gradus Web | | | |
| Fase 4 — Gradus Mobile | | | |
| Fase 5 — Universitasxxi | | | |
| Fase 6 — Producción | | | |
