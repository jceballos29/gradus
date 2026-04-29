# Auditoría de Seguridad — Gradus API

> **Metodología:** Esta auditoría se estructuró bajo el marco **OWASP API Security Top 10 (2023)** y la metodología **CVSS v3.1** para el cálculo de severidad de los hallazgos. Las mitigaciones propuestas asumen que el sistema entrará a un entorno productivo alojado en la nube.

---

## 🚨 Hallazgos Críticos

### [VULN-001] Falsificación de Identidad y Escalado de Privilegios (BOLA / BFLA)
**Categoría OWASP:** `API1:2023 Broken Object Level Authorization` & `API5:2023 Broken Function Level Authorization`
**Ubicación:** `Gradus.API/Controllers/HomologationController.cs:142-146`
**Criticidad:** **CRÍTICA**
**CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:N` (**9.3**)

#### 📝 Descripción Técnica
El endpoint `GET /api/homologations/{requestId}` confía ciegamente en los parámetros de la cadena de consulta (`callerAzureOid` e `isCoordinator`) para determinar la identidad y el rol de quien ejecuta la acción. Un atacante (estudiante) puede manipular la URL para hacerse pasar por un coordinador u otro estudiante, accediendo a datos privados y bypassando las validaciones del handler MediatR.

#### 🎯 PoC / Explotación
```http
GET /api/homologations/3fa85f64-5717-4562-b3fc-2c963f66afa6?callerAzureOid=admin-oid&isCoordinator=true
Authorization: Bearer <token_de_estudiante_cualquiera>
```
El sistema procesará la petición como si fuera un coordinador, exponiendo notas privadas y permitiendo acciones restringidas.

#### 🛠 Código de Mitigación
Se debe extraer la identidad de los *Claims* del JWT inyectado por Azure AD y eliminar los parámetros de la firma del método.

**Antes:**
```csharp
public async Task<IActionResult> GetDetail(Guid requestId, [FromQuery] string callerAzureOid, [FromQuery] bool isCoordinator)
```

**Después:**
```csharp
[Authorize] // Requerido
public async Task<IActionResult> GetDetail(Guid requestId, CancellationToken ct = default)
{
    // Extraer OID y Rol de los claims de Azure AD
    var callerAzureOid = User.FindFirstValue("http://schemas.microsoft.com/identity/claims/objectidentifier") 
                         ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
    var isCoordinator = User.IsInRole("Coordinador");

    if (string.IsNullOrEmpty(callerAzureOid))
        return Unauthorized();

    var result = await _mediator.Send(
        new GetRequestDetailQuery(requestId, callerAzureOid, isCoordinator),
        ct
    );
    return Ok(result);
}
```
*(Nota: Este mismo patrón de vulnerabilidad ocurre en los métodos `Preview`, `Submit`, `Review`, y en el `NotificationsController`).*

---

### [VULN-002] Path Traversal / Local File Inclusion (LFI)
**Categoría OWASP:** `API8:2023 Security Misconfiguration` (o `API3:2023 Broken Object Property Level Auth` por Inyección)
**Ubicación:** `Gradus.API/Program.cs:144`
**Criticidad:** **ALTA**
**CVSS v3.1:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` (**7.5**)

#### 📝 Descripción Técnica
El endpoint de Minimal API expuesto para descargar resoluciones en PDF concatena directamente el parámetro `fileName` (controlado por el usuario) con la ruta del servidor sin sanitización previa. 

#### 🎯 PoC / Explotación
Un atacante sin autenticación puede enviar la siguiente petición para leer variables de entorno o archivos del sistema:
```http
GET /documents/..%2F..%2F..%2F..%2Fetc%2Fpasswd
GET /documents/..%2F..%2F..%2Fappsettings.json
```

#### 🛠 Código de Mitigación
Se debe asegurar que el nombre del archivo no contenga rutas relativas y validar que resida dentro del directorio restringido.

**Antes:**
```csharp
var path = Path.Combine(Directory.GetCurrentDirectory(), "documents", fileName);
if (!File.Exists(path)) return Results.NotFound();
return Results.File(path, "application/pdf", fileName);
```

