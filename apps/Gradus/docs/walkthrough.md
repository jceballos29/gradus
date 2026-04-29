# Reporte de Cambios — Autorización JWT con Azure AD en Gradus

**Fecha:** 2026-04-28  
**Proyecto:** Gradus — Sistema de Homologación Académica (Politécnico Internacional)  
**Build final:** ✅ `Compilación correcta — 0 errores, 0 advertencias`

---

## 1. Contexto y Problema Original

El sistema Gradus tiene dos capas:

- **Backend** (`apps/Gradus` — ASP.NET Core .NET 10): API REST que expone los endpoints de homologación con `[Authorize]` y `[Authorize(Roles = "...")]`
- **Frontend** (`apps/gradus` — Next.js): Aplicación web que autentica usuarios con Azure AD mediante OAuth 2.0 + PKCE

### Errores que existían

**Error 1 — Compilación (CS1061):** Los DTOs del `HomologationController` habían sido modificados para eliminar los campos `StudentAzureOid` y `CoordinatorAzureOid`, pero el código del controller aún intentaba leerlos:

```
error CS1061: "PreviewRequest" no contiene una definición para "StudentAzureOid"
error CS1061: "SubmitRequest" no contiene una definición para "StudentAzureOid"
error CS1061: "ReviewRequest" no contiene una definición para "CoordinatorAzureOid"
```

**Error 2 — Token incorrecto (401/403 en runtime):** El frontend pedía solo scopes de Microsoft (`openid profile email offline_access`), por lo que Azure AD emitía un token para **Microsoft Graph** en lugar de la Gradus API:

```json
// Token anterior — INCORRECTO
{
  "aud": "00000003-0000-0000-c000-000000000000",  ← Microsoft Graph
  "roles": [missing],                              ← Sin roles
  "ver": "1.0"                                     ← Token v1
}
```

---

## 2. Cambios en el Código

### 2.1 [NUEVO] `Gradus.Application/Common/Interfaces/ICurrentUserService.cs`

**Ruta:** `apps/Gradus/Gradus.Application/Common/Interfaces/ICurrentUserService.cs`  
**Propósito:** Definir el contrato para acceder a la identidad del usuario autenticado desde cualquier capa de la aplicación, sin acoplar la lógica de negocio al `HttpContext`.

```csharp
namespace Gradus.Application.Common.Interfaces;

public interface ICurrentUserService
{
    /// <summary>OID del usuario en Azure AD (claim "oid" del access token).</summary>
    string AzureOid { get; }

    /// <summary>Indica si el usuario tiene el rol "coordinador".</summary>
    bool IsCoordinator { get; }

    /// <summary>Indica si el usuario tiene el rol "estudiante".</summary>
    bool IsStudent { get; }
}
```

---

### 2.2 [NUEVO] `Gradus.API/Services/CurrentUserService.cs`

**Ruta:** `apps/Gradus/Gradus.API/Services/CurrentUserService.cs`  
**Propósito:** Implementación concreta de `ICurrentUserService` que extrae los claims del `HttpContext.User` (el `ClaimsPrincipal` que ASP.NET Core construye después de validar el JWT).

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

    public string AzureOid =>
        User?.FindFirstValue("oid")
        // Fallback para tokens v1 con mapeo WS-Federation activado
        ?? User?.FindFirstValue("http://schemas.microsoft.com/identity/claims/objectidentifier")
        ?? throw new UnauthorizedAccessException(
            "No se pudo obtener el OID del token. Verifica que el token incluya el claim 'oid'."
        );

    public bool IsCoordinator => User?.IsInRole("coordinador") ?? false;

    public bool IsStudent => User?.IsInRole("estudiante") ?? false;
}
```

**Decisiones de diseño:**
- Vive en la capa **API** (no en Application ni Infrastructure) porque depende de `IHttpContextAccessor`, que es un concepto de la capa web
- La interfaz vive en **Application** para que handlers y servicios puedan depender de ella sin referenciar la capa API
- El fallback a `http://schemas.microsoft.com/identity/claims/objectidentifier` cubre tokens v1 o configuraciones legacy

---

### 2.3 [MODIFICADO] `Gradus.API/Program.cs`

