# Gradus — Reporte de Vulnerabilidades

> Auditoría de seguridad estructurada por **OWASP API Security Top 10 (2023)**. Cada hallazgo incluye: ID interno, categoría OWASP, ubicación exacta (`archivo:línea`), descripción técnica, CVSS v3.1 con vector y score, impacto de negocio, PoC, y código de mitigación compilable.
>
> **Alcance:** código fuente de la rama actual de `Gradus.slnx`. **Excluye:** infraestructura de despliegue (no se encontró), TLS del edge, políticas de IAM de Azure.

---

## Resumen ejecutivo

| # | ID | Título | OWASP | CVSS | Severidad |
|---|----|--------|-------|-----:|:---------:|
| 1 | **API-01** | Autorización de función ausente en todos los endpoints productivos | API5:2023 + API2:2023 | **9.8** | 🔴 Crítica |
| 2 | **API-02** | BOLA/IDOR masivo vía `azureOid` y `callerAzureOid` en query string | API1:2023 | **9.1** | 🔴 Crítica |
| 3 | **API-03** | Escalada a coordinador vía parámetro `isCoordinator=true` de query | API5:2023 + API3:2023 | **9.6** | 🔴 Crítica |
| 4 | **API-04** | Path Traversal en `/documents/{fileName}` | API8:2023 (Security Misconfiguration) + CWE-22 | **8.6** | 🔴 Alta |
| 5 | **API-05** | Secretos productivos (Azure client secret, DB password, licencia MediatR) en `appsettings.json` versionado | API8:2023 | **9.1** | 🔴 Crítica |
| 6 | **API-06** | Ausencia total de rate limiting y throttling | API4:2023 | **7.5** | 🟠 Alta |
| 7 | **API-07** | Endpoint de debug `/test/universitas/{identity}` expone perfil + historial completos sin auth | API3:2023 + API9:2023 | **7.4** | 🟠 Alta |
| 8 | **API-08** | SSRF / Inyección de path en `UniversitasClient` vía `identity` sin sanitización | API7:2023 + API10:2023 | **7.1** | 🟠 Alta |
| 9 | **API-09** | Validación de JWT Bearer débil — sin `ValidateIssuerSigningKey` explícito, `ValidAudiences` no incluye GUID API, multi-issuer abierto (`sts.windows.net/*`) | API2:2023 | **7.5** | 🟠 Alta |
| 10 | **API-10** | `new HttpClient()` manual para Azure AD token + body con `client_secret` logueado en error | API10:2023 + CWE-532 | **6.5** | 🟡 Media |
| 11 | **API-11** | Sin headers de seguridad (HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy) + HSTS desactivado en Dev | API8:2023 | **6.1** | 🟡 Media |
| 12 | **API-12** | Política CORS `AllowAnyHeader + AllowAnyMethod + AllowCredentials` sobre orígenes hardcoded | API8:2023 | **5.3** | 🟡 Media |
| 13 | **API-13** | Mass Assignment en `ReviewRequest` — el coordinador es identificado por el body, no por claims | API3:2023 + API6:2023 | **8.3** | 🔴 Alta |
| 14 | **API-14** | Validación de entrada laxa en FluentValidation (OIDs no validados como GUID, sin trimming) | API3:2023 | **4.3** | 🟢 Baja |
| 15 | **API-15** | Logging de datos potencialmente sensibles sin redacción (`LogError` con body de Azure AD, `EnableSensitiveDataLogging` en DEBUG) | API8:2023 + CWE-532 | **4.8** | 🟢 Baja |
| 16 | **API-16** | Migraciones EF aplicadas automáticamente en arranque (Dev) — riesgo de ejecución accidental en prod | API8:2023 | **5.9** | 🟡 Media |
| 17 | **API-17** | Notificación WebSocket/SignalR sin verificación del `azureOid` del grupo al `RegisterUser` — broadcast spoofing | API1:2023 + API5:2023 | **7.1** | 🟠 Alta |

**Promedio CVSS:** `7.3`. **Veredicto:** no apto para exponer a internet ni para datos reales de estudiantes. Requiere remediar API-01, API-02, API-03, API-04, API-05, API-13, API-17 antes de cualquier despliegue.

---

## API-01 — Autorización de función ausente en todos los endpoints productivos

| Campo | Valor |
|-------|-------|
| **OWASP** | API5:2023 Broken Function Level Authorization + API2:2023 Broken Authentication |
| **CWE** | CWE-285, CWE-862 |
| **CVSS 3.1** | `9.8` — `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H` |
| **Ubicación** | `Gradus.API/Controllers/HomologationController.cs:30, 52, 76, 108, 123, 135`; `Gradus.API/Controllers/NotificationsController.cs:23, 45, 73, 85` |

### Descripción

Toda la API marca sus endpoints con `[AllowAnonymous]` acompañado del comentario `// En producción: [Authorize(Roles = "…")]`. `Program.cs:55-78` configura correctamente `AddJwtBearer` contra Azure AD y llama `app.UseAuthentication()`/`app.UseAuthorization()`, pero **ningún controlador o acción aplica `[Authorize]`**, por lo que el middleware se ejecuta como pasaje inerte.

Verificación: `grep -r "\[Authorize" Gradus.API/` devuelve cero resultados. `grep -r "AllowAnonymous" Gradus.API/` devuelve 10 coincidencias.

### Impacto de negocio

- Un atacante anónimo puede llamar `POST /api/homologations/{id}/review` y **aprobar cualquier solicitud** de cualquier estudiante con cualquier nota.
- Un atacante anónimo puede llamar `POST /api/homologations/preview` con el OID de cualquier víctima, provocando creación de Draft en su nombre y consumiendo cuota del cliente M2M a Universitas.
- Integridad académica comprometida: la API puede aprobar homologaciones que se convierten en PDF legal (`SetDocumentReady`).
- Violación directa de protección de datos personales (Ley 1581/2012 Colombia, GDPR si aplica).

### Prueba de concepto

```bash
# Listar solicitudes pendientes — sin credenciales
curl -s http://localhost:5000/api/homologations/pending | jq

# Aprobar cualquier solicitud en estado Reviewing/Pending
curl -X POST http://localhost:5000/api/homologations/<REQUEST_GUID>/review \
  -H "Content-Type: application/json" \
  -d '{
    "coordinatorAzureOid": "attacker-supplied-oid",
    "approve": true,
    "coordinatorNotes": "auto-aprobado por atacante",
    "subjectOverrides": null
  }'
# → 200 OK, request.Status = DocumentReady
```

### Mitigación (código compilable)

**Paso 1.** Definir policies por rol en `Program.cs`:

```csharp
// Program.cs — reemplazar builder.Services.AddAuthorization(); por:
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("StudentOnly", p => p
        .RequireAuthenticatedUser()
        .RequireClaim("roles", "Student"));

    options.AddPolicy("CoordinatorOnly", p => p
        .RequireAuthenticatedUser()
        .RequireClaim("roles", "Coordinator"));

    options.AddPolicy("AuthenticatedUser", p => p.RequireAuthenticatedUser());

    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});
```

