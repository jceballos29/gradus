# Plan de Implementación: Autorización JWT con Claims del Token

## Contexto y Problema

La API de Gradus usa **Azure AD / Entra ID** como proveedor de identidad. Los controladores tienen `[Authorize]` y `[Authorize(Roles = "estudiante|coordinador")]`, pero los comandos y queries reciben el `StudentAzureOid` / `CoordinatorAzureOid` **como parámetro de cuerpo o query string** — enviado manualmente por el cliente.

Esto genera **dos problemas críticos**:

1. **Seguridad**: cualquier cliente puede hacerse pasar por otro usuario enviando un OID diferente al que tiene en su token.
2. **Errores de compilación**: el controller está usando propiedades (`StudentAzureOid`, `CoordinatorAzureOid`) en los request DTOs que **se eliminaron** al intentar obtenerlos automáticamente del token, rompiendo la construcción de los commands.

---

## Estado Actual — Lo que está mal

### `HomologationController.cs`

| Endpoint | Problema |
|---|---|
| `POST /preview` | `PreviewRequest` solo tiene `TargetProgramCode`, pero el command necesita `StudentAzureOid` |
| `POST /{draftId}/submit` | `SubmitRequest` solo tiene `StudentNotes`, pero el command necesita `StudentAzureOid` |
| `POST /{requestId}/review` | `ReviewRequest` no tiene `CoordinatorAzureOid`, pero el command lo necesita |
| `GET /my` | Pide `studentAzureOid` como `[FromQuery]` — debería salir del token |
| `GET /{requestId}` | Pide `callerAzureOid` e `isCoordinator` como query params — deberían salir del token |

### `Program.cs` — Autenticación JWT

La config es **correcta en estructura**, pero tiene una ambigüedad crítica:

```csharp
options.Audience = config["AzureAd:ClientId"];  // ⚠️ puede no coincidir con el claim "aud" del access token
```

En Azure AD v2.0, el `aud` de un **access token** es la URI del scope configurado (`api://ClientId`), no el `ClientId` directamente. Esto puede causar **401 Unauthorized** incluso con un token válido.

### Roles — Claim de roles en Azure AD

Los roles `"estudiante"` y `"coordinador"` están definidos en el App Registration de Azure. El claim que llega en el JWT es `roles` (array), pero ASP.NET Core por defecto los mapea al claim `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`.

Azure AD v2.0 con `MapInboundClaims = false` (valor por defecto en .NET 8+) puede enviar los roles bajo el nombre `roles`, pero `[Authorize(Roles = "estudiante")]` lee el claim `ClaimTypes.Role`. Si no hay un mapeo, la autorización por rol **siempre falla con 403**.

---

## Cambios Requeridos

### 1. `Program.cs` — Corregir configuración JWT

#### [MODIFY] [Program.cs](file:///home/jceballos/Documentos/gradus/apps/Gradus/Gradus.API/Program.cs)

```diff
 .AddJwtBearer(options =>
 {
     options.Authority = $"https://login.microsoftonline.com/{config["AzureAd:TenantId"]}/v2.0";
-    options.Audience = config["AzureAd:ClientId"];
+    options.Audience = $"api://{config["AzureAd:ClientId"]}";  // ← URI correcta para access tokens

     options.TokenValidationParameters = new TokenValidationParameters
     {
         ValidateIssuer = true,
         ValidateAudience = true,
         ValidateLifetime = true,
         ClockSkew = TimeSpan.FromMinutes(5),
+        // Desactivar el mapeo automático de claims para preservar nombres originales de Azure AD
+        RoleClaimType = "roles",
+        NameClaimType = "oid",
     };
```

> [!IMPORTANT]
> Si el frontend (`apps/gradus`) ya solicita tokens con `api://ClientId/.default` como scope, esto es correcto. Si solicita tokens con solo `ClientId`, revisar el scope del frontend.

---

### 2. `Gradus.API` — Servicio `ICurrentUserService`

Crear un servicio que extrae el OID y roles del `HttpContext.User` para que los controllers no dependan del body/query.

#### [NEW] `Gradus.API/Services/CurrentUserService.cs`

```csharp
using Gradus.Application.Common.Interfaces;
using System.Security.Claims;

namespace Gradus.API.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    /// <summary>OID del usuario autenticado (claim "oid" de Azure AD).</summary>
    public string AzureOid =>
        User?.FindFirstValue("oid")
        ?? User?.FindFirstValue("http://schemas.microsoft.com/identity/claims/objectidentifier")
        ?? throw new UnauthorizedAccessException("No se pudo obtener el OID del token.");

    public bool IsCoordinator => User?.IsInRole("coordinador") ?? false;
    public bool IsStudent => User?.IsInRole("estudiante") ?? false;
}
```

#### [NEW] `Gradus.Application/Common/Interfaces/ICurrentUserService.cs`

```csharp
namespace Gradus.Application.Common.Interfaces;

public interface ICurrentUserService
{
    string AzureOid { get; }
    bool IsCoordinator { get; }
    bool IsStudent { get; }
}
```

#### [MODIFY] `Program.cs` — Registrar el servicio

```csharp
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
```

---

### 3. `HomologationController.cs` — Leer OID del token

Una vez que `ICurrentUserService` esté disponible, los DTOs de request y los endpoints se simplifican:

#### [MODIFY] [HomologationController.cs](file:///home/jceballos/Documentos/gradus/apps/Gradus/Gradus.API/Controllers/HomologationController.cs)