**Cambio 1 — Configuración JWT:** Se reemplazó `options.Audience` (una sola audiencia) por `ValidAudiences` (array), cubriendo ambos formatos que Azure AD puede emitir según la versión del token.

```diff
- options.Audience = config["AzureAd:ClientId"];
+ options.TokenValidationParameters = new TokenValidationParameters
+ {
+     ValidateIssuer = true,
+     ValidateAudience = true,
+     ValidateLifetime = true,
+     ClockSkew = TimeSpan.FromMinutes(5),
+
+     // Cubre aud = "api://ClientId" (v2 estándar) y aud = "ClientId" (v2 con accessTokenAcceptedVersion=2)
+     ValidAudiences = new[]
+     {
+         $"api://{config["AzureAd:ClientId"]}",
+         config["AzureAd:ClientId"],
+     },
+
+     // Azure AD v2 envía roles en claim "roles" — habilita [Authorize(Roles = "coordinador")]
+     RoleClaimType = "roles",
+
+     // El OID se expone en claim "oid"
+     NameClaimType = "oid",
+ };
+
+ // Acepta tokens emitidos tanto por el endpoint v2.0 como por sts.windows.net (v1)
+ options.TokenValidationParameters.ValidIssuers = new[]
+ {
+     $"https://login.microsoftonline.com/{config["AzureAd:TenantId"]}/v2.0",
+     $"https://sts.windows.net/{config["AzureAd:TenantId"]}/",
+ };
```

**Cambio 2 — Registro de servicios:**

```diff
+ // Permite leer el OID y los roles del token en cualquier controller/servicio
+ builder.Services.AddHttpContextAccessor();
+ builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
```

**Motivo del `AddHttpContextAccessor()`:** Sin este registro, `IHttpContextAccessor` no está disponible en el contenedor de DI y `CurrentUserService` no puede inyectarlo.

---

### 2.4 [MODIFICADO] `Gradus.API/Controllers/HomologationController.cs`

**Problema resuelto:** Los OIDs se leían del body/query string, lo que permitía que cualquier cliente se hiciera pasar por otro usuario. Ahora siempre se extraen del token JWT.

**Cambios aplicados:**

**a) Inyección del servicio:**
```diff
- public HomologationController(IMediator mediator)
+ public HomologationController(IMediator mediator, ICurrentUserService currentUser)
  {
      _mediator = mediator;
+     _currentUser = currentUser;
  }
```

**b) Cada endpoint usa `_currentUser.AzureOid` en lugar del body:**
```diff
  // Preview
- StudentAzureOid: request.StudentAzureOid,
+ StudentAzureOid: _currentUser.AzureOid,

  // Submit
- StudentAzureOid: request.StudentAzureOid,
+ StudentAzureOid: _currentUser.AzureOid,

  // Review
- CoordinatorAzureOid: request.CoordinatorAzureOid,
+ CoordinatorAzureOid: _currentUser.AzureOid,

  // GetMine — elimina query param studentAzureOid
- public async Task<IActionResult> GetMine([FromQuery] string studentAzureOid, ...)
+ public async Task<IActionResult> GetMine(CancellationToken ct)
- var result = await _mediator.Send(new GetMyRequestsQuery(studentAzureOid), ct);
+ var result = await _mediator.Send(new GetMyRequestsQuery(_currentUser.AzureOid), ct);

  // GetDetail — elimina query params callerAzureOid e isCoordinator
- public async Task<IActionResult> GetDetail(Guid requestId, [FromQuery] string callerAzureOid,
-     [FromQuery] bool isCoordinator = false, ...)
+ public async Task<IActionResult> GetDetail(Guid requestId, CancellationToken ct = default)
- new GetRequestDetailQuery(requestId, callerAzureOid, isCoordinator)
+ new GetRequestDetailQuery(requestId, _currentUser.AzureOid, _currentUser.IsCoordinator)
```