El `FallbackPolicy` asegura que cualquier endpoint **sin atributo** requiera autenticación por defecto, eliminando futuros olvidos.

**Paso 2.** Marcar los controladores — `HomologationController.cs`:

```csharp
[ApiController]
[Route("api/homologations")]
[Produces("application/json")]
[Authorize]
public class HomologationController : ControllerBase
{
    [HttpPost("preview")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> Preview(...) { ... }

    [HttpPost("{draftId:guid}/submit")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> Submit(...) { ... }

    [HttpPost("{requestId:guid}/review")]
    [Authorize(Policy = "CoordinatorOnly")]
    public async Task<IActionResult> Review(...) { ... }

    [HttpGet("my")]
    [Authorize(Policy = "StudentOnly")]
    public async Task<IActionResult> GetMine(CancellationToken ct) { ... }

    [HttpGet("pending")]
    [Authorize(Policy = "CoordinatorOnly")]
    public async Task<IActionResult> GetPending(CancellationToken ct) { ... }

    [HttpGet("{requestId:guid}")]
    [Authorize]
    public async Task<IActionResult> GetDetail(Guid requestId, CancellationToken ct = default) { ... }
}
```

**Paso 3.** Exponer el endpoint `/health` explícitamente `AllowAnonymous` — **único endpoint anónimo legítimo** (`Program.cs:139-141`, ya aplica).

---

## API-02 — BOLA/IDOR masivo vía `azureOid` y `callerAzureOid` en query string

| Campo | Valor |
|-------|-------|
| **OWASP** | API1:2023 Broken Object Level Authorization |
| **CWE** | CWE-639 Authorization Bypass Through User-Controlled Key |
| **CVSS 3.1** | `9.1` — `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N` |
| **Ubicación** | `HomologationController.cs:108-117, 142-154`; `NotificationsController.cs:22-93` |

### Descripción

Los endpoints aceptan el identificador del usuario desde `[FromQuery] string azureOid` (notificaciones) o `[FromQuery] string callerAzureOid` (detalle), sin contrastarlo contra el token autenticado (`User.FindFirst("oid")`). Incluso cuando API-01 se remedie, el atacante autenticado puede pasar un OID ajeno en el query y operar sobre el recurso de otro.

Ejemplos:
- `GET /api/homologations/my?studentAzureOid=<víctima>` → lista de solicitudes ajenas
- `GET /api/notifications/unread?azureOid=<víctima>` → notificaciones ajenas
- `PATCH /api/notifications/read-all?azureOid=<víctima>` → marca como leídas todas las notificaciones del otro usuario
- `GET /api/homologations/{id}?callerAzureOid=<cualquier>&isCoordinator=false`

### Impacto

- Lectura arbitraria de datos de otros estudiantes (perfil, programa, historial homologado).
- Manipulación del estado "leído" de notificaciones ajenas — deniega visibilidad de eventos críticos (aprobación/rechazo).

### PoC

```bash
# Autenticado como Alice, consultar solicitudes de Bob
curl -H "Authorization: Bearer <ALICE_TOKEN>" \
     "http://localhost:5000/api/homologations/my?studentAzureOid=<BOB_OID>"
```

### Mitigación

**Regla general:** el `oid` del caller debe leerse de `HttpContext.User` y jamás del body/query. Refactor del controller + eliminación del parámetro:

```csharp
// Gradus.API/Extensions/ClaimsPrincipalExtensions.cs — nuevo archivo
using System.Security.Claims;

namespace Gradus.API.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static string GetAzureOid(this ClaimsPrincipal user) =>
        user.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value
        ?? user.FindFirst("oid")?.Value
        ?? throw new UnauthorizedAccessException("Token sin claim 'oid'.");

    public static bool IsCoordinator(this ClaimsPrincipal user) =>
        user.IsInRole("Coordinator") || user.HasClaim("roles", "Coordinator");
}
```

```csharp
// HomologationController.cs
[HttpGet("my")]
[Authorize(Policy = "StudentOnly")]
public async Task<IActionResult> GetMine(CancellationToken ct)
{
    var oid = User.GetAzureOid();
    var result = await _mediator.Send(new GetMyRequestsQuery(oid), ct);
    return Ok(result);
}

[HttpGet("{requestId:guid}")]
[Authorize]
public async Task<IActionResult> GetDetail(Guid requestId, CancellationToken ct = default)
{
    var result = await _mediator.Send(
        new GetRequestDetailQuery(requestId, User.GetAzureOid(), User.IsCoordinator()),
        ct);
    return Ok(result);
}
```

```csharp
// NotificationsController.cs
[HttpGet("unread")]
[Authorize]
public async Task<IActionResult> GetUnread(CancellationToken ct)
{
    var oid = User.GetAzureOid();
    var notifications = await _repository.GetUnreadByRecipientAsync(oid, ct);
    return Ok(notifications.Select(n => new { n.Id, n.Title, n.Message, ... }));
}

[HttpPatch("{notificationId:guid}/read")]
[Authorize]
public async Task<IActionResult> MarkAsRead(Guid notificationId, CancellationToken ct)
{
    var oid = User.GetAzureOid();
    // 1) Verificar que la notificación pertenece al caller — nuevo método en repo
    var owned = await _repository.IsOwnedByRecipientAsync(notificationId, oid, ct);
    if (!owned) return Forbid();

    await _repository.MarkAsReadAsync(notificationId, ct);
    await _repository.SaveChangesAsync(ct);
    return NoContent();
}
```

**Autorización a nivel de objeto (`IHomologationRepository`):** añadir verificación en `GetRequestDetailHandler` que el caller sea coordinador **o** el dueño — que se haga al cargar, no como parámetro externo.

---

## API-03 — Escalada a coordinador vía parámetro `isCoordinator=true` de query

| Campo | Valor |
|-------|-------|
| **OWASP** | API5:2023 Broken Function Level Authorization + API3:2023 Broken Object Property Level Authorization |
| **CWE** | CWE-269, CWE-915 |
| **CVSS 3.1** | `9.6` — `AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:L` |
| **Ubicación** | `HomologationController.cs:142-154` |

### Descripción

```csharp
public async Task<IActionResult> GetDetail(
    Guid requestId,
    [FromQuery] string callerAzureOid,
    [FromQuery] bool isCoordinator = false,
    CancellationToken ct = default)
```

El parámetro `isCoordinator` viaja por query **y es usado por el handler** `GetRequestDetailQuery` para decidir si aplica filtros de pertenencia. El cliente decide su propio nivel de privilegio.

### Impacto