```diff
+private readonly ICurrentUserService _currentUser;
+
+public HomologationController(IMediator mediator, ICurrentUserService currentUser)
+{
+    _mediator = mediator;
+    _currentUser = currentUser;
+}

 // Preview — ya no necesita StudentAzureOid en el body
 [HttpPost("preview")]
 public async Task<IActionResult> Preview([FromBody] PreviewRequest request, CancellationToken ct)
 {
     var command = new PreviewHomologationCommand(
-        StudentAzureOid: request.StudentAzureOid,  // ❌ era un campo eliminado
+        StudentAzureOid: _currentUser.AzureOid,    // ✅ del token
         TargetProgramCode: request.TargetProgramCode
     );
```

```diff
 // Submit
 [HttpPost("{draftId:guid}/submit")]
 public async Task<IActionResult> Submit(Guid draftId, [FromBody] SubmitRequest request, CancellationToken ct)
 {
     var command = new SubmitHomologationCommand(
         DraftRequestId: draftId,
-        StudentAzureOid: request.StudentAzureOid,  // ❌ campo eliminado
+        StudentAzureOid: _currentUser.AzureOid,    // ✅ del token
         StudentNotes: request.StudentNotes
     );
```

```diff
 // Review
 [HttpPost("{requestId:guid}/review")]
 public async Task<IActionResult> Review(Guid requestId, [FromBody] ReviewRequest request, CancellationToken ct)
 {
     var command = new ReviewHomologationCommand(
         RequestId: requestId,
-        CoordinatorAzureOid: request.CoordinatorAzureOid,  // ❌ campo eliminado
+        CoordinatorAzureOid: _currentUser.AzureOid,        // ✅ del token
         ...
     );
```

```diff
 // GetMine — ya no necesita query param
 [HttpGet("my")]
-public async Task<IActionResult> GetMine([FromQuery] string studentAzureOid, CancellationToken ct)
+public async Task<IActionResult> GetMine(CancellationToken ct)
 {
-    var result = await _mediator.Send(new GetMyRequestsQuery(studentAzureOid), ct);
+    var result = await _mediator.Send(new GetMyRequestsQuery(_currentUser.AzureOid), ct);
```

```diff
 // GetDetail — ya no necesita query params de identidad/rol
 [HttpGet("{requestId:guid}")]
-public async Task<IActionResult> GetDetail(Guid requestId, [FromQuery] string callerAzureOid,
-    [FromQuery] bool isCoordinator = false, CancellationToken ct = default)
+public async Task<IActionResult> GetDetail(Guid requestId, CancellationToken ct = default)
 {
     var result = await _mediator.Send(
-        new GetRequestDetailQuery(requestId, callerAzureOid, isCoordinator), ct
+        new GetRequestDetailQuery(requestId, _currentUser.AzureOid, _currentUser.IsCoordinator), ct
     );
```

#### DTOs de request simplificados (al final del controller)

```diff
-public record PreviewRequest(string StudentAzureOid, string TargetProgramCode);  // antes
+public record PreviewRequest(string TargetProgramCode);  // solo lo que el usuario define

-public record SubmitRequest(string StudentAzureOid, string? StudentNotes);
+public record SubmitRequest(string? StudentNotes);

 // ReviewRequest — sin CoordinatorAzureOid (el OID viene del token)
 public record ReviewRequest(bool Approve, string? CoordinatorNotes,
     IReadOnlyList<SubjectOverrideRequest>? SubjectOverrides);
```

---

### 4. Verificación de errores de compilación comunes

> [!WARNING]
> Antes de implementar, verificar los errores exactos del build:

```bash
cd /home/jceballos/Documentos/gradus/apps/Gradus
dotnet build 2>&1 | grep -E "error|warning"
```

Los errores esperados son:
- `CS1061`: `PreviewRequest` no contiene `StudentAzureOid` → se resuelve con paso 3
- `CS1061`: `SubmitRequest` no contiene `StudentAzureOid` → se resuelve con paso 3
- `CS1061`: `ReviewRequest` no contiene `CoordinatorAzureOid` → se resuelve con paso 3

---

## Preguntas Abiertas

> [!IMPORTANT]
> **¿Cuál es el Audience correcto?**
> 
> En el frontend (`apps/gradus`), ¿cuál es el scope que se pide al hacer login?
> - Si es `api://47ab77cc-9160-45a5-b4a0-dc52623cc325/.default` → usar `api://ClientId` en `options.Audience`
> - Si es `47ab77cc-9160-45a5-b4a0-dc52623cc325/.default` → el audience podría ser solo `ClientId`
> 
> El valor correcto se puede validar decodificando un token real en [jwt.ms](https://jwt.ms) y viendo el campo `aud`.

> [!IMPORTANT]
> **¿Los roles `estudiante` / `coordinador` están configurados en el App Registration de Azure?**
>
> Ve a **Azure Portal → App Registration → App roles** y verifica que existan roles con valor `estudiante` y `coordinador`. Si no existen, `[Authorize(Roles = "...")]` siempre fallará con 403.

---

## Plan de Verificación

### Pruebas automatizadas (build)
```bash
dotnet build apps/Gradus/Gradus.slnx
```

### Prueba manual con Swagger

1. Obtener token desde el frontend (o usar MSAL Playground)
2. En Swagger UI, hacer click en "Authorize" → pegar el Bearer token
3. Probar `GET /api/homologations/my` → debe devolver 200 con el OID del token
4. Probar sin token → debe devolver 401
5. Probar con token de `estudiante` en endpoint `GET /pending` → debe devolver 403

### Validar claim `oid` en el token

```bash
# Decodificar el token (solo la parte del payload, sin verificar firma)
echo "<token_sin_Bearer>" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

Buscar los campos `oid`, `roles`, y `aud` para confirmar que los valores coinciden con la config.