**c) DTOs de request simplificados** — solo contienen lo que el cliente debe proveer explícitamente:
```csharp
// Antes — exponían OIDs que debían venir del cliente (inseguro)
public record PreviewRequest(string StudentAzureOid, string TargetProgramCode);
public record SubmitRequest(string StudentAzureOid, string? StudentNotes);
public record ReviewRequest(string CoordinatorAzureOid, bool Approve, ...);

// Después — el OID nunca se acepta del exterior
public record PreviewRequest(string TargetProgramCode);
public record SubmitRequest(string? StudentNotes);
public record ReviewRequest(bool Approve, string? CoordinatorNotes, ...);
```

---

### 2.5 [MODIFICADO] `apps/gradus/lib/auth.ts`

**Problema resuelto:** El frontend pedía solo scopes de Microsoft Graph. Azure AD emitía un token con `aud = 00000003-...` (Microsoft Graph) que la API rechazaba con 401.

```diff
- export const SCOPES = ["openid", "profile", "email", "offline_access"]
+ export const SCOPES = [
+   "openid",
+   "profile",
+   "email",
+   "offline_access",
+   // Scope de la Gradus API — Azure AD emite el access_token para la API,
+   // con aud = "47ab77cc-..." y roles = ["estudiante"|"coordinador"]
+   `api://${process.env.NEXT_PUBLIC_GRADUS_API_CLIENT_ID}/.default`,
+ ]
```

**Efecto:** Ahora Azure AD emite el `access_token` específicamente para la Gradus API, incluyendo los App Roles asignados al usuario en el claim `roles`.

---

### 2.6 [MODIFICADO] `apps/gradus/.env.local`

Se agregó la variable que referencia el ClientId del App Registration de la API (distinto al del frontend):

```diff
  NEXT_PUBLIC_GRADUS_API_URL=http://localhost:5002
+ # ClientId del App Registration de la Gradus API
+ NEXT_PUBLIC_GRADUS_API_CLIENT_ID=47ab77cc-9160-45a5-b4a0-dc52623cc325
```

> **Nota:** El frontend tiene su propio App Registration (`7fe1fad9-...`) separado del de la API (`47ab77cc-...`). Esta separación es una buena práctica — permite revocar permisos del cliente sin afectar la API.

---

## 3. Configuración en Microsoft Entra ID

### Tenant y registros involucrados

| Entidad | ID |
|---|---|
| **Tenant** | `dc5b2439-1ae1-494a-9640-47ae1180d6ad` |
| **App Registration — API** | `47ab77cc-9160-45a5-b4a0-dc52623cc325` |
| **App Registration — Frontend** | `7fe1fad9-43ff-409f-80ac-ce44f2f7e879` |

---

### 3.1 App Registration de la API (`47ab77cc-...`)

#### Exponer una API

| Campo | Valor |
|---|---|
| **URI de id. de aplicación** | `api://47ab77cc-9160-45a5-b4a0-dc52623cc325` |

**Ámbitos configurados:**

| Ámbito | Quién consiente | Estado |
|---|---|---|
| `api://47ab77cc-.../universitas.read` | (preexistente — uso M2M) | Habilitado |
| `api://47ab77cc-.../access_as_user` | Administradores y usuarios | Habilitado |

**Configuración del ámbito `access_as_user`:**

| Campo | Valor |
|---|---|
| Nombre del ámbito | `access_as_user` |
| ¿Quién puede dar el consentimiento? | Administradores y usuarios |
| Nombre para mostrar (admin) | `Acceder a Gradus como usuario` |
| Descripción (admin) | `Permite al frontend de Gradus acceder a la API en nombre del usuario autenticado para gestionar solicitudes de homologación.` |
| Nombre para mostrar (usuario) | `Acceder a Gradus como usuario` |
| Descripción (usuario) | `La aplicación Gradus necesita acceder a tus datos de homologación académica en tu nombre.` |
| Estado | Habilitado |

**Aplicaciones cliente autorizadas:**

| Id. de cliente | Ámbito autorizado |
|---|---|
| `7fe1fad9-43ff-409f-80ac-ce44f2f7e879` (Frontend) | `access_as_user` |

> Al agregar el frontend como cliente autorizado, Azure AD no muestra la pantalla de consentimiento al usuario — el flujo de login es completamente transparente.

#### App Roles

| Nombre para mostrar | Valor (en token) | Tipos de miembros | Estado |
|---|---|---|---|
| `Coordinador` | `coordinador` | Usuarios/Grupos | Habilitado |
| `Estudiante` | `estudiante` | Usuarios/Grupos | Habilitado |