Un estudiante puede consultar **cualquier** `HomologationRequest` simplemente añadiendo `?isCoordinator=true` a la URL. Fuga completa de detalle: OIDs de terceros, notas del coordinador (`CoordinatorNotes`), resultado de revisión, PDF.

### PoC

```bash
curl -H "Authorization: Bearer <ALICE_TOKEN>" \
  "http://localhost:5000/api/homologations/<ANY_GUID>?callerAzureOid=alice&isCoordinator=true"
```

### Mitigación

Eliminar `callerAzureOid` e `isCoordinator` del query. Derivarlos de claims:

```csharp
[HttpGet("{requestId:guid}")]
[Authorize]
public async Task<IActionResult> GetDetail(Guid requestId, CancellationToken ct = default)
{
    var result = await _mediator.Send(
        new GetRequestDetailQuery(
            RequestId: requestId,
            CallerAzureOid: User.GetAzureOid(),
            IsCoordinator: User.IsCoordinator()),
        ct);
    return Ok(result);
}
```

Y reforzar en el handler:

```csharp
// GetRequestDetailHandler.cs
public async Task<RequestDetailDto> Handle(GetRequestDetailQuery query, CancellationToken ct)
{
    var request = await _requests.GetByIdWithSubjectsAsync(query.RequestId, ct)
        ?? throw new InvalidOperationException("Solicitud no encontrada.");

    var isOwner = string.Equals(request.StudentAzureOid, query.CallerAzureOid, StringComparison.OrdinalIgnoreCase);

    if (!query.IsCoordinator && !isOwner)
        throw new UnauthorizedAccessException("No autorizado para ver esta solicitud.");

    return MapToDto(request, includeCoordinatorNotes: query.IsCoordinator);
}
```

---

## API-04 — Path Traversal en `/documents/{fileName}`

| Campo | Valor |
|-------|-------|
| **OWASP** | API8:2023 Security Misconfiguration |
| **CWE** | CWE-22 Path Traversal |
| **CVSS 3.1** | `8.6` — `AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N` |
| **Ubicación** | `Gradus.API/Program.cs:143-153` |

### Descripción

```csharp
app.MapGet("/documents/{fileName}", (string fileName) =>
{
    var path = Path.Combine(Directory.GetCurrentDirectory(), "documents", fileName);
    if (!File.Exists(path)) return Results.NotFound();
    return Results.File(path, "application/pdf", fileName);
});
```

Sin `[Authorize]`, sin validación, sin normalización. `Path.Combine` **no neutraliza** componentes `..` — si `fileName = "../appsettings.json"`, el resultado es el archivo de configuración real.

### Impacto

Exfiltración de:
- `appsettings.json` con client secret, password DB, licencia MediatR (ver API-05).
- PDFs de otros estudiantes (si se conoce el GUID — pero con `/api/homologations/my` comprometido, los GUIDs son triviales).
- Cualquier archivo relativo al CWD legible por el proceso.

### PoC

```bash
# URL-encoded "../appsettings.json"
curl -v "http://localhost:5000/documents/..%2Fappsettings.json" --output /tmp/stolen.json
file /tmp/stolen.json  # → JSON, no PDF
```

`Results.File(path, "application/pdf", fileName)` fuerza Content-Type `application/pdf` pero el navegador/curl descarga el contenido crudo.

### Mitigación (código compilable)

```csharp
// Program.cs — reemplazar el MapGet /documents/{fileName}
app.MapGet("/documents/{fileName}", async (
        string fileName,
        HttpContext ctx,
        IDocumentAccessService docs,
        CancellationToken ct) =>
    {
        // 1) Debe ser un GUID-based filename: "homologacion-<guid>.pdf"
        if (!DocumentNameValidator.IsValid(fileName))
            return Results.BadRequest("Nombre de archivo inválido.");

        // 2) Autorización: solo el dueño o un coordinador
        var authorized = await docs.CanAccessAsync(fileName, ctx.User, ct);
        if (!authorized) return Results.Forbid();

        // 3) Stream de la ruta validada — nunca concatenar user input
        var stream = await docs.OpenReadAsync(fileName, ct);
        if (stream is null) return Results.NotFound();

        return Results.File(stream, "application/pdf", fileName, enableRangeProcessing: false);
    })
    .RequireAuthorization()
    .WithTags("Documents");
```

```csharp
// Gradus.API/Documents/DocumentNameValidator.cs
using System.Text.RegularExpressions;

public static partial class DocumentNameValidator
{
    [GeneratedRegex(@"^homologacion-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.pdf$")]
    private static partial Regex Pattern();

    public static bool IsValid(string name) => !string.IsNullOrEmpty(name) && Pattern().IsMatch(name);
}
```

```csharp
// Gradus.Infrastructure/Documents/DocumentAccessService.cs
using System.Security.Claims;

public sealed class DocumentAccessService : IDocumentAccessService
{
    private readonly IHomologationRepository _repo;
    private readonly string _root;

    public DocumentAccessService(IHomologationRepository repo, IOptions<DocumentStorageOptions> opts)
    {
        _repo = repo;
        _root = Path.GetFullPath(opts.Value.RootDirectory);
    }

    public async Task<bool> CanAccessAsync(string fileName, ClaimsPrincipal user, CancellationToken ct)
    {
        if (user.IsCoordinator()) return true;

        // "homologacion-<guid>.pdf" → guid
        var idPart = Path.GetFileNameWithoutExtension(fileName).AsSpan("homologacion-".Length);
        if (!Guid.TryParse(idPart, out var requestId)) return false;

        var req = await _repo.GetByIdAsync(requestId, ct);
        return req is not null &&
               string.Equals(req.StudentAzureOid, user.GetAzureOid(), StringComparison.OrdinalIgnoreCase);
    }

    public Task<Stream?> OpenReadAsync(string fileName, CancellationToken ct)
    {
        // Re-sanitizar: Path.GetFileName elimina cualquier segmento de directorio
        var safe = Path.GetFileName(fileName);
        var full = Path.GetFullPath(Path.Combine(_root, safe));

        // Defensa en profundidad: confirmar que el path normalizado cae dentro de _root
        if (!full.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            return Task.FromResult<Stream?>(null);

        return File.Exists(full)
            ? Task.FromResult<Stream?>(File.OpenRead(full))
            : Task.FromResult<Stream?>(null);
    }
}
```

---

## API-05 — Secretos productivos en `appsettings.json` versionado

| Campo | Valor |
|-------|-------|
| **OWASP** | API8:2023 Security Misconfiguration |
| **CWE** | CWE-798 Use of Hard-coded Credentials + CWE-540 Information Exposure in Source Code |
| **CVSS 3.1** | `9.1` — `AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N` |
| **Ubicación** | `Gradus.API/appsettings.json:10, 13, 20` |

### Descripción

`appsettings.json` — trackeado en git (verificable con `git ls-files --cached | grep appsettings.json`) — contiene:

