# Reporte de Análisis: Sistema de Notificaciones en Tiempo Real (SignalR)

**Fecha:** 29 de abril de 2026  
**Estado:** ⚠️ Se encontraron 4 bugs (1 crítico, 1 alto, 2 medios)

---

## 1. Resumen del flujo de notificaciones

### 1.1 Arquitectura general

```
Frontend (Next.js)          Backend (ASP.NET Core)
─────────────────           ───────────────────────────────────────────

[StudentLayout]             [SubmitHomologationHandler]
 └─ NotificationProvider     └─ NotificationService.NotifyAsync(oid, ...)
     └─ useNotifications          └─ NotificationRepository.AddAsync(...)   ← DB
         └─ HubConnection         └─ SignalRNotifier.SendToUserAsync(oid)    ← RT
             .invoke("RegisterUser", azureOid)
                                       └─ hub.Clients.Group(oid).SendAsync(...)
[CoordinatorLayout]
 └─ NotificationProvider    [ReviewHomologationHandler]
     └─ useNotifications     └─ NotificationService.NotifyAsync(studentOid, ...)
         └─ HubConnection         └─ NotificationRepository.AddAsync(...)
             .invoke("RegisterUser", azureOid)
                                       └─ SignalRNotifier.SendToUserAsync(studentOid)
```

### 1.2 Mecanismo de agrupación en SignalR

`NotificationHub.RegisterUser(azureOid)` añade la conexión del cliente al **grupo nombrado con su OID de Azure AD**. `SignalRNotifier.SendToUserAsync(userAzureOid, ...)` envía al grupo con ese mismo nombre. Para que la notificación llegue, el string enviado por el backend **debe ser exactamente igual** al string con el que el cliente se registró.

---

## 2. Bugs encontrados

---

### 🔴 BUG #1 — CRÍTICO: OID hardcodeado del coordinador (causa raíz del fallo en tiempo real)

**Archivo:** `Gradus.Application/Commands/SubmitHomologation/SubmitHomologationHandler.cs`

**Código problemático:**

```csharp
// OID del coordinador — en producción se buscaría dinámicamente
// por ahora notificamos al coordinador seed
private const string CoordinatorGroupOid = "coordinator-group";

// ...

await _notifications.NotifyAsync(
    recipientAzureOid: CoordinatorGroupOid,   // ← "coordinator-group"
    title: "Nueva solicitud de homologación",
    ...
);
```

**Por qué falla:**

| Paso                   | Estudiante                                                 | Coordinador                                      |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| Cliente llama          | `RegisterUser("abc-real-oid-estudiante")`                  | `RegisterUser("xyz-real-oid-coordinador")`       |
| Backend añade al grupo | `"abc-real-oid-estudiante"` ✅                             | `"xyz-real-oid-coordinador"` ✅                  |
| Backend envía a        | `request.StudentAzureOid` → `"abc-real-oid-estudiante"` ✅ | `CoordinatorGroupOid` → `"coordinator-group"` ❌ |
| Resultado              | **Notificación recibida**                                  | **Grupo vacío → mensaje silenciado**             |

El grupo `"coordinator-group"` **nunca es creado por ningún cliente**. El mensaje de SignalR se envía a un grupo inexistente y se descarta silenciosamente. Nada explota en el servidor; simplemente no llega.

