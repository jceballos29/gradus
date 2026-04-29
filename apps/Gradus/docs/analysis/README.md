# Gradus — Auditoría Técnica e Ingeniería Inversa

> **Confirmación de contexto**
> He entendido el contexto. La solución `Gradus.slnx` corresponde a un servicio backend del **Sistema de Homologación Académica — Politécnico Internacional**. Su propósito es evaluar automáticamente el historial académico de un estudiante (proveniente del sistema externo *Universitas*) contra un pensum destino, aplicar reglas de homologación (nota mínima, tope de créditos, área), persistir la solicitud en estados (`Draft → Pending → Reviewing → Approved/Rejected → DocumentReady`), generar un PDF resolutorio y notificar vía SignalR/email.
>
> No existe documentación previa, ni README funcional interno, ni suite de pruebas. Esta auditoría se genera íntegramente a partir del código fuente.

---

## 1. Stack detectado

| Capa | Tecnología | Versión |
|------|------------|---------|
| **TargetFramework** | .NET | `net10.0` (preview — pinned en los 4 `.csproj`) |
| **Tipo de proyecto** | ASP.NET Core Web API (controllers MVC) + Minimal API híbrido | `Microsoft.NET.Sdk.Web` |
| **Arquitectura aparente** | Clean Architecture en 4 capas (`Domain` / `Application` / `Infrastructure` / `API`) + CQRS con Mediator + Repository | — |
| **ORM** | Entity Framework Core | `10.0.6` |
| **Motor de BD** | PostgreSQL | Driver `Npgsql.EntityFrameworkCore.PostgreSQL 10.0.1` |
| **Autenticación** | JWT Bearer contra Azure AD (multi-tenant v2.0) | `Microsoft.AspNetCore.Authentication.JwtBearer 10.0.7` |
| **Mediator / CQRS** | MediatR | `14.1.0` (comercial — license key en `appsettings.json`) |
| **Validación** | FluentValidation + Pipeline Behavior | `12.1.1` |
| **Logging** | Serilog.AspNetCore | `10.0.0` — **paquete referenciado pero NO inicializado en `Program.cs`** |
| **Caché distribuida** | Redis (StackExchange) | `Microsoft.Extensions.Caching.StackExchangeRedis 10.0.6` |
| **Resiliencia HTTP** | Polly vía `AddStandardResilienceHandler` | `Microsoft.Extensions.Http.Resilience 10.5.0` |
| **Tiempo real** | SignalR (`NotificationHub` en `/hubs/notifications`) | built-in ASP.NET Core |
| **PDF** | QuestPDF (Community License) | `2026.2.4` |
| **OpenAPI / UI** | Swashbuckle + Microsoft.AspNetCore.OpenApi | `10.1.7` / `10.0.6` |
| **Convenciones BD** | `snake_case` custom (`SnakeCaseNamingConvention`) + enums como string | — |
| **Integración externa** | `UniversitasClient` (M2M / `client_credentials` con caché de token en Redis) | HTTP `+ Azure AD token endpoint` |
| **Compilación estricta** | `Nullable=enable`, `TreatWarningsAsErrors=true`, `ImplicitUsings=enable` | ✅ en los 4 proyectos |
| **Tests** | **Ausentes** — no existe proyecto de pruebas en la solución | 🛑 |

> **⚠️ Nota sobre `net10.0`**: .NET 10 aún no es release estable en la fecha de este análisis. El proyecto depende de un TFM preview; esto impacta soporte LTS, compatibilidad de terceros y estrategia de despliegue. Ver `improvements.md` §Deuda técnica.

---

## 2. Estructura de la solución

```
Gradus/
├── Gradus.slnx                     # Formato XML de solución (.NET 9+)
├── Gradus.Domain/                  # Núcleo — entidades + enums + interfaces de repo
│   ├── Entities/                   # HomologationRequest (rich aggregate), Subject, Rule, Equivalence, Notification
│   ├── Enums/                      # HomologationStatus, NotificationType, RejectionReason
│   └── Interfaces/                 # IHomologationRepository, IEquivalenceRepository, INotificationRepository, IUniversitasClient
├── Gradus.Application/             # Casos de uso (CQRS)
│   ├── Commands/                   # PreviewHomologation, SubmitHomologation, ReviewHomologation
│   ├── Queries/                    # GetMyRequests, GetPendingRequests, GetRequestDetail
│   └── Common/
│       ├── Behaviors/ValidationBehavior.cs   # Pipeline MediatR
│       └── Interfaces/             # INotificationService, IEmailService, IDocumentService, IRealtimeNotifier
├── Gradus.Infrastructure/          # Adaptadores
│   ├── Persistence/                # GradusDbContext, Migrations, Repositories, Configurations, SnakeCaseNamingConvention, DataSeeder
│   ├── ExternalServices/           # UniversitasClient (HTTP M2M)
│   ├── Notifications/              # NotificationService, StubNotificationService, StubEmailService
│   ├── Documents/                  # QuestPdfDocumentService + HomologationDocument (plantilla)
│   └── Configuration/              # UniversitasOptions (IOptions)
└── Gradus.API/                     # Host web
    ├── Controllers/                # HomologationController, NotificationsController
    ├── Hubs/NotificationHub.cs     # SignalR
    ├── Middleware/ExceptionHandlingMiddleware.cs
    ├── Services/SignalRNotifier.cs # impl de IRealtimeNotifier
    ├── documents/                  # PDFs generados (servidos directo desde filesystem ⚠)
    └── Program.cs                  # Minimal hosting
```