```json
"MediatR": { "LicenseKey": "eyJhbGciOiJSUzI1NiIs...jcH..." },          // L10
"ConnectionStrings": {
    "GradusDb": "Host=localhost;...;Password=secret",                    // L13
    "Redis": "localhost:6379"
},
"Universitas": {
    ...
    "ClientSecret": "wQ68Q~...",          // L20
    ...
}
```

El `UserSecretsId` está configurado en `Gradus.API.csproj:7` pero no se consume: los secretos están en el archivo público.

### Impacto

- **ClientSecret de Universitas** permite a quien lo posea obtener tokens M2M `client_credentials` contra Azure AD para la app Gradus y consumir la API de Universitas impersonando al backend.
- **Password DB** `secret` — trivial y versionada. Cualquier clon del repositorio tiene acceso total a la base de datos si el puerto 5432 es alcanzable.
- **License key MediatR** expuesta — riesgo reputacional/legal con LuckyPenny Software.

### Mitigación (acción inmediata y código)

**Inmediato:**
1. Rotar `Universitas:ClientSecret` en Azure AD (revocar el actual).
2. Rotar password de PostgreSQL.
3. Reemplazar MediatR license key.
4. Añadir `**/appsettings.*.json` a `.gitignore` **excepto** `appsettings.json` vacío de plantilla + `appsettings.Development.json` vacío (como ya está). Expurgar historia con `git filter-repo` si el repo no es público.

**Código — sustituir por Key Vault (`Program.cs`):**

```csharp
var builder = WebApplication.CreateBuilder(args);

// Azure Key Vault — carga solo en entornos no-desarrollo
if (!builder.Environment.IsDevelopment())
{
    var vaultUri = builder.Configuration["KeyVault:Uri"]
        ?? throw new InvalidOperationException("KeyVault:Uri no configurado.");

    builder.Configuration.AddAzureKeyVault(
        new Uri(vaultUri),
        new DefaultAzureCredential());
}

// En desarrollo: dotnet user-secrets — nunca en appsettings.json
```

Package necesario en `Gradus.API.csproj`:

```xml
<PackageReference Include="Azure.Extensions.AspNetCore.Configuration.Secrets" Version="1.4.0" />
<PackageReference Include="Azure.Identity" Version="1.12.0" />
```

**Plantilla `appsettings.json` limpia:**

```json
{
  "Logging": { "LogLevel": { "Default": "Information" } },
  "KeyVault": { "Uri": "" },
  "AzureAd": { "TenantId": "", "ClientId": "" },
  "Universitas": { "BaseUrl": "", "TenantId": "", "ClientId": "", "Scope": "" }
}
```

Los valores `*ClientSecret`, `ConnectionStrings:*`, `MediatR:LicenseKey` se resuelven desde secretos (`dotnet user-secrets` en Dev, Key Vault en prod). `IConfiguration` los compone transparentemente.

---

## API-06 — Ausencia total de rate limiting y throttling

| Campo | Valor |
|-------|-------|
| **OWASP** | API4:2023 Unrestricted Resource Consumption |
| **CWE** | CWE-770 Allocation of Resources Without Limits |
| **CVSS 3.1** | `7.5` — `AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H` |
| **Ubicación** | `Gradus.API/Program.cs` — no hay `AddRateLimiter()` ni `UseRateLimiter()` |

### Descripción

`Program.cs` no registra `RateLimiter`. El endpoint `/api/homologations/preview` realiza 2 llamadas HTTP a Universitas + 2 queries a Postgres + 1 `SaveChanges`. Un atacante puede disparar miles de preview por segundo, agotando:
- Cuota del token M2M (Azure AD rate limiting del tenant).
- Pool de conexiones a Postgres (default ~100).
- Throughput a Universitas (DoS indirecto al upstream).

### Impacto

Denegación de servicio del propio Gradus y del sistema Universitas; costo financiero si Azure AD aplica tiered pricing.

### Mitigación

```csharp
// Program.cs
using System.Threading.RateLimiting;

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Global — protección basal
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ctx.User.GetAzureOidOrAnonymous(),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Política estricta para endpoints caros
    options.AddPolicy("preview-expensive", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ctx.User.GetAzureOid(),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

// En el pipeline — antes de MapControllers
app.UseRateLimiter();

// En el controller
[HttpPost("preview")]
[Authorize(Policy = "StudentOnly")]
[EnableRateLimiting("preview-expensive")]
public async Task<IActionResult> Preview(...) { ... }
```

---

## API-07 — Endpoint de debug `/test/universitas/{identity}` expone perfil + historial

| Campo | Valor |
|-------|-------|
| **OWASP** | API3:2023 Broken Object Property Level Authorization (Excessive Data Exposure) + API9:2023 Improper Inventory Management |
| **CWE** | CWE-200 Information Exposure |
| **CVSS 3.1** | `7.4` — `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` |
| **Ubicación** | `Gradus.API/Program.cs:156-168` |

### Descripción

```csharp
if (app.Environment.IsDevelopment())
{
    app.MapGet("/test/universitas/{identity}",
        async (string identity, IUniversitasClient client, CancellationToken ct) =>
        {
            var profile = await client.GetStudentProfileAsync(identity, ct);
            var history = await client.GetStudentHistoryAsync(identity, ct);
            return Results.Ok(new { profile, history });
        })
        .WithTags("Test");
}
```

Condicionado a Development por `ASPNETCORE_ENVIRONMENT`. Riesgo:
- Si la variable queda accidentalmente en `Development` en un despliegue (patrón común en contenedores Docker con default), el endpoint queda expuesto.
- Expone `identity` (cédula) + nombre, email, código, campus, programa, pensum, institución, historial completo de notas.

### Mitigación

Eliminar el endpoint. Si es imprescindible para debug local:

```csharp
if (app.Environment.IsDevelopment())
{
    app.MapGet("/test/universitas/{identity}", ...)
        .RequireHost("localhost", "127.0.0.1")  // solo local
        .RequireAuthorization("CoordinatorOnly");
}
```

Y añadir un chequeo defensivo en arranque para producción:

```csharp
// Program.cs — justo antes de app.Run();
if (!app.Environment.IsDevelopment())
{
    var env = app.Configuration["ASPNETCORE_ENVIRONMENT"];
    app.Logger.LogInformation("Booting in non-Development environment: {Env}", env);
}
```

---

## API-08 — SSRF / Inyección de path en `UniversitasClient`

| Campo | Valor |
|-------|-------|
| **OWASP** | API7:2023 Server Side Request Forgery + API10:2023 Unsafe Consumption of APIs |
| **CWE** | CWE-918 + CWE-20 Improper Input Validation |
| **CVSS 3.1** | `7.1` — `AV:N/AC:H/PR:L/UI:N/S:C/C:H/I:L/A:N` |
| **Ubicación** | `Gradus.Infrastructure/ExternalServices/UniversitasClient.cs:44-70` |

### Descripción