**Después:**
```csharp
var sanitizedFileName = Path.GetFileName(fileName); // Remueve cualquier rastro de "../"
var basePath = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "documents"));
var filePath = Path.GetFullPath(Path.Combine(basePath, sanitizedFileName));

// Prevenir bypass de links simbólicos o rarezas
if (!filePath.StartsWith(basePath, StringComparison.OrdinalIgnoreCase))
    return Results.Forbid();

if (!File.Exists(filePath))
    return Results.NotFound();

return Results.File(filePath, "application/pdf", sanitizedFileName);
```

---

## ⚠️ Hallazgos Medios y de Configuración

### [VULN-003] Exposición de Secretos en Configuración
**Categoría OWASP:** `API8:2023 Security Misconfiguration`
**Ubicación:** `Gradus.API/appsettings.json`
**Criticidad:** **ALTA**

#### 📝 Descripción Técnica
El archivo `appsettings.json` (que suele subirse a control de versiones) contiene credenciales reales:
- `ConnectionStrings:GradusDb` (Password=secret)
- `Universitas:ClientSecret` (M2M Oauth Secret)
- `MediatR:LicenseKey` (Licencia comercial expuesta)

#### 🛠 Código de Mitigación
En .NET 10, los secretos jamás deben vivir en el `appsettings.json` base. 
1. Mover estos valores al sistema de `User Secrets` para desarrollo local (`dotnet user-secrets set "Universitas:ClientSecret" "xyz"`).
2. En producción, usar Azure Key Vault o Environment Variables e inyectarlos transparentemente:
```csharp
// Program.cs
if (builder.Environment.IsProduction())
{
    builder.Configuration.AddAzureKeyVault(
        new Uri("https://gradus-kv.vault.azure.net/"),
        new DefaultAzureCredential());
}
```

---

### [VULN-004] Ausencia de Rate Limiting y Riesgo de DoS
**Categoría OWASP:** `API4:2023 Unrestricted Resource Consumption`
**Ubicación:** `Gradus.API/Program.cs`
**Criticidad:** **MEDIA**

#### 📝 Descripción Técnica
Los endpoints pesados computacionalmente (como `POST /preview` que consulta servicios externos M2M y evalúa bucles de reglas de negocio) están expuestos sin un Middleware de Rate Limiting. Un ataque automatizado puede agotar el pool de conexiones de la base de datos, los tokens M2M, o el CPU.

#### 🛠 Código de Mitigación
Aprovechar el Middleware nativo de Rate Limiting de ASP.NET Core:

**En `Program.cs` (Registro):**
```csharp
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

builder.Services.AddRateLimiter(options => {
    options.AddFixedWindowLimiter("HomologationPolicy", opt => {
        opt.PermitLimit = 10;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 2;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});
```

**En `HomologationController.cs`:**
```csharp
[EnableRateLimiting("HomologationPolicy")]
[HttpPost("preview")]
public async Task<IActionResult> Preview(...)
```

---

### [VULN-005] Mass Assignment en Operaciones de Revisión
**Categoría OWASP:** `API3:2023 Broken Object Property Level Authorization`
**Ubicación:** `Gradus.API/Controllers/HomologationController.cs:80`
**Criticidad:** **MEDIA**

#### 📝 Descripción Técnica
El `ReviewRequest` permite al coordinador enviar una lista anidada `SubjectOverrides`. Si el Command Handler en `Application` procesa ciegamente estos *overrides* sin verificar si la materia original siquiera formaba parte de la homologación del estudiante, un coordinador malicioso podría inyectar aprobaciones a materias ajenas al pénsum evaluado.

#### 🛠 Mitigación (Estructural)
El dominio maneja esto parcialmente bien mediante:
```csharp
var subject = _subjects.FirstOrDefault(s => s.Id == subjectId) 
    ?? throw new InvalidOperationException("Materia no encontrada en esta solicitud.");
```
Se recomienda reforzar esto retornando `400 Bad Request` validando la existencia en `FluentValidation` en lugar de disparar excepciones de capa de Dominio, lo que previene ataques de inyección de propiedades espurias y denegación de servicio por saturación de logs de excepciones.