---

## 3. Matriz de salud del proyecto

| Dimensión | Estado | Puntaje | Resumen |
|-----------|:-:|:-:|---------|
| **Arquitectura** | 🟡 | **6.5/10** | Separación Clean Arch correcta, dominio rico con invariantes, CQRS bien aplicado. **Pero** violaciones de capas menores (DTOs Universitas en `Domain`), doble `SaveChanges` en handlers, lógica muerta y comentarios-pseudo-código en `PreviewHomologationHandler` (líneas 192-215). |
| **Seguridad** | 🔴 | **2/10** | **Crítico.** Todos los endpoints productivos marcados `[AllowAnonymous]` con comentarios «En producción: [Authorize…]». Secretos de Universitas (client secret M2M), DB y MediatR en claro en `appsettings.json` versionado. Path traversal en `/documents/{fileName}`. Endpoint `/test/universitas/{identity}` sin auth en Development expone profile+history crudos. `new HttpClient()` manual para token endpoint. Sin rate limiting, sin HSTS, sin security headers, BOLA en `NotificationsController` (toma `azureOid` de query string sin validar contra el caller). |
| **Calidad de código** | 🟡 | **6/10** | `Nullable=enable` + `TreatWarningsAsErrors` en los 4 proyectos. Convenciones consistentes. Entidades con factory methods e invariantes de estado. **Pero** lógica comentada en `PreviewHomologationHandler`, código muerto (`foreach` vacío L312-315), magic strings de estado (`"PASSED"`, `"IN_PROGRESS"`) sin enum, comparación de áreas inconclusa. |
| **Performance** | 🟡 | **5.5/10** | `EnableRetryOnFailure` en EF Core, Polly `AddStandardResilienceHandler`, caché Redis para token M2M, `CancellationToken` propagado. **Pero** sin `AsNoTracking` en queries de lectura, sin paginación en `GetPendingRequests`, múltiples `SaveChangesAsync` en un solo caso de uso (no hay UoW transaccional en `ReviewHomologationHandler`), `EnableSensitiveDataLogging` controlado solo por `#if DEBUG` (OK) pero `DisplayRequestDuration` siempre en Swagger Dev. Sin OutputCache ni ResponseCompression. |
| **Testing** | 🔴 | **1/10** | **No existe ningún proyecto de tests** en la solución. Cobertura 0%. Sin `WebApplicationFactory`, sin integration tests, sin unit tests de handlers ni del agregado `HomologationRequest` (que tiene ≥7 métodos con invariantes críticas). |

**Promedio global: 4.2 / 10** — proyecto funcional pero **no apto para producción** sin mitigaciones de seguridad y cobertura de tests.

---

## 4. Top 5 hallazgos críticos

### 🔴 C-01 — Autenticación/Autorización desactivada en toda la API
**Ubicación:** `Gradus.API/Controllers/HomologationController.cs` (líneas 30, 52, 76, 108, 123, 135) y `Gradus.API/Controllers/NotificationsController.cs` (líneas 23, 45, 73, 85).
Cada endpoint productivo lleva `[AllowAnonymous]` con el comentario «*En producción: [Authorize(Roles = "…")]*». Aunque `Program.cs` configura JWT Bearer contra Azure AD, ningún controlador aplica `[Authorize]`. **Impacto:** cualquiera puede disparar una aprobación (`/review`), enviar una solicitud (`/submit`), listar solicitudes ajenas o marcar notificaciones de terceros como leídas. Equivale a OWASP API2 (Broken Authentication) + API5 (Broken Function Level Authorization). Detalle y refactor en `vulnerabilities.md` §API-01 / §API-05.

### 🔴 C-02 — Secretos en claro en `appsettings.json` versionado
**Ubicación:** `Gradus.API/appsettings.json` (líneas 10, 13, 20).
En texto plano en archivo trackeado en Git:
- `MediatR:LicenseKey` (JWT comercial LuckyPennySoftware, L10).
- `ConnectionStrings:GradusDb` con `Password=secret` (L13).
- `Universitas:ClientSecret` = `sexreto` (L20) — client secret del flujo M2M `client_credentials` contra Azure AD.

`AzureAd:` solo expone `TenantId`/`ClientId` (no hay secret Azure AD del lado API, JWT Bearer solo valida). `UserSecretsId` definido en `.csproj` pero no usado fuera de Dev. **Impacto:** cualquier fork, clonación o pipeline CI expone el client secret productivo de Universitas + password DB + licencia MediatR. Mitigación: rotar `Universitas:ClientSecret` **ya**, migrar a **Azure Key Vault + `AddAzureKeyVault`**, dejar `appsettings.Development.json` con `dotnet user-secrets`. Ver `vulnerabilities.md` §API-08.