```csharp
public async Task<StudentProfileDto?> GetStudentProfileAsync(string identity, ...)
    => await GetAsync<StudentProfileDto>($"/api/m2m/students/{identity}", identity, ct);
```

`identity` se interpola en la URL sin:
- Escapar con `Uri.EscapeDataString`.
- Validar formato (cédula colombiana: 6-12 dígitos).

Si un atacante controla `identity` (a través de los endpoints de preview/submit/test), puede inyectar segmentos de path:

- `identity = "../admin/secrets"` → petición contra `/api/m2m/admin/secrets`.
- `identity = "123?bypass=1#"` → fragment/query inyectados.
- `identity = "123/../../etc/passwd"` (si Universitas sirve estáticos).

Aunque `HttpClient.BaseAddress` fija host, la API expuesta de Universitas puede tener endpoints administrativos accesibles por manipulación de ruta.

### Impacto

- Acceso lateral a rutas no públicas de Universitas.
- Combinado con API-01/API-07 (test endpoint), el atacante externo controla el `identity` sin autenticación.

### Mitigación

```csharp
// Gradus.Infrastructure/ExternalServices/UniversitasClient.cs
private static readonly System.Text.RegularExpressions.Regex IdentityPattern =
    new(@"^[0-9]{6,12}$", System.Text.RegularExpressions.RegexOptions.Compiled);

private static string ValidateIdentity(string identity)
{
    if (string.IsNullOrWhiteSpace(identity) || !IdentityPattern.IsMatch(identity))
        throw new ArgumentException(
            "Identity inválida — debe ser 6-12 dígitos.", nameof(identity));
    return identity;
}

public async Task<StudentProfileDto?> GetStudentProfileAsync(string identity, CancellationToken ct = default)
{
    var safe = Uri.EscapeDataString(ValidateIdentity(identity));
    return await GetAsync<StudentProfileDto>($"/api/m2m/students/{safe}", identity, ct);
}

public async Task<StudentHistoryDto?> GetStudentHistoryAsync(string identity, CancellationToken ct = default)
{
    var safe = Uri.EscapeDataString(ValidateIdentity(identity));
    return await GetAsync<StudentHistoryDto>($"/api/m2m/students/{safe}/history", identity, ct);
}

public async Task<StudentProgressDto?> GetStudentProgressAsync(string identity, CancellationToken ct = default)
{
    var safe = Uri.EscapeDataString(ValidateIdentity(identity));
    return await GetAsync<StudentProgressDto>($"/api/m2m/students/{safe}/progress", identity, ct);
}
```

Adicional: reforzar en el validator de MediatR:

```csharp
// PreviewHomologationValidator.cs
RuleFor(x => x.StudentAzureOid)
    .NotEmpty()
    .Matches(@"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
    .WithMessage("StudentAzureOid debe ser un GUID.");
```

---

## API-09 — Validación de JWT Bearer débil

| Campo | Valor |
|-------|-------|
| **OWASP** | API2:2023 Broken Authentication |
| **CWE** | CWE-287 Improper Authentication |
| **CVSS 3.1** | `7.5` — `AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N` |
| **Ubicación** | `Gradus.API/Program.cs:55-76` |

### Descripción

```csharp
options.Authority = $"https://login.microsoftonline.com/{config["AzureAd:TenantId"]}/v2.0";
options.Audience = config["AzureAd:ClientId"];

options.TokenValidationParameters = new TokenValidationParameters
{
    ValidateIssuer = true,
    ValidateAudience = true,
    ValidateLifetime = true,
    ClockSkew = TimeSpan.FromMinutes(5),
};

options.TokenValidationParameters.ValidIssuers = new[]
{
    $"https://login.microsoftonline.com/{config["AzureAd:TenantId"]}/v2.0",
    $"https://sts.windows.net/{config["AzureAd:TenantId"]}/",
};
```

Problemas:

1. **`ValidateIssuerSigningKey` no está seteado explícitamente** — aunque por default es `true` cuando `Authority` está configurado, la omisión explícita es una mala práctica documentada por Microsoft cuando se sobrescribe `TokenValidationParameters`.
2. **`Audience = config["AzureAd:ClientId"]`** — solo admite un `aud`. Los tokens M2M obtenidos con `scope=api://<clientId>/.default` traen `aud = api://<clientId>` (no el GUID). Un token M2M legítimo **no validará**. (Este bug se esconde porque hoy **ningún endpoint exige auth** — API-01.)
3. **`ClockSkew = 5min`** permite tokens vencidos hasta 5 minutos. El default es 5 min, endurecer a 30s en infra con NTP confiable.
4. **No hay `NameClaimType = "oid"` ni `RoleClaimType`** — propenso a confusión al leer claims en controllers.

### Mitigación

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var tenantId = config["AzureAd:TenantId"]!;
        var clientId = config["AzureAd:ClientId"]!;
        var apiUri   = $"api://{clientId}";

        options.Authority = $"https://login.microsoftonline.com/{tenantId}/v2.0";
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            RequireSignedTokens = true,
            RequireExpirationTime = true,
            ClockSkew = TimeSpan.FromSeconds(30),

            ValidIssuers =
            [
                $"https://login.microsoftonline.com/{tenantId}/v2.0",
                $"https://sts.windows.net/{tenantId}/"
            ],
            ValidAudiences = [clientId, apiUri],

            NameClaimType = "name",
            RoleClaimType = "roles"
        };

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = ctx =>
            {
                ctx.HttpContext.RequestServices
                    .GetRequiredService<ILogger<Program>>()
                    .LogWarning("JWT auth failed: {Type} — {Message}",
                                ctx.Exception.GetType().Name, ctx.Exception.Message);
                return Task.CompletedTask;
            }
        };
    });
```

---

## API-10 — `new HttpClient()` manual + body de token logueado en error

| Campo | Valor |
|-------|-------|
| **OWASP** | API10:2023 Unsafe Consumption of APIs |
| **CWE** | CWE-532 Insertion of Sensitive Information into Log File + CWE-400 Uncontrolled Resource Consumption |
| **CVSS 3.1** | `6.5` — `AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` |
| **Ubicación** | `Gradus.Infrastructure/ExternalServices/UniversitasClient.cs:160-199` |

### Descripción

```csharp
using var tokenClient = new HttpClient();
var response = await tokenClient.PostAsync(tokenEndpoint, body, ct);