> Estos valores (`coordinador`, `estudiante`) deben coincidir **exactamente** (case-sensitive) con los usados en `[Authorize(Roles = "coordinador")]` en el controller.

---

### 3.2 App Registration del Frontend (`7fe1fad9-...`)

#### Permisos de API configurados

| API | Permiso | Tipo | Estado |
|---|---|---|---|
| Microsoft Graph | `openid` | Delegado | ✅ Concedido |
| Microsoft Graph | `profile` | Delegado | ✅ Concedido |
| Microsoft Graph | `email` | Delegado | ✅ Concedido |
| Microsoft Graph | `offline_access` | Delegado | ✅ Concedido |
| **Gradus API** | **`access_as_user`** | **Delegado** | ✅ **Concedido (admin consent)** |

---

### 3.3 Asignación de roles a usuarios

En **Aplicaciones empresariales → Gradus API → Usuarios y grupos**, los usuarios fueron asignados con sus roles correspondientes:

| Usuario | Rol asignado |
|---|---|
| `laura.mendoza@politecnicointernacionaldev.onmicrosoft.com` | `Coordinador` |
| *(otros usuarios)* | `Estudiante` o `Coordinador` según corresponda |

---

## 4. Validación — Token resultante

Después de aplicar todos los cambios, el token decodificado confirmó el funcionamiento correcto:

```json
{
  "aud": "47ab77cc-9160-45a5-b4a0-dc52623cc325",
  "iss": "https://login.microsoftonline.com/dc5b2439-.../v2.0",
  "oid": "5f588b59-5dda-43c9-8e05-5b7523bdc203",
  "name": "Laura Mendoza",
  "roles": ["coordinador"],
  "scp": "access_as_user",
  "ver": "2.0",
  "azp": "7fe1fad9-43ff-409f-80ac-ce44f2f7e879"
}
```

| Claim | Estado | Detalle |
|---|---|---|
| `aud` | ✅ | ClientId de la API (cubierto por `ValidAudiences`) |
| `iss` | ✅ | Endpoint v2.0 de Azure AD |
| `oid` | ✅ | OID del usuario — disponible via `_currentUser.AzureOid` |
| `roles` | ✅ | Roles del App Registration — habilita `[Authorize(Roles)]` |
| `scp` | ✅ | Scope `access_as_user` |
| `ver` | ✅ | Token v2 |

---

## 5. Impacto en los endpoints — Contrato público de la API

Los request bodies que el cliente debe enviar **cambiaron** respecto al diseño original:

| Endpoint | Antes | Después |
|---|---|---|
| `POST /api/homologations/preview` | `{ studentAzureOid, targetProgramCode }` | `{ targetProgramCode }` |
| `POST /api/homologations/{id}/submit` | `{ studentAzureOid, studentNotes }` | `{ studentNotes }` |
| `POST /api/homologations/{id}/review` | `{ coordinatorAzureOid, approve, ... }` | `{ approve, ... }` |
| `GET /api/homologations/my` | `?studentAzureOid=<oid>` | *(sin parámetros)* |
| `GET /api/homologations/{id}` | `?callerAzureOid=<oid>&isCoordinator=false` | *(sin parámetros)* |

> El frontend (`apps/gradus`) debe actualizar sus llamadas a la API para eliminar esos campos del body/query. El OID y el rol ahora los infiere automáticamente la API desde el Bearer token que el frontend ya envía en cada request.

---

## 6. Archivos modificados — Resumen

| Archivo | Operación | Capa |
|---|---|---|
| `Gradus.Application/Common/Interfaces/ICurrentUserService.cs` | NUEVO | Application |
| `Gradus.API/Services/CurrentUserService.cs` | NUEVO | API |
| `Gradus.API/Program.cs` | MODIFICADO | API |
| `Gradus.API/Controllers/HomologationController.cs` | MODIFICADO | API |
| `apps/gradus/lib/auth.ts` | MODIFICADO | Frontend |
| `apps/gradus/.env.local` | MODIFICADO | Frontend |
| `apps/Gradus/docs/test.md` | NUEVO | Documentación |