### 🔴 C-03 — Path Traversal en endpoint de descarga de documentos
**Ubicación:** `Gradus.API/Program.cs` líneas 143-153.
```csharp
app.MapGet("/documents/{fileName}", (string fileName) => {
    var path = Path.Combine(Directory.GetCurrentDirectory(), "documents", fileName);
    if (!File.Exists(path)) return Results.NotFound();
    return Results.File(path, "application/pdf", fileName);
});
```
Sin `[Authorize]`, sin validación de `fileName`. `GET /documents/..%2F..%2Fappsettings.json` puede exfiltrar cualquier archivo relativo al CWD. **CVSS 3.1 estimado:** 8.6 (High) — vector `AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N`. Mitigación compilable en `vulnerabilities.md` §API-09 (validar GUID + whitelisting + `Path.GetFullPath` + prefix check).

### 🔴 C-04 — Instanciación manual de `HttpClient` y client secret en request body a Azure AD
**Ubicación:** `Gradus.Infrastructure/ExternalServices/UniversitasClient.cs` líneas 176-177.
```csharp
using var tokenClient = new HttpClient();
var response = await tokenClient.PostAsync(tokenEndpoint, body, ct);
```
Dos problemas: **(a)** `new HttpClient()` en código productivo rompe el patrón `IHttpClientFactory` configurado en `DependencyInjection.cs` — puede agotar sockets (socket exhaustion) bajo carga; **(b)** el flujo M2M no cachea el resultado ante fallos transitorios del endpoint de token (Polly solo aplica al HttpClient tipado de Universitas, no al `tokenClient` manual). Refactor: inyectar `IHttpClientFactory` con un HttpClient nombrado `"AzureAdToken"` + resilience handler. Detalle en `failures.md` §F-03.

### 🔴 C-05 — Ausencia total de cobertura de pruebas
**Ubicación:** toda la solución. `Gradus.slnx` solo declara los 4 proyectos productivos; no hay `Gradus.Tests`, `Gradus.IntegrationTests` ni `Gradus.Domain.Tests`. El agregado `HomologationRequest` tiene 7 métodos con invariantes de máquina de estado (`CreateDraft`, `AddSubjects`, `Submit`, `StartReview`, `Approve`, `Reject`, `SetDocumentReady`, `OverrideSubject`) sin un solo test. Los handlers de MediatR hacen orquestación crítica (preview + cálculo de créditos máximos, override, generación de PDF con compensación silenciosa de fallos) sin verificación automatizada. **Impacto:** cualquier refactor (p.ej. arreglar C-01) se hace a ciegas. Plan completo en `improvements.md` §Testing.

---

## 5. Índice navegable

| # | Documento | Contenido |
|---|-----------|-----------|
| 📘 | **[`README.md`](./README.md)** *(este archivo)* | Resumen ejecutivo, stack, matriz de salud, top 5 hallazgos críticos |
| 📗 | **[`documentation.md`](./documentation.md)** | Propósito funcional, inventario exhaustivo de endpoints con DTOs y status codes, casos de uso por módulo, diagramas de secuencia Mermaid, modelo ER, configuración (appsettings/env/secrets), guía de levantamiento local paso a paso |
| 🏛️ | **[`architecture.md`](./architecture.md)** | Auditoría SOLID principio a principio, alineación con Clean Architecture/Hexagonal/VSA, patrones detectados y crítica, diagrama C4 nivel 2, mapeo NuGet exhaustivo, análisis del pipeline de `Program.cs` y lifetimes de DI |
| 🛡️ | **[`vulnerabilities.md`](./vulnerabilities.md)** | Hallazgos de seguridad clasificados por OWASP API Security Top 10 (2023), con CVSS v3.1, PoC y código de mitigación compilable |
| 🐞 | **[`failures.md`](./failures.md)** | Bugs, errores lógicos, race conditions, `async` incorrecto, N+1, fugas de recursos, transacciones mal gestionadas — cada uno con criticidad, causa raíz, reproducción y fix en código |
| 🚀 | **[`improvements.md`](./improvements.md)** | Matriz Impacto × Esfuerzo, categorías: Performance, Observabilidad, Testing, Deuda técnica, DevEx/CI |

---

## 6. Ámbito de la auditoría

- **Incluye:** los 4 proyectos de `Gradus.slnx` en su rama actual, `appsettings*.json`, migraciones EF Core, configuración de DI, pipeline HTTP y contratos externos (`IUniversitasClient`).
- **Excluye:** código del sistema *Universitas* (servicio externo — solo se audita el cliente), frontends (`localhost:3003/3004`), infraestructura de despliegue (no se encontraron `Dockerfile`, `docker-compose.yml` ni manifests de K8s/Helm en el repo), pipelines de CI (ausentes).
- **Supuestos explícitos:** los valores reales de `Universitas:ClientSecret`, `ConnectionStrings:GradusDb` (password `secret`) y `MediatR:LicenseKey` visibles en `appsettings.json` **se asumen ya expuestos** por estar trackeados en Git, y requieren rotación inmediata antes de cualquier despliegue.

---

¿Listo para generar el siguiente archivo (`analysis/documentation.md`)?