**Consecuencia adicional:** La notificación también se persiste en la base de datos con `recipientAzureOid = "coordinator-group"` (ver Bug #2).

---

### 🟠 BUG #2 — ALTO: Notificaciones del coordinador persistidas con OID falso

**Archivo:** `Gradus.Application/Commands/SubmitHomologation/SubmitHomologationHandler.cs`  
**Archivo relacionado:** `Gradus.Infrastructure/Notifications/NotificationService.cs`

**Código en `NotificationService.NotifyAsync`:**

```csharp
var notification = Notification.Create(
    recipientAzureOid,   // ← recibe "coordinator-group"
    title,
    message,
    type,
    referenceId
);

await _repository.AddAsync(notification, ct);   // persiste con OID = "coordinator-group"
```

**Por qué falla:**

Cuando el coordinador abre la aplicación, el layout hace:

```csharp
// coordinator/layout.tsx
const initialNotifications = await api.getAllNotifications().catch(() => [])
```

El backend busca notificaciones donde `recipientAzureOid = session.azureOid` (el OID real del coordinador). Las notificaciones de tipo `HomologationSubmitted` están almacenadas con `recipientAzureOid = "coordinator-group"`, por lo que **nunca aparecen en el historial del coordinador**.

Este bug afecta tanto la carga inicial como la pestaña de notificaciones pasadas.

---

### 🟡 BUG #3 — MEDIO (Seguridad + Funcionalidad): `azureOid` expuesto como query param en el controlador

**Archivo:** `Gradus.API/Controllers/NotificationsController.cs`

**Código problemático:**

```csharp
[HttpGet]
public async Task<IActionResult> GetAll(
    [FromQuery] string azureOid,   // ← cualquier usuario autenticado puede pasar el OID de otro
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20,
    CancellationToken ct = default
)
{
    var notifications = await _repository.GetAllByRecipientAsync(azureOid, page, pageSize, ct);
    ...
}
```

**Dos problemas:**

1. **IDOR (Insecure Direct Object Reference — OWASP A01):** Cualquier usuario autenticado (con un JWT válido) puede pasar el OID de otro usuario como query param y leer sus notificaciones. El backend no valida que el `azureOid` del query coincida con el del token JWT.

2. **Funcionalidad rota:** El cliente `GradusApiClient` **no envía** el parámetro `azureOid` al llamar estos endpoints, como se ve a continuación.

---

### 🟡 BUG #4 — MEDIO: `GradusApiClient` no envía `azureOid` a los endpoints de notificaciones

**Archivo:** `apps/gradus/lib/gradus-api.ts`

**Código problemático:**

```typescript
async getAllNotifications(page = 1, pageSize = 20): Promise<Notification[]> {
    return this.request<Notification[]>(
        `/api/notifications?page=${page}&pageSize=${pageSize}`
        // ↑ falta ?azureOid=...
    )
}

async getUnreadNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>("/api/notifications/unread")
    // ↑ falta ?azureOid=...
}
```

**Por qué falla:** El controlador recibe `azureOid = null`. El repositorio consulta `WHERE recipient_azure_oid = NULL` y devuelve lista vacía. El layout captura el error con `.catch(() => [])`, ocultando el fallo.

**Resultado:** La **carga inicial de notificaciones está rota para todos los usuarios** (ambos roles), pero como el `catch` devuelve `[]` silenciosamente, nadie lo nota salvo inspeccionando los logs o las herramientas de red.

---

## 3. Mapa de impacto por rol

| Funcionalidad                                 | Estudiante                  | Coordinador                                          |
| --------------------------------------------- | --------------------------- | ---------------------------------------------------- |
| Notificación tiempo real (aprobado/rechazado) | ✅ Funciona                 | ✅ Funciona (ReviewHomologationHandler usa OID real) |
| Notificación tiempo real (nueva solicitud)    | N/A                         | ❌ **No llega** (Bug #1)                             |
| Historial de notificaciones (carga inicial)   | ❌ Lista vacía (Bug #4)     | ❌ Lista vacía (Bug #4)                              |
| Notificaciones en DB consultables             | ✅ (persisten con OID real) | ❌ Persisten con `"coordinator-group"` (Bug #2)      |

---

## 4. Propuesta de solución

### 4.1 Solución para Bug #1 y Bug #2 — Registro por rol en el Hub (mínimo cambio)

La solución más sencilla y que no requiere modificar la capa de dominio ni de aplicación es: **hacer que el Hub añada al coordinador también al grupo `"coordinator-group"` en el momento en que se registra**, usando los claims del JWT que SignalR ya valida.

El `Context.User` dentro del Hub ya contiene los claims porque el endpoint `/hubs/notifications` está protegido por `app.UseAuthentication()`.

**`Gradus.API/Hubs/NotificationHub.cs` — modificar `RegisterUser`:**

```csharp
public async Task RegisterUser(string azureOid)
{
    // 1. Grupo personal del usuario (OID real)
    await Groups.AddToGroupAsync(Context.ConnectionId, azureOid);

    // 2. Si es coordinador, también añadir al grupo de broadcast
    if (Context.User?.IsInRole("coordinador") == true)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "coordinator-group");
        _logger.LogInformation(
            "Coordinador {OID} añadido al grupo 'coordinator-group'",
            azureOid
        );
    }

    _logger.LogInformation(
        "Usuario {OID} registrado en SignalR. ConnectionId={ConnectionId}",
        azureOid,
        Context.ConnectionId
    );
}
```

> **¿Por qué funciona?** El `RoleClaimType = "roles"` ya está configurado en `Program.cs` para el middleware de autenticación. SignalR hereda ese mismo pipeline, por lo que `Context.User.IsInRole("coordinador")` evalúa el claim `roles` del JWT correctamente.

Esto soluciona el **Bug #1** (tiempo real). El `SubmitHomologationHandler` puede continuar usando `"coordinator-group"` como identificador de broadcast a todos los coordinadores conectados.

**Para el Bug #2 (persistencia),** hay dos estrategias:

**Opción A (mínima, pragmática):** Actualizar `NotificationsController` para que cuando el usuario sea coordinador, también consulte notificaciones donde `recipientAzureOid = "coordinator-group"`:

```csharp
// En NotificationsController — inyectar ICurrentUserService
[HttpGet]
public async Task<IActionResult> GetAll(
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20,
    CancellationToken ct = default
)
{
    var oid = _currentUser.AzureOid;

    // Si es coordinador, incluir también las notificaciones de broadcast
    var effectiveOid = _currentUser.IsCoordinator ? "coordinator-group" : oid;

    var notifications = await _repository.GetAllByRecipientAsync(
        effectiveOid, page, pageSize, ct
    );
    return Ok(...);
}
```

**Opción B (más correcta a largo plazo):** Modificar `INotificationRepository` para aceptar múltiples OIDs y en el controlador pasar `[oid, "coordinator-group"]` cuando el usuario es coordinador. Esto también permite consultar notificaciones personales + de grupo en una sola query.

---

### 4.2 Solución para Bug #3 y Bug #4 — Extraer OID del JWT en el controlador

Reemplazar el `[FromQuery] azureOid` por `ICurrentUserService` en el controlador, y limpiar el cliente.

**`Gradus.API/Controllers/NotificationsController.cs`:**

```csharp
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationRepository _repository;
    private readonly ICurrentUserService _currentUser;

    public NotificationsController(
        INotificationRepository repository,
        ICurrentUserService currentUser)
    {
        _repository = repository;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default
    )
    {
        var oid = _currentUser.AzureOid;
        var notifications = await _repository.GetAllByRecipientAsync(oid, page, pageSize, ct);
        return Ok(notifications.Select(MapNotification));
    }

    [HttpGet("unread")]
    public async Task<IActionResult> GetUnread(CancellationToken ct)
    {
        var notifications = await _repository.GetUnreadByRecipientAsync(_currentUser.AzureOid, ct);
        return Ok(notifications.Select(MapNotification));
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken ct)
    {
        await _repository.MarkAllAsReadAsync(_currentUser.AzureOid, ct);
        await _repository.SaveChangesAsync(ct);
        return NoContent();
    }

    private static object MapNotification(Notification n) => new
    {
        n.Id, n.Title, n.Message,
        Type = n.Type.ToString(),
        n.ReferenceId, n.CreatedAt,
        IsRead = n.ReadAt.HasValue,
    };
}
```

**`apps/gradus/lib/gradus-api.ts`:** eliminar el query param `azureOid` de los métodos de notificaciones (el servidor ya lo lee del JWT):

```typescript
async getAllNotifications(page = 1, pageSize = 20): Promise<Notification[]> {
    return this.request<Notification[]>(
        `/api/notifications?page=${page}&pageSize=${pageSize}`
    )
    // ← Sin cambios en la URL, ya es correcto porque el server leerá del JWT
}

async getUnreadNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>("/api/notifications/unread")
    // ← Sin cambios
}

async markAllNotificationsAsRead(): Promise<void> {
    return this.request<void>("/api/notifications/read-all", {
        method: "PATCH",
        // ← Sin azureOid en query
    })
}
```

> Estos métodos ya no necesitan pasar `azureOid` porque el servidor lo extrae del token Bearer.

---

## 5. Orden de implementación recomendado

| Prioridad | Bug | Cambio                                                                | Archivos afectados           |
| --------- | --- | --------------------------------------------------------------------- | ---------------------------- |
| 1         | #1  | Añadir registro de coordinador en grupo de Hub                        | `NotificationHub.cs`         |
| 2         | #3  | Extraer OID del JWT en controlador (elimina IDOR)                     | `NotificationsController.cs` |
| 3         | #2  | Consultar notificaciones por `"coordinator-group"` para coordinadores | `NotificationsController.cs` |
| 4         | #4  | Limpiar `GradusApiClient` (ya no necesita `azureOid`)                 | `gradus-api.ts`              |

Los cambios 1 y 2 son independientes y se pueden hacer en paralelo. El cambio 3 depende del 2. El cambio 4 es un ajuste de limpieza sin dependencias.

---

## 6. Validación post-fix

Para verificar que el Bug #1 está resuelto:

1. El coordinador inicia sesión y abre la app (NotificationProvider conecta y llama `RegisterUser`).
2. Un estudiante envía una solicitud de homologación.
3. La campana del coordinador debe incrementar su contador en tiempo real sin recargar la página.

Para verificar que el Bug #2/Bug #4 está resuelto:

1. El coordinador recarga la página.
2. Las notificaciones pasadas deben aparecer en el panel (carga inicial no vacía).

Para verificar que el Bug #3 (IDOR) está resuelto:

1. Llamar `GET /api/notifications` **sin** `?azureOid=` → debe devolver las notificaciones del token.
2. Llamar `GET /api/notifications?azureOid=otro-oid` → debe devolver igualmente las del token (query param ignorado).