if (!response.IsSuccessStatusCode)
{
    var error = await response.Content.ReadAsStringAsync(ct);
    _logger.LogError(
        "Error al obtener token M2M de Azure AD. Status={Status} Body={Body}",
        response.StatusCode, error);
    ...
}
```

Problemas:

1. **Socket exhaustion**: `new HttpClient()` bajo carga sostenida agota puertos efímeros (conocido desde 2016, ver Microsoft docs). El resto del proyecto usa `IHttpClientFactory`.
2. **Sin Polly**: la resilience policy solo aplica al `HttpClient` tipado de Universitas; si Azure AD falla transitoriamente, no hay reintento.
3. **Logging del body de error**: Azure AD a veces devuelve el request original en el error, lo que puede incluir `client_secret` (dependiendo del `error_description`). El secret queda en logs.

### Mitigación

Registrar un HttpClient nombrado para Azure AD:

```csharp
// Gradus.Infrastructure/DependencyInjection.cs
services.AddHttpClient("AzureAdToken", client =>
{
    client.BaseAddress = new Uri("https://login.microsoftonline.com/");
    client.Timeout = TimeSpan.FromSeconds(10);
})
.AddStandardResilienceHandler();
```

Refactor de `UniversitasClient`:

```csharp
public UniversitasClient(
    HttpClient httpClient,
    IHttpClientFactory httpFactory,        // ← añadir
    IDistributedCache cache,
    IOptions<UniversitasOptions> options,
    ILogger<UniversitasClient> logger)
{
    _httpClient = httpClient;
    _httpFactory = httpFactory;
    _cache = cache;
    _options = options.Value;
    _logger = logger;
}

private async Task<M2MTokenResponse> RequestNewTokenAsync(CancellationToken ct)
{
    var tokenClient = _httpFactory.CreateClient("AzureAdToken");
    var path = $"{_options.TenantId}/oauth2/v2.0/token";

    var body = new FormUrlEncodedContent(new Dictionary<string, string>
    {
        ["grant_type"]    = "client_credentials",
        ["client_id"]     = _options.ClientId,
        ["client_secret"] = _options.ClientSecret,
        ["scope"]         = _options.Scope
    });

    var response = await tokenClient.PostAsync(path, body, ct);

    if (!response.IsSuccessStatusCode)
    {
        // NO loguear el body — puede contener fragmentos del request con el secret
        _logger.LogError(
            "Error al obtener token M2M de Azure AD. Status={Status}",
            response.StatusCode);
        throw new UniversitasClientException(
            $"No se pudo obtener token M2M: {response.StatusCode}");
    }

    var tokenResponse = await response.Content.ReadFromJsonAsync<M2MTokenResponse>(JsonOptions, ct);
    return tokenResponse
        ?? throw new UniversitasClientException("Respuesta de token vacía de Azure AD.");
}
```

---

## API-11 — Sin headers de seguridad, HSTS desactivado

| Campo | Valor |
|-------|-------|
| **OWASP** | API8:2023 Security Misconfiguration |
| **CWE** | CWE-16 Configuration + CWE-693 Protection Mechanism Failure |
| **CVSS 3.1** | `6.1` — `AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N` |
| **Ubicación** | `Gradus.API/Program.cs:125-126` |

### Descripción

```csharp
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
```

No hay:
- `UseHsts()` (HTTP Strict Transport Security).
- Middleware que establezca `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Content-Security-Policy`.
- `Server` header supresión (expone stack ASP.NET).

### Mitigación

```csharp
// Program.cs — antes de app.UseCors(...)
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();              // Strict-Transport-Security
    app.UseHttpsRedirection();
}

app.Use(async (ctx, next) =>
{
    var h = ctx.Response.Headers;
    h["X-Content-Type-Options"] = "nosniff";
    h["X-Frame-Options"]        = "DENY";
    h["Referrer-Policy"]        = "no-referrer";
    h["Permissions-Policy"]     = "accelerometer=(), camera=(), geolocation=(), microphone=()";
    h["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
    h.Remove("Server");
    h.Remove("X-Powered-By");
    await next();
});
```

---

## API-12 — CORS permisivo sobre orígenes hardcoded

| Campo | Valor |
|-------|-------|
| **OWASP** | API8:2023 Security Misconfiguration |
| **CWE** | CWE-942 Overly Permissive Cross-domain Whitelist |
| **CVSS 3.1** | `5.3` — `AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N` |
| **Ubicación** | `Gradus.API/Program.cs:84-97` |

### Descripción

```csharp
policy
    .WithOrigins("http://localhost:3004", "http://localhost:3003")
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials();
```

- Orígenes `http://` (no TLS) con `AllowCredentials` → cookies/Authorization viajan en claro.
- Hardcoded — no hay configuración por entorno.
- `AllowAnyHeader + AllowAnyMethod` es excesivo: puede definirse el set real de headers/methods del frontend.

### Mitigación

```csharp
// appsettings.json
"Cors": {
    "AllowedOrigins": [ "https://gradus.pi.edu.co" ]
}

// Program.cs
var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? throw new InvalidOperationException("Cors:AllowedOrigins no configurado.");

builder.Services.AddCors(options =>
{
    options.AddPolicy("GradusFrontend", policy =>
    {
        policy.WithOrigins(origins)
              .WithMethods("GET", "POST", "PATCH", "OPTIONS")
              .WithHeaders("Authorization", "Content-Type", "X-Correlation-Id")
              .AllowCredentials()
              .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
    });
});
```

---

## API-13 — Mass Assignment: el coordinador es identificado por el body

| Campo | Valor |
|-------|-------|
| **OWASP** | API3:2023 Broken Object Property Level Authorization (Mass Assignment) + API6:2023 Unrestricted Access to Sensitive Business Flows |
| **CWE** | CWE-915 Improperly Controlled Modification of Dynamically-Determined Object Attributes |
| **CVSS 3.1** | `8.3` — `AV:N/AC:L/PR:L/UI:N/S:C/C:L/I:H/A:N` |
| **Ubicación** | `Gradus.API/Controllers/HomologationController.cs:80-101, 163-170`; `Gradus.Application/Commands/ReviewHomologation/ReviewHomologationCommand.cs` |

### Descripción

`ReviewRequest` acepta `CoordinatorAzureOid` desde el body y el handler lo persiste como aprobador (`HomologationRequest.Approve(coordinatorAzureOid, ...)`). Un coordinador A puede aprobar haciéndose pasar por el coordinador B. Equivalente en `SubmitRequest` (`StudentAzureOid` desde body).

### Impacto

- Auditoría corrupta: `ReviewedByAzureOid` refleja el OID que el atacante quiera.
- Repudio: el coordinador real puede negar haber aprobado.

### Mitigación

Eliminar los campos `*AzureOid` de los DTOs de body y leerlos siempre de `User.GetAzureOid()`:

```csharp
// ReviewHomologationCommand.cs — eliminar CoordinatorAzureOid del body-driven path
public record ReviewHomologationCommand(
    Guid RequestId,
    string CoordinatorAzureOid,     // ← ahora viene del handler/API desde claims, no del body
    bool Approve,
    string? CoordinatorNotes,
    IReadOnlyList<SubjectOverrideDto>? SubjectOverrides
) : IRequest<ReviewHomologationResponse>;

// ReviewRequest — sin coordinadorAzureOid
public record ReviewRequest(
    bool Approve,
    string? CoordinatorNotes,
    IReadOnlyList<SubjectOverrideRequest>? SubjectOverrides);

// HomologationController.cs
[HttpPost("{requestId:guid}/review")]
[Authorize(Policy = "CoordinatorOnly")]
public async Task<IActionResult> Review(
    Guid requestId, [FromBody] ReviewRequest request, CancellationToken ct)
{
    var cmd = new ReviewHomologationCommand(
        RequestId: requestId,
        CoordinatorAzureOid: User.GetAzureOid(),     // ← desde claims
        Approve: request.Approve,
        CoordinatorNotes: request.CoordinatorNotes,
        SubjectOverrides: request.SubjectOverrides?
            .Select(o => new SubjectOverrideDto(o.SubjectId, o.IsHomologable, o.Notes))
            .ToList());

    return Ok(await _mediator.Send(cmd, ct));
}

// SubmitHomologationCommand.cs — mismo patrón
public record SubmitRequest(string? StudentNotes);  // StudentAzureOid FUERA

[HttpPost("{draftId:guid}/submit")]
[Authorize(Policy = "StudentOnly")]
public async Task<IActionResult> Submit(
    Guid draftId, [FromBody] SubmitRequest request, CancellationToken ct)
{
    var cmd = new SubmitHomologationCommand(
        DraftRequestId: draftId,
        StudentAzureOid: User.GetAzureOid(),
        StudentNotes: request.StudentNotes);
    return Ok(await _mediator.Send(cmd, ct));
}
```

---

## API-14 — Validación de entrada laxa

| Campo | Valor |
|-------|-------|
| **OWASP** | API3:2023 |
| **CWE** | CWE-20 Improper Input Validation |
| **CVSS 3.1** | `4.3` — `AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N` |
| **Ubicación** | `Gradus.Application/Commands/PreviewHomologation/PreviewHomologationValidator.cs`; `Gradus.Application/Commands/SubmitHomologation/SubmitHomologationValidator.cs`; `ReviewHomologationValidator.cs` |

### Descripción

Los validators existentes (`PreviewHomologationValidator.cs:7-18`) solo exigen `NotEmpty` + `MaximumLength(20)` para el programa. No validan:
- Formato GUID de `StudentAzureOid`.
- Formato de `TargetProgramCode` (p.ej. 4 dígitos + letra mayúscula: `/^[0-9]{3}[A-Z]$/`).
- Longitud de notas (`StudentNotes`, `CoordinatorNotes`) — un atacante puede enviar 100MB de texto hasta ser cortado por Kestrel en 30MB default.
- Cantidad máxima de `SubjectOverrides` en `ReviewRequest` — nada impide un array de 100k entradas.

### Mitigación

```csharp
// PreviewHomologationValidator.cs
public PreviewHomologationValidator()
{
    RuleFor(x => x.StudentAzureOid)
        .NotEmpty()
        .Matches(@"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
        .WithMessage("StudentAzureOid debe ser un GUID válido.");

    RuleFor(x => x.TargetProgramCode)
        .NotEmpty()
        .MaximumLength(20)
        .Matches(@"^[0-9A-Z]{2,20}$")
        .WithMessage("TargetProgramCode debe ser alfanumérico en mayúsculas.");
}

// SubmitHomologationValidator.cs
RuleFor(x => x.StudentNotes)
    .MaximumLength(2000);

// ReviewHomologationValidator.cs
RuleFor(x => x.CoordinatorNotes).MaximumLength(4000);
RuleFor(x => x.SubjectOverrides)
    .Must(o => o == null || o.Count <= 200)
    .WithMessage("No se permiten más de 200 overrides por request.");

RuleForEach(x => x.SubjectOverrides)
    .ChildRules(o =>
    {
        o.RuleFor(x => x.SubjectId).NotEmpty();
        o.RuleFor(x => x.Notes).MaximumLength(1000);
    });
```

Limitar tamaño de request a nivel Kestrel:

```csharp
// Program.cs
builder.WebHost.ConfigureKestrel(o =>
{
    o.Limits.MaxRequestBodySize = 512 * 1024;   // 512 KB — homologaciones no requieren más
});
```

---

## API-15 — Logging de datos potencialmente sensibles

| Campo | Valor |
|-------|-------|
| **OWASP** | API8:2023 Security Misconfiguration |
| **CWE** | CWE-532 Insertion of Sensitive Information into Log File |
| **CVSS 3.1** | `4.8` — `AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N` |
| **Ubicación** | `Gradus.Infrastructure/DependencyInjection.cs:42-45`; `Gradus.Infrastructure/ExternalServices/UniversitasClient.cs:85-90, 181-186`; `Gradus.Application/Commands/PreviewHomologation/PreviewHomologationHandler.cs:35-39` |

### Descripción

- `EnableSensitiveDataLogging()` está dentro de `#if DEBUG` — correcto, pero si un build Release se ejecuta con `Logging:LogLevel:Microsoft.EntityFrameworkCore.Database.Command = Information` y las queries tienen parámetros con PII (cédulas), la posterior adición del flag sería silenciosa.
- `UniversitasClient.cs:85-90` loguea `identity` en `LogWarning` por 404 → cédulas en logs por correlación.
- `UniversitasClient.cs:181-186` loguea body del error de Azure AD (ver API-10).
- `PreviewHomologationHandler.cs:35-39` loguea `StudentAzureOid` sin scopes/redacción.

### Mitigación

1. **Agregar enricher de scrubbing** con Serilog (una vez Serilog esté inicializado — ver `architecture.md §6.1`):

```csharp
// Program.cs (tras API-05 + inicialización de Serilog)
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .Enrich.With<PiiRedactionEnricher>()        // nuevo
    .WriteTo.Console(formatter: new Serilog.Formatting.Compact.CompactJsonFormatter()));
```

2. **Reemplazar PII por hash en logs:**

```csharp
// Gradus.API/Logging/PiiRedactionEnricher.cs
public sealed class PiiRedactionEnricher : ILogEventEnricher
{
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory pf)
    {
        foreach (var p in logEvent.Properties.ToList())
        {
            if (p.Key is "StudentAzureOid" or "Student" or "Identity")
            {
                var hashed = Hash(p.Value.ToString().Trim('"'));
                logEvent.AddOrUpdateProperty(pf.CreateProperty(p.Key, hashed));
            }
        }
    }
    private static string Hash(string s)
    {
        Span<byte> buf = stackalloc byte[32];
        System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(s), buf);
        return "sha256:" + Convert.ToHexString(buf[..8]);
    }
}
```

3. **Nunca loguear body del error HTTP upstream** — API-10.

---

## API-16 — Migraciones EF en arranque

| Campo | Valor |
|-------|-------|
| **OWASP** | API8:2023 Security Misconfiguration |
| **CWE** | CWE-665 Improper Initialization |
| **CVSS 3.1** | `5.9` — `AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:L` |
| **Ubicación** | `Gradus.API/Program.cs:107-113` |

### Descripción

```csharp
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<GradusDbContext>();
    await db.Database.MigrateAsync();
    var seeder = scope.ServiceProvider.GetRequiredService<DataSeeder>();
    await seeder.SeedAsync();
    ...
}
```

Dev only ahora, pero:
- Si mañana alguien "extiende" a prod, corre `MigrateAsync` concurrentemente en pods múltiples → race condition con tabla `__ef_migrations_history`, corrupción de esquema.
- `SeedAsync` puede sobrescribir datos de prod si alguien accidentalmente ejecuta con `ASPNETCORE_ENVIRONMENT=Development` apuntando a DB productiva.

### Mitigación

Extraer migraciones a un proceso de despliegue separado (ej.: `dotnet ef database update` en pipeline) o a un comando CLI:

```csharp
// Program.cs — reemplazar el bloque
if (args.Contains("--migrate"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<GradusDbContext>();
    await db.Database.MigrateAsync();
    return;
}

if (args.Contains("--seed") && app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var seeder = scope.ServiceProvider.GetRequiredService<DataSeeder>();
    await seeder.SeedAsync();
    return;
}
```

Ejecución desde CI/CD: `dotnet Gradus.API.dll --migrate` antes de levantar los pods. Seeding estrictamente manual, nunca condicionado a entorno.

---

## API-17 — SignalR `RegisterUser` sin verificación de identidad

| Campo | Valor |
|-------|-------|
| **OWASP** | API1:2023 Broken Object Level Authorization + API5:2023 Broken Function Level Authorization |
| **CWE** | CWE-290 Authentication Bypass by Spoofing |
| **CVSS 3.1** | `7.1` — `AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N` |
| **Ubicación** | `Gradus.API/Hubs/NotificationHub.cs:22-31`; `Gradus.API/Program.cs:136` (hub mapeado sin auth) |

### Descripción

```csharp
public async Task RegisterUser(string azureOid)
{
    await Groups.AddToGroupAsync(Context.ConnectionId, azureOid);
    ...
}
```

Un cliente conecta al Hub (sin `[Authorize]` sobre el Hub ni sobre el endpoint `MapHub`) e invoca `RegisterUser("<OID de la víctima>")`. A partir de ese momento, **todas las notificaciones de la víctima llegan también al atacante** (aprobaciones, rechazos, PDFs). `SignalRNotifier.SendToUserAsync` usa `_hub.Clients.Group(userAzureOid).SendAsync(...)` — broadcast a todos los `ConnectionId` del grupo.

### Mitigación

```csharp
// NotificationHub.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

[Authorize]
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(ILogger<NotificationHub> logger) => _logger = logger;

    public override async Task OnConnectedAsync()
    {
        var oid = Context.User?.GetAzureOid();
        if (string.IsNullOrEmpty(oid))
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, oid);
        _logger.LogInformation("User {OID} subscribed. ConnectionId={ConnectionId}",
                               oid, Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    // NO exponer RegisterUser como RPC — reemplazado por OnConnectedAsync
}
```

```csharp
// Program.cs
app.MapHub<NotificationHub>("/hubs/notifications")
    .RequireAuthorization();
```

Config adicional para que JWT Bearer se lea desde el query `access_token` durante el handshake WebSocket (requerido por SignalR JS):

```csharp
// Program.cs — dentro de AddJwtBearer, junto a los events
options.Events = new JwtBearerEvents
{
    OnMessageReceived = ctx =>
    {
        var accessToken = ctx.Request.Query["access_token"];
        var path = ctx.HttpContext.Request.Path;
        if (!string.IsNullOrEmpty(accessToken) &&
            path.StartsWithSegments("/hubs/notifications"))
        {
            ctx.Token = accessToken;
        }
        return Task.CompletedTask;
    },
    // OnAuthenticationFailed ya definido en API-09
};
```

---

## Sumario de remediación por prioridad

### Bloque 1 — Crítico, antes de cualquier despliegue

| ID | Acción | Esfuerzo |
|----|--------|----------|
| API-05 | Rotar secretos, purgar `appsettings.json`, integrar Key Vault + user-secrets | M |
| API-01 | Añadir `[Authorize]` + `FallbackPolicy` + policies por rol | S |
| API-02 | Eliminar `azureOid`/`callerAzureOid` de query, leer de claims | S |
| API-03 | Eliminar `isCoordinator` del query | XS |
| API-04 | Refactor `/documents/{fileName}` con `DocumentAccessService` + whitelist GUID | M |
| API-13 | Eliminar `*AzureOid` de body, derivar de claims | S |
| API-17 | `[Authorize]` en Hub + eliminar `RegisterUser` RPC | S |

### Bloque 2 — Alto, primera iteración de hardening

| ID | Acción | Esfuerzo |
|----|--------|----------|
| API-06 | Instalar rate limiter con política global + política "expensive" | S |
| API-07 | Eliminar o restringir `/test/universitas/{identity}` a `RequireHost("localhost")` | XS |
| API-08 | Validar `identity` como cédula, `Uri.EscapeDataString` | XS |
| API-09 | Endurecer `TokenValidationParameters` (ClockSkew, ValidAudiences, claim types) | XS |
| API-10 | Mover token fetch a `IHttpClientFactory` + no loguear body | XS |

### Bloque 3 — Medio, sostenimiento

| ID | Acción | Esfuerzo |
|----|--------|----------|
| API-11 | HSTS + security headers middleware | XS |
| API-12 | CORS por configuración + headers/methods específicos | XS |
| API-14 | Endurecer FluentValidation + `MaxRequestBodySize` | S |
| API-15 | Scrubbing de PII en logs (requiere API-05 + Serilog activo) | M |
| API-16 | Migraciones fuera del arranque | S |

---

## Apéndice A — Categorías OWASP API 2023 cubiertas

| OWASP ID | Categoría | Cubierto por |
|----------|-----------|--------------|
| API1:2023 | Broken Object Level Authorization | API-02, API-17 |
| API2:2023 | Broken Authentication | API-01, API-09 |
| API3:2023 | Broken Object Property Level Authorization | API-03, API-07, API-13, API-14 |
| API4:2023 | Unrestricted Resource Consumption | API-06 |
| API5:2023 | Broken Function Level Authorization | API-01, API-03, API-17 |
| API6:2023 | Unrestricted Access to Sensitive Business Flows | API-13 |
| API7:2023 | Server Side Request Forgery | API-08 |
| API8:2023 | Security Misconfiguration | API-04, API-05, API-07, API-11, API-12, API-15, API-16 |
| API9:2023 | Improper Inventory Management | API-07 |
| API10:2023 | Unsafe Consumption of APIs | API-08, API-10 |

---

¿Listo para generar el siguiente archivo (`analysis/failures.md`)?
