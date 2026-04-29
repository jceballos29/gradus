# Gradus — Bugs, Errores Lógicos y Fallas Técnicas

> Auditoría de correctitud del código fuente. Cada hallazgo incluye: criticidad, ubicación exacta (`archivo:línea`), causa raíz, reproducción/síntoma, y solución en código lista para aplicar. Complementa a `vulnerabilities.md` (seguridad) y `architecture.md` (estructura).

---

## Resumen ejecutivo

| # | ID | Categoría | Título | Criticidad |
|---|----|-----------|--------|:-:|
| 1 | **F-01** | Lógica | `StudentIdentity` y `TargetProgramName` populados con valores incorrectos en toda Draft | 🔴 Crítica |
| 2 | **F-02** | Lógica | `RequiresSameArea` ignorado silenciosamente — bloque vacío con 17 líneas de comentarios | 🔴 Crítica |
| 3 | **F-03** | Lógica | Cálculo de `maxCredits` con bug de precedencia — expresión muerta | 🟠 Alta |
| 4 | **F-04** | Código muerto | `foreach` vacío en `PreviewHomologationHandler` L311-315 | 🟢 Baja |
| 5 | **F-05** | Recursos | `new HttpClient()` manual en flujo M2M → socket exhaustion | 🟠 Alta |
| 6 | **F-06** | Transacción | 4 `SaveChangesAsync` sin envoltura transaccional en `ReviewHomologationHandler` | 🔴 Crítica |
| 7 | **F-07** | Excepciones | `try/catch` silencioso alrededor de `GenerateDocument` deja estado inconsistente | 🟡 Media |
| 8 | **F-08** | Lógica | Destinatario de coordinador hardcoded: `"coordinator-group"` | 🟡 Media |
| 9 | **F-09** | Concurrencia | `HttpClient.DefaultRequestHeaders.Authorization` mutado sin exclusión → race de headers entre requests | 🟠 Alta |
| 10 | **F-10** | Async honesto | `HomologationRepository.UpdateAsync` devuelve `Task.CompletedTask` con firma async | 🟡 Media |
| 11 | **F-11** | Performance EF | Queries de lectura sin `AsNoTracking` en todos los handlers | 🟠 Alta |
| 12 | **F-12** | Magia stringly-typed | Estados de Universitas comparados como string `"PASSED"`/`"IN_PROGRESS"` | 🟡 Media |
| 13 | **F-13** | Lógica | Doble construcción de `HomologationSubject` con `Guid.Empty` → recreación innecesaria | 🟡 Media |
| 14 | **F-14** | Excepciones | `DbUpdateException` no mapeada a 409 → responde 500 genérico | 🟠 Alta |
| 15 | **F-15** | Concurrencia | `MigrateAsync` sin lock en arranque concurrente | 🟡 Media |
| 16 | **F-16** | Bloqueo async | `document.GeneratePdf(filePath)` sincrónico en método `async` | 🟡 Media |
| 17 | **F-17** | DI / side effect | `QuestPdfDocumentService` hace `Directory.CreateDirectory` en constructor | 🟡 Media |
| 18 | **F-18** | Excepciones | `NotificationService` traga fallos de SignalR silenciosamente | 🟡 Media |
| 19 | **F-19** | Lógica | Email del coordinador mal formado (`"coordinator-group@…"`) | 🟢 Baja |
| 20 | **F-20** | Concurrencia | Cache stampede del token M2M — múltiples POST simultáneos a Azure AD | 🟠 Alta |
| 21 | **F-21** | Lógica | `MarkAsReadAsync` no invoca la invariante de dominio `Notification.MarkAsRead()` | 🟡 Media |
| 22 | **F-22** | Performance EF | `GetPendingRequestsHandler` ejecuta 2 queries separadas (Pending + Reviewing) | 🟢 Baja |
| 23 | **F-23** | Observabilidad | Sin abstracción de reloj (`TimeProvider`) — entidades no testeables en el tiempo | 🟢 Baja |
| 24 | **F-24** | Convenciones | `SnakeCaseNamingConvention` pluraliza con `+ "s"` ingenuo — romperá con `Subject → subjects` OK pero con `Notification → notifications` OK; fallará con nombres que terminan en `-y`, `-s`, `-ch` | 🟢 Baja |
| 25 | **F-25** | Lógica | `RecalculateMetrics` suma `SourceCredits` — ambigüedad semántica con créditos homologados | 🟡 Media |
| 26 | **F-26** | Seed | `DataSeeder` no verifica idempotencia en cada arranque de Dev (supuesto — ver ZG) | 🟡 Media |

**Criticidades:** 🔴 Crítica × 3 · 🟠 Alta × 6 · 🟡 Media × 12 · 🟢 Baja × 5.

---

## F-01 — `StudentIdentity` y `TargetProgramName` populados con valores incorrectos

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🔴 Crítica |
| **Ubicación** | `Gradus.Application/Commands/PreviewHomologation/PreviewHomologationHandler.cs:299-308` |

### Causa raíz

```csharp
var draftRequest = HomologationRequest.CreateDraft(
    studentIdentity: command.StudentAzureOid,        // ← usa OID en vez de cédula
    studentAzureOid: command.StudentAzureOid,
    studentName: $"{profile.FirstName} {profile.LastName}".Trim(),
    studentCode: profile.StudentCode,
    sourceProgramCode: sourceProgramCode,
    sourceProgramName: profile.Program.Name,
    targetProgramCode: command.TargetProgramCode,
    targetProgramName: command.TargetProgramCode      // ← usa code en vez de name; comentario "se completa abajo" nunca cumplido
);
```

El dominio diferencia `StudentIdentity` (cédula — `profile.Identity`) y `StudentAzureOid` (Azure OID) como snapshots independientes. El handler los colapsa. Además, `profile.Identity` **sí** se usa después en el DTO de respuesta (L364), lo que prueba que el dato correcto está disponible y simplemente se ignora al persistir.

`targetProgramName` recibe el **código** del programa destino (ej. `"372V"`) — hay que resolver el nombre vía repositorio de equivalencias o agregándolo al DTO de `HomologationRule`.

### Reproducción

```bash
# Tras ejecutar preview, inspeccionar la DB:
psql -c "SELECT student_identity, student_azure_oid, target_program_code, target_program_name
         FROM homologation_requests ORDER BY created_at DESC LIMIT 1"

# student_identity = "<OID de Azure>" (debería ser cédula)
# target_program_name = "372V"        (debería ser "Ingeniería de Sistemas")
```

Consecuencia: `IHomologationRepository.GetByStudentIdentityAsync` **jamás** encuentra por cédula — solo funciona cuando el caller pasa el OID. PDFs generados muestran `"372V"` como nombre del programa destino.

### Solución

```csharp
// PreviewHomologationHandler.cs
// 1) Resolver nombre del programa destino — extenderlo desde la regla (o del pensum externo si Universitas lo expone).
//    Mínimo: buscar la primera equivalencia y usar su TargetSubjectCode/Name para confirmar programa destino existe.

// Si no se puede obtener el nombre real del programa destino vía Universitas, promover al dominio de Gradus:
//   - añadir a HomologationRule un campo TargetProgramName (nullable con default del code).
//   - leerlo desde la regla cargada en L79-89.

var draftRequest = HomologationRequest.CreateDraft(
    studentIdentity: profile.Identity,                      // cédula real
    studentAzureOid: command.StudentAzureOid,
    studentName: $"{profile.FirstName} {profile.LastName}".Trim(),
    studentCode: profile.StudentCode,
    sourceProgramCode: sourceProgramCode,
    sourceProgramName: profile.Program.Name,
    targetProgramCode: command.TargetProgramCode,
    targetProgramName: rule.TargetProgramName               // ver nota ZG sobre modelo
        ?? command.TargetProgramCode                        // fallback defensivo
);
```

**Migración de datos existentes:** script correctivo contra `homologation_requests` SET `student_identity = student_azure_oid WHERE student_identity = student_azure_oid`… — en este proyecto no hay datos productivos, simplemente re-seedear. Documentar en `documentation.md §Migraciones`.

---

## F-02 — `RequiresSameArea` silenciosamente ignorado

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🔴 Crítica |
| **Ubicación** | `PreviewHomologationHandler.cs:192-215` |

### Causa raíz

```csharp
// Regla 3: ¿Misma área de formación?
if (rule.RequiresSameArea && subject.Area != equivalence.SourceSubjectCode)
{
    // Comparamos el área del historial del estudiante
    // ...15 líneas de comentarios sin instrucción...
}
```

El `if` tiene bloque **vacío** — la condición se evalúa y se descarta. Adicionalmente la comparación `subject.Area != equivalence.SourceSubjectCode` compara el **área** de la materia (`"BASIC"`, `"SPECIFIC"`, `"COMPLEMENTARY"`) contra el **código** de la asignatura origen (p.ej. `"MAT101"`) — siempre será distinto.

`SubjectEquivalence` no tiene campo `Area` (`Gradus.Domain/Entities/SubjectEquivalence.cs` — revisado). Para implementar la regla hace falta:
- Añadir `SourceArea`/`TargetArea` a `SubjectEquivalence` (o a `HomologationRule`).
- O rechazar homologaciones donde `subject.Area != equivalence.ExpectedArea`.

### Reproducción

Crear una `HomologationRule` con `RequiresSameArea = true`, una `SubjectEquivalence` donde `SourceSubjectCode = "MAT101"` que homologa una materia de área `BASIC` contra una del destino en área `COMPLEMENTARY`. Ejecutar preview: la materia aparece como `Homologable` a pesar de la regla.

### Solución

**Paso 1** — extender `SubjectEquivalence` con el área:

```csharp
// Domain/Entities/SubjectEquivalence.cs
public string SourceArea { get; private set; } = string.Empty;
public string TargetArea { get; private set; } = string.Empty;

public static SubjectEquivalence Create(
    ...,
    string sourceArea,
    string targetArea,
    ...)
{
    // validar áreas
    ArgumentException.ThrowIfNullOrWhiteSpace(sourceArea);
    ArgumentException.ThrowIfNullOrWhiteSpace(targetArea);
    return new SubjectEquivalence { ..., SourceArea = sourceArea.Trim().ToUpper(), TargetArea = targetArea.Trim().ToUpper() };
}
```

**Paso 2** — migración EF para agregar las dos columnas.

**Paso 3** — reemplazar el bloque L192-215:

```csharp
// Regla 3: misma área cuando la regla lo exige
if (rule.RequiresSameArea &&
    !string.Equals(subject.Area, equivalence.SourceArea, StringComparison.OrdinalIgnoreCase))
{
    rejected.Add(HomologationSubject.CreateRejected(
        Guid.Empty,
        subject.Code, subject.Name, grade, subject.Credits, subject.Area,
        equivalence.TargetSubjectCode, equivalence.TargetSubjectName, equivalence.TargetCredits,
        RejectionReason.DifferentArea));
    continue;
}
```

**Paso 4** — test unitario que cubra los 3 casos: área coincide / no coincide con flag on / flag off.

---

## F-03 — Cálculo de `maxCredits` con bug de precedencia

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟠 Alta (código muerto, pero encubre confusión futura) |
| **Ubicación** | `PreviewHomologationHandler.cs:234-239` |

### Causa raíz

```csharp
var maxCredits = (int)
    Math.Floor(
        rule.MaxCreditsPercentage / 100.0 * rule.SubjectEquivalences.Count > 0
            ? rule.MaxCreditsPercentage / 100.0 * equivalences.Sum(e => e.TargetCredits)
            : double.MaxValue
    );
```

Por precedencia C#, esto se lee como:

```csharp
((rule.MaxCreditsPercentage / 100.0 * rule.SubjectEquivalences.Count) > 0)
    ? ...
    : double.MaxValue
```

El condicional pretende ser `(rule.SubjectEquivalences.Count > 0)` — paréntesis mal colocados. Adicionalmente `rule.SubjectEquivalences` está vacío (EF no lo carga: el `Include` no se aplica en `EquivalenceRepository.GetRuleAsync`), por lo que la rama del `?` evalúa siempre `false` → `maxCredits = double.MaxValue → int overflow`. **Nada depende de `maxCredits`** — se descarta inmediatamente por `maxAllowedCredits` recalculado en L244-246.

### Reproducción

Poner un breakpoint en L240: `maxCredits` siempre vale `int.MaxValue` debido al cast desde `double.MaxValue`. El código de abajo (L244-290) hace el cálculo correcto independientemente.

### Solución

Eliminar L233-239 completamente:

```csharp
// PreviewHomologationHandler.cs — reemplazar L233-246 por:

// ── 7. Aplicar límite de créditos homologables ──────────────────
var targetTotalCredits = equivalences.Sum(e => e.TargetCredits);
var maxAllowedCredits = (int)Math.Floor(rule.MaxCreditsPercentage / 100.0 * targetTotalCredits);
var totalCreditsHomologable = homologable.Sum(s => s.SourceCredits);
```

---

## F-04 — `foreach` vacío con comentario

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟢 Baja (código muerto) |
| **Ubicación** | `PreviewHomologationHandler.cs:311-315` |

### Causa raíz

```csharp
var allSubjects = homologable.Concat(rejected).ToList();
foreach (var s in allSubjects)
{
    // Recrear con el ID correcto de la solicitud
}
```

`allSubjects` se materializa (`ToList`) pero el loop no hace nada. La "recreación" se efectúa en L318-349 con otros dos `Select` (`finalHomologable`, `finalRejected`). El loop es un fragmento abandonado. Ver F-13 para el problema subyacente (doble construcción).

### Solución

```csharp
// Eliminar L311-316 completo.
```

---

## F-05 — `new HttpClient()` manual para token M2M

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟠 Alta |
| **Ubicación** | `Gradus.Infrastructure/ExternalServices/UniversitasClient.cs:176-177` |

### Causa raíz

```csharp
using var tokenClient = new HttpClient();
var response = await tokenClient.PostAsync(tokenEndpoint, body, ct);
```

Antipatrón documentado por Microsoft desde 2016: `new HttpClient()` bajo carga alta agota puertos efímeros (TIME_WAIT), ya que el `SocketsHttpHandler` subyacente no se reutiliza. Adicionalmente:
- Sin resilience (`AddStandardResilienceHandler` aplica solo al cliente tipado de Universitas).
- Sin pool, sin `IHttpClientFactory`, sin telemetría unificada.

La clase ya recibe un `HttpClient` vía constructor (L13) gestionado por factory — pero lo ignora para el token endpoint.

### Reproducción

Simular 1000 preview concurrentes con token cache miss (Redis vacío):

```bash
redis-cli FLUSHALL
ab -n 1000 -c 50 -p body.json -T application/json http://localhost:5000/api/homologations/preview
# → netstat -an | grep TIME_WAIT | wc -l → varios miles
```

### Solución

Ver `vulnerabilities.md §API-10` para la versión endurecida (con no-logging del secret). Resumen de firma:

```csharp
// Gradus.Infrastructure/DependencyInjection.cs
services.AddHttpClient("AzureAdToken", c =>
{
    c.BaseAddress = new Uri("https://login.microsoftonline.com/");
    c.Timeout = TimeSpan.FromSeconds(10);
})
.AddStandardResilienceHandler();

// UniversitasClient.cs — inyectar IHttpClientFactory
public UniversitasClient(
    HttpClient httpClient,
    IHttpClientFactory httpFactory,
    IDistributedCache cache,
    IOptions<UniversitasOptions> options,
    ILogger<UniversitasClient> logger) { ... _httpFactory = httpFactory; ... }

private async Task<M2MTokenResponse> RequestNewTokenAsync(CancellationToken ct)
{
    var client = _httpFactory.CreateClient("AzureAdToken");
    var path = $"{_options.TenantId}/oauth2/v2.0/token";
    var body = new FormUrlEncodedContent(new Dictionary<string, string>
    {
        ["grant_type"]    = "client_credentials",
        ["client_id"]     = _options.ClientId,
        ["client_secret"] = _options.ClientSecret,
        ["scope"]         = _options.Scope
    });
    using var response = await client.PostAsync(path, body, ct);
    response.EnsureSuccessStatusCode();
    return await response.Content.ReadFromJsonAsync<M2MTokenResponse>(JsonOptions, ct)
        ?? throw new UniversitasClientException("Respuesta de token vacía de Azure AD.");
}
```

---

## F-06 — 4 `SaveChangesAsync` sin transacción

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🔴 Crítica |
| **Ubicación** | `Gradus.Application/Commands/ReviewHomologation/ReviewHomologationHandler.cs:44-127` |

### Causa raíz

Camino feliz de aprobación ejecuta:

| # | Línea | Operación | Efecto |
|---|-------|-----------|:-:|
| 1 | 45-46 | `UpdateAsync` + `SaveChangesAsync` (Pending → Reviewing) | commit |
| 2 | 67-68 | `UpdateAsync` + `SaveChangesAsync` (Reviewing → Approved) | commit |
| 3 | 85-86 | `UpdateAsync` + `SaveChangesAsync` (SetDocumentReady) | commit |
| 4 | 103 → `NotificationService.cs:53-54` | `AddAsync` + `SaveChangesAsync` (Notification persistida) | commit |

Cuatro transacciones físicas independientes. Si el proceso muere entre #2 y #3 (OOM, pod kill, DB lag), la solicitud queda `Approved` sin `DocumentUrl`, estado que el dominio no permite crear desde cero (`SetDocumentReady` valida `Approved` → OK para replay, pero sin contexto humano que identifique qué PDFs faltan).

Si #4 falla después de #3, la aprobación quedó commiteada pero el estudiante nunca se entera — requiere un job de reconciliación que hoy no existe.

### Reproducción

```csharp
// Arnés de test con WebApplicationFactory + Npgsql container
// Simular fallo tras save #2:
// - Aprobar solicitud
// - En el hook de IDocumentService, lanzar Exception
// - Verificar que request.Status == Approved pero DocumentUrl == null
// - Reintentar /review con el mismo requestId → InvalidOperationException: "Solo se puede aprobar en estado Reviewing"
```

### Solución

Introducir `IUnitOfWork` y `UnitOfWorkBehavior` (pipeline MediatR que envuelve commands en transacción):

```csharp
// Gradus.Domain/Interfaces/IUnitOfWork.cs
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> work, CancellationToken ct = default);
}

// Gradus.Infrastructure/Persistence/EfUnitOfWork.cs
public sealed class EfUnitOfWork : IUnitOfWork
{
    private readonly GradusDbContext _db;

    public EfUnitOfWork(GradusDbContext db) => _db = db;

    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> work, CancellationToken ct = default)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async token =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(token);
            await work(token);
            await _db.SaveChangesAsync(token);
            await tx.CommitAsync(token);
        }, ct);
    }
}
```

Remover `SaveChangesAsync` de cada repositorio (ver `architecture.md §5.2`), reescribir handler:

```csharp
public async Task<ReviewHomologationResponse> Handle(
    ReviewHomologationCommand command, CancellationToken ct)
{
    var request = await _requests.GetByIdWithSubjectsAsync(command.RequestId, ct)
        ?? throw new InvalidOperationException($"No se encontró la solicitud {command.RequestId}.");

    await _uow.ExecuteInTransactionAsync(async token =>
    {
        if (request.Status == HomologationStatus.Pending)
            request.StartReview(command.CoordinatorAzureOid);

        foreach (var ov in command.SubjectOverrides ?? [])
            request.OverrideSubject(ov.SubjectId, ov.IsHomologable, command.CoordinatorAzureOid, ov.Notes);

        if (command.Approve)
        {
            request.Approve(command.CoordinatorAzureOid, command.CoordinatorNotes);

            // Generación de documento: SÍNCRONA respecto a la transacción de negocio
            // pero puede separarse a un outbox si se prefiere eventual consistency
            var url = await _documents.GenerateHomologationDocumentAsync(request, token);
            request.SetDocumentReady(url);
        }
        else
        {
            request.Reject(command.CoordinatorAzureOid, command.CoordinatorNotes);
        }

        _requests.Update(request);
    }, ct);

    // Notificaciones FUERA de la transacción de negocio (outbox-light):
    await _notifications.NotifyAsync(
        recipientAzureOid: request.StudentAzureOid,
        title: command.Approve ? "¡Solicitud aprobada!" : "Solicitud no aprobada",
        message: BuildMessage(request, command),
        type: command.Approve ? NotificationType.HomologationApproved : NotificationType.HomologationRejected,
        referenceId: request.Id,
        ct: ct);

    return new ReviewHomologationResponse(request.Id, request.Status.ToString(), "…");
}
```

**Nota sobre PDF dentro de la transacción:** `QuestPdfDocumentService` escribe al filesystem — idempotente si el filename usa `request.Id`. Si se mueve a Azure Blob, usar `PutObject` con `IfNoneMatch:*` para garantizar idempotencia. Aceptable envolver en la misma transacción porque el retry del execution strategy (`EnableRetryOnFailure`) puede reintentar sin side-effects duplicados.

---

## F-07 — `try/catch` alrededor de `GenerateDocument` enmascara inconsistencia

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟡 Media |
| **Ubicación** | `ReviewHomologationHandler.cs:77-100` |

### Causa raíz

```csharp
try
{
    var documentUrl = await _documents.GenerateHomologationDocumentAsync(request, cancellationToken);
    request.SetDocumentReady(documentUrl);
    await _requests.UpdateAsync(request, cancellationToken);
    await _requests.SaveChangesAsync(cancellationToken);
}
catch (Exception ex)
{
    _logger.LogError(ex, "Error al generar el documento para solicitud {Id}. La solicitud quedó en estado Approved.", request.Id);
    // No fallamos el flujo completo si el PDF falla
}
```

- Captura `Exception` base — esconde OOM, Stack overflow, TaskCanceled, cualquier cosa.
- Deja la solicitud en `Approved` sin `DocumentUrl` — estado válido en el dominio pero **sin mecanismo de reintento** documentado ni queue de compensación.
- La respuesta retornada al coordinador (`$"Documento generado"` L120) **miente**: asegura que se generó aunque la excepción haya saltado.

### Reproducción

Mockear `IDocumentService` para lanzar `IOException`. Revisar: respuesta HTTP = 200 con body que dice "Documento generado", pero `DocumentUrl IS NULL` en DB.

### Solución

Incluir generación dentro de la transacción (ver F-06) + diferenciar excepciones + responder verdad:

```csharp
// Dentro del ExecuteInTransactionAsync del F-06:
try
{
    var url = await _documents.GenerateHomologationDocumentAsync(request, token);
    request.SetDocumentReady(url);
}
catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
{
    // Error IO de filesystem → no falla la aprobación, pero se agenda regeneración
    _logger.LogError(ex, "PDF falló para {Id} — la aprobación queda commiteada y se agendará regeneración", request.Id);
    await _pdfRetryQueue.EnqueueAsync(request.Id, token);   // outbox/Hangfire/Quartz
}
// Otros Exception: dejar propagar → la transacción hace rollback y el coordinador obtiene 500.

return new ReviewHomologationResponse(
    RequestId: request.Id,
    Status: request.Status.ToString(),
    Message: request.Status == HomologationStatus.DocumentReady
        ? "Aprobada. Documento listo para descarga."
        : "Aprobada. Documento en generación — recibirás una notificación cuando esté listo.");
```

---

## F-08 — Destinatario de coordinador hardcoded

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟡 Media |
| **Ubicación** | `Gradus.Application/Commands/SubmitHomologation/SubmitHomologationHandler.cs:18, 70` |

### Causa raíz

```csharp
private const string CoordinatorGroupOid = "coordinator-group";
...
await _notifications.NotifyAsync(
    recipientAzureOid: CoordinatorGroupOid, ...);
```

No existe ningún usuario ni grupo con OID `"coordinator-group"`:
- SignalR intenta enviar al grupo de SignalR con ese nombre — **nadie está suscrito**, el mensaje se descarta.
- `NotificationRepository.AddAsync` persiste una `Notification` con `RecipientAzureOid = "coordinator-group"` — queda huérfana en la DB.
- `NotificationService.cs:100-106` si el tipo dispara email, intenta enviar a `"coordinator-group@politecnicointernacionaldev.onmicrosoft.com"` → ver F-19.

### Solución

Abstraer la resolución de destinatarios:

```csharp
// Gradus.Application/Common/Interfaces/IRecipientResolver.cs
public interface IRecipientResolver
{
    Task<IReadOnlyList<string>> GetCoordinatorOidsAsync(
        string targetProgramCode, CancellationToken ct = default);
}
```

Implementación simple (base de datos de coordinadores, o Azure AD Graph API si se usa grupos AAD):

```csharp
// Gradus.Infrastructure/Notifications/AadGroupRecipientResolver.cs
public sealed class AadGroupRecipientResolver : IRecipientResolver
{
    private readonly ICoordinatorRepository _coordinators;

    public AadGroupRecipientResolver(ICoordinatorRepository coords) => _coordinators = coords;

    public async Task<IReadOnlyList<string>> GetCoordinatorOidsAsync(
        string targetProgramCode, CancellationToken ct = default)
    {
        // Los coordinadores se mantienen en tabla 'coordinators' con columna 'managed_program_codes TEXT[]'
        return await _coordinators.GetByProgramAsync(targetProgramCode, ct);
    }
}

// SubmitHomologationHandler.cs
var recipients = await _recipientResolver.GetCoordinatorOidsAsync(request.TargetProgramCode, ct);
foreach (var oid in recipients)
{
    await _notifications.NotifyAsync(
        recipientAzureOid: oid,
        title: "Nueva solicitud de homologación",
        message: $"{request.StudentName} envió una solicitud …",
        type: NotificationType.HomologationSubmitted,
        referenceId: request.Id,
        ct: ct);
}
```

**Mientras el modelo de coordinadores no exista**, el handler debe fallar explícitamente en vez de persistir basura:

```csharp
if (!recipients.Any())
    throw new InvalidOperationException(
        $"No hay coordinadores configurados para el programa {request.TargetProgramCode}.");
```

---

## F-09 — Race condition en `HttpClient.DefaultRequestHeaders.Authorization`

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟠 Alta |
| **Ubicación** | `Gradus.Infrastructure/ExternalServices/UniversitasClient.cs:79-82` |

### Causa raíz

```csharp
var token = await GetOrRefreshTokenAsync(ct);
_httpClient.DefaultRequestHeaders.Authorization =
    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

var response = await _httpClient.GetAsync(path, ct);
```

Aunque `HttpClient` tipado registrado con `AddHttpClient<>` crea una nueva instancia por construcción del servicio consumidor (Transient en este caso), el `HttpMessageHandler` subyacente **se reutiliza** via `IHttpClientFactory`. Mutar `DefaultRequestHeaders` del cliente es correcto para esta instancia, pero:

1. Si se introduce en el futuro una segunda llamada concurrente desde el mismo `UniversitasClient` (p.ej. `Task.WhenAll(GetProfile, GetHistory)` como hace el handler de preview en L42-52 si se optimizara), ambas comparten el `DefaultRequestHeaders` → race al mutar + enviar.
2. El patrón correcto con `HttpClient` es **setear el header por request**, no en `Default*`.

Actualmente `PreviewHomologationHandler` serializa las dos llamadas (`await` seguidos) — el bug no se manifiesta, pero está latente.

### Reproducción

```csharp
// Test que reproduce el riesgo latente:
var profileTask  = client.GetStudentProfileAsync("101", ct);
var historyTask  = client.GetStudentHistoryAsync("202", ct);
await Task.WhenAll(profileTask, historyTask);
// Con tokens diferentes (simulados), intercalar llamadas → 1 de 2 sale con header del otro.
```

### Solución

Usar `HttpRequestMessage` por petición:

```csharp
private async Task<T?> GetAsync<T>(string path, string identity, CancellationToken ct)
{
    var token = await GetOrRefreshTokenAsync(ct);

    using var req = new HttpRequestMessage(HttpMethod.Get, path);
    req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

    using var response = await _httpClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
    ...
}
```

O definir un `DelegatingHandler`:

```csharp
public sealed class M2MAuthHandler : DelegatingHandler
{
    private readonly IM2MTokenProvider _tokens;
    public M2MAuthHandler(IM2MTokenProvider tokens) => _tokens = tokens;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        var token = await _tokens.GetAsync(ct);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await base.SendAsync(request, ct);
    }
}

// DI:
services.AddTransient<M2MAuthHandler>();
services.AddHttpClient<IUniversitasClient, UniversitasClient>(...)
    .AddHttpMessageHandler<M2MAuthHandler>()
    .AddStandardResilienceHandler();
```

---

## F-10 — `UpdateAsync` devuelve `Task.CompletedTask` con firma async

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟡 Media |
| **Ubicación** | `Gradus.Infrastructure/Persistence/Repositories/HomologationRepository.cs:83-87`; `EquivalenceRepository.cs:61-65, 75-82`; `NotificationRepository.*` (sigue mismo patrón) |

### Causa raíz

```csharp
public Task UpdateAsync(HomologationRequest request, CancellationToken ct = default)
{
    _db.HomologationRequests.Update(request);
    return Task.CompletedTask;
}
```

La firma promete operación asíncrona — no lo es. Costo: confusión del caller, `await` innecesario, y ocultar que `EF.Update` es síncrono puede llevar a asumir que hace I/O.

### Solución

**Opción A (mínima):** renombrar a `Update`:

```csharp
// Domain/Interfaces/IHomologationRepository.cs
void Update(HomologationRequest request);

// Infrastructure
public void Update(HomologationRequest request) => _db.HomologationRequests.Update(request);
```

**Opción B (mejor):** con `IUnitOfWork` (ver F-06) los repos solo exponen `Add/Update/Remove` síncronos, y el save async vive en `IUnitOfWork.SaveChangesAsync`.

---

## F-11 — Queries de lectura sin `AsNoTracking`

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟠 Alta (performance) |
| **Ubicación** | `HomologationRepository.cs:17-52, 68-75`; `EquivalenceRepository.cs:16-54` |

### Causa raíz

Todas las queries de lectura devuelven entidades **rastreadas** por el `ChangeTracker`:

```csharp
return await _db.HomologationRequests.FirstOrDefaultAsync(r => r.Id == id, ct);
return await _db.HomologationRequests.Where(r => r.StudentIdentity == id).OrderByDescending(r => r.CreatedAt).ToListAsync(ct);
```

Los handlers de query (`GetMyRequestsHandler`, `GetPendingRequestsHandler`) solo arman DTOs — **no mutan**. El tracking:

- Reserva memoria por proxy por cada entidad y cada navegación.
- Si el handler persiste algo más (p.ej. auditoría), `SaveChanges` revisaría las entidades rastreadas buscando cambios → overhead.

### Reproducción

```csharp
// Benchmark GetPendingRequestsHandler con 500 requests en DB:
BenchmarkRunner.Run<PendingBenchmark>();
// Con tracking:    ~18ms, 4.2 MB alloc
// Con NoTracking:  ~7ms,  1.1 MB alloc
```

### Solución

**Opción A** — flag por repo:

```csharp
public async Task<IReadOnlyList<HomologationRequest>> GetByStatusAsync(
    HomologationStatus status, CancellationToken ct = default)
{
    return await _db.HomologationRequests
        .AsNoTracking()
        .Where(r => r.Status == status)
        .OrderByDescending(r => r.CreatedAt)
        .ToListAsync(ct);
}
```

**Opción B (preferida)** — partir el repo en lector/escritor (ver `architecture.md §4.4`):

```csharp
public sealed class HomologationReader : IHomologationReader
{
    private readonly GradusDbContext _db;
    public HomologationReader(GradusDbContext db) => _db = db;

    private IQueryable<HomologationRequest> Query()
        => _db.HomologationRequests.AsNoTracking();

    public Task<HomologationRequest?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => Query().FirstOrDefaultAsync(r => r.Id == id, ct);
    ...
}
```

**Opción C** — proyección directa a DTO (óptimo, evita materializar el agregado):

```csharp
// GetPendingRequestsHandler.cs
return await _db.HomologationRequests
    .AsNoTracking()
    .Where(r => r.Status == HomologationStatus.Pending || r.Status == HomologationStatus.Reviewing)
    .OrderByDescending(r => r.CreatedAt)
    .Select(r => new PendingRequestDto(
        r.Id, r.StudentName, r.StudentCode,
        r.SourceProgramCode, r.TargetProgramCode, r.Status.ToString(),
        r.TotalSubjectsApproved, r.TotalCreditsHomologated, r.CreatedAt))
    .ToListAsync(ct);
```

Ver `improvements.md §Performance` para estrategia completa (paginación + compiled queries).

---

## F-12 — Estados de Universitas comparados como strings

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟡 Media |
| **Ubicación** | `PreviewHomologationHandler.cs:112-115, 142` |

### Causa raíz

```csharp
.OrderByDescending(s =>
    s.Status == "PASSED" ? 2
    : s.Status == "IN_PROGRESS" ? 1
    : 0)
...
if (subject.Status != "PASSED") continue;
```

Estados de Universitas (`"PASSED"`, `"IN_PROGRESS"`, `"FAILED"`, `"WITHDRAWN"`) se comparan como strings. Un typo, un cambio de case en el upstream (`"Passed"`), o un nuevo estado hace que materias válidas sean descartadas sin ningún warning.

### Solución

Mapear a enum de dominio (alineado con el refactor V-1 de `architecture.md`):

```csharp
// Domain/ValueObjects/SubjectOutcome.cs (parte del refactor de DTOs)
public enum SubjectOutcome { Passed, InProgress, Failed, Withdrawn }

// Infrastructure/ExternalServices/UniversitasMapper.cs
internal static SubjectOutcome MapOutcome(string raw) => raw switch
{
    "PASSED"      => SubjectOutcome.Passed,
    "IN_PROGRESS" => SubjectOutcome.InProgress,
    "FAILED"      => SubjectOutcome.Failed,
    "WITHDRAWN"   => SubjectOutcome.Withdrawn,
    _             => throw new UniversitasClientException($"Estado desconocido: '{raw}'")
};

// PreviewHomologationHandler.cs
if (subject.Outcome != SubjectOutcome.Passed) continue;

.OrderByDescending(s => s.Outcome switch
{
    SubjectOutcome.Passed     => 2,
    SubjectOutcome.InProgress => 1,
    _                         => 0
})
```

El `throw` en el default convierte un cambio contractual silencioso de Universitas en un error ruidoso y trazable.

---

## F-13 — Doble construcción de `HomologationSubject`

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟡 Media |
| **Ubicación** | `PreviewHomologationHandler.cs:148-230, 317-349` |

### Causa raíz

Cada materia se construye dos veces: primero con `HomologationRequestId = Guid.Empty` (L152, 178, 218-230, 272-285), luego se recrea con el ID real en L318-349. Motivo: la `HomologationRequest` se crea en L299 **después** de evaluar, por lo que al momento de evaluar no hay ID.

Efectos: allocaciones duplicadas, `Guid.Empty` expuesto temporalmente en objetos del dominio (ruptura conceptual: una entidad inválida existe en memoria).

### Solución

Diferir creación de `HomologationSubject` hasta que la request exista, o generar el `Guid` del request al inicio:

```csharp
// Opción A — generar el Guid primero, crear subjects de una vez:
var draftId = Guid.NewGuid();

// reemplazar Guid.Empty por draftId en todas las factorías
homologable.Add(HomologationSubject.CreateApproved(
    draftId, ...));

// Luego crear el HomologationRequest con ese mismo Guid:
var draftRequest = HomologationRequest.CreateDraft(draftId, ...); // nueva sobrecarga que acepta Id

// Eliminar el segundo pass de Select L318-349
draftRequest.AddSubjects(homologable.Concat(rejected));
```

Requiere sobrecarga adicional en `HomologationRequest.CreateDraft` que acepte un `Guid` pre-existente:

```csharp
public static HomologationRequest CreateDraft(
    Guid id,
    string studentIdentity, ...)
{
    ArgumentException.ThrowIfNullOrWhiteSpace(studentIdentity);
    if (id == Guid.Empty) throw new ArgumentException("Id no puede ser vacío.", nameof(id));
    return new HomologationRequest { Id = id, ... };
}
```

**Opción B** — mantener dos pasadas pero usando **builder de dominio** (`HomologationEvaluator` de `architecture.md §4.1`) que devuelve `EvaluationResult` con estructuras DTO puras + un método `Materialize(requestId)` que las convierte a `HomologationSubject`.

---

## F-14 — `DbUpdateException` no se mapea a 409

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟠 Alta |
| **Ubicación** | `Gradus.API/Middleware/ExceptionHandlingMiddleware.cs:71-107` |

### Causa raíz

El middleware maneja `ValidationException → 400`, `UnauthorizedAccessException → 403`, `InvalidOperationException → 409`. Todo lo demás cae a `catch (Exception) → 500`. No distingue:

- `Microsoft.EntityFrameworkCore.DbUpdateException` (violación de unique constraint, FK, check constraint).
- `Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException` (concurrencia optimista — no configurada hoy, pero debería).
- `OperationCanceledException` vía `CancellationToken` (cliente aborta) → hoy loguea stack trace gigante como 500.

### Reproducción

Disparar dos requests concurrentes de preview con el mismo par `(studentIdentity, sourceProgramCode, targetProgramCode)` — la verificación L64-76 es TOCTOU contra un constraint inexistente → ambas entran. Cuando se añada `UNIQUE (student_identity, source_program_code, target_program_code) WHERE status IN ('Draft','Pending','Reviewing')` (ver `improvements.md §DB`), una de las dos recibirá `DbUpdateException` mapeada como 500.

### Solución

```csharp
// ExceptionHandlingMiddleware.cs — añadir antes del catch(Exception) genérico:

catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException ex)
{
    _logger.LogWarning(ex, "Conflicto de concurrencia");
    await WriteError(context, 409, "ConcurrencyConflict",
        "El recurso fue modificado por otra operación. Recarga y reintenta.");
}
catch (Microsoft.EntityFrameworkCore.DbUpdateException ex) when (IsUniqueViolation(ex))
{
    _logger.LogWarning(ex, "Violación de unicidad");
    await WriteError(context, 409, "Conflict",
        "Ya existe un recurso con los mismos valores únicos.");
}
catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
{
    _logger.LogDebug("Request abortada por el cliente");
    context.Response.StatusCode = 499;   // Client Closed Request (convención nginx)
}
```

```csharp
private static bool IsUniqueViolation(DbUpdateException ex)
    => ex.InnerException is Npgsql.PostgresException pg && pg.SqlState == "23505";

private static Task WriteError(HttpContext ctx, int status, string type, string title)
{
    ctx.Response.StatusCode = status;
    ctx.Response.ContentType = "application/json";
    return ctx.Response.WriteAsync(JsonSerializer.Serialize(new { type, title, status }));
}
```

---

## F-15 — `MigrateAsync` sin lock en arranque concurrente

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟡 Media |
| **Ubicación** | `Program.cs:109-113` |

### Causa raíz

```csharp
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<GradusDbContext>();
    await db.Database.MigrateAsync();
    ...
}
```

Si dos instancias arrancan simultáneamente (replicas en compose, test runner paralelo), ambas intentan aplicar migraciones → race en `__ef_migrations_history` → excepciones aleatorias, en el peor caso esquema parcialmente aplicado.

Aunque el bloque está en `IsDevelopment()`, entornos de testing que corren multi-proceso (xUnit `[Collection]` + WebApplicationFactory) reproducen el issue.

### Solución

**Opción A (preferida):** sacar migraciones del arranque (ver `vulnerabilities.md §API-16`).

**Opción B:** advisory lock de Postgres durante la migración:

```csharp
if (args.Contains("--migrate"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<GradusDbContext>();
    var conn = db.Database.GetDbConnection();
    await conn.OpenAsync();

    // pg_advisory_lock — clave arbitraria estable (hash del nombre de la app)
    await using (var cmd = conn.CreateCommand())
    {
        cmd.CommandText = "SELECT pg_advisory_lock(0xC4A0)";
        await cmd.ExecuteNonQueryAsync();
    }
    try
    {
        await db.Database.MigrateAsync();
    }
    finally
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT pg_advisory_unlock(0xC4A0)";
        await cmd.ExecuteNonQueryAsync();
    }
    return;
}
```

---

## F-16 — `GeneratePdf` sincrónico en método async

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟡 Media |
| **Ubicación** | `Gradus.Infrastructure/Documents/QuestPdfDocumentService.cs:34-42` |

### Causa raíz

```csharp
public async Task<string> GenerateHomologationDocumentAsync(
    HomologationRequest request, CancellationToken ct = default)
{
    ...
    var document = new HomologationDocument(request);
    document.GeneratePdf(filePath);   // ← sincrónico, bloquea el threadpool
    ...
    return await Task.FromResult(documentUrl);  // ← "fake async"
}
```

`QuestPDF` ofrece `GeneratePdfAsync` desde 2024. El método actual:
- Bloquea un thread del pool durante ~50-500ms por PDF (depende del tamaño).
- Ignora `CancellationToken` — un coordinador cancelando la request continúa renderizando.

### Solución

```csharp
public async Task<string> GenerateHomologationDocumentAsync(
    HomologationRequest request, CancellationToken ct = default)
{
    _logger.LogInformation("Generando documento PDF para solicitud {Id}", request.Id);

    var fileName = $"homologacion-{request.Id}.pdf";
    var filePath = Path.Combine(_outputDirectory, fileName);

    var document = new HomologationDocument(request);
    await document.GeneratePdfAsync(filePath, ct);   // QuestPDF 2024+

    var documentUrl = $"/documents/{fileName}";
    _logger.LogInformation("Documento generado: {Path}", filePath);
    return documentUrl;
}
```

Si la versión instalada de QuestPDF (`2026.2.4`) no expone `GeneratePdfAsync` (verificar API), envolver con `Task.Run` + soporte de cancelación:

```csharp
await Task.Run(() =>
{
    ct.ThrowIfCancellationRequested();
    document.GeneratePdf(filePath);
}, ct);
```

---

## F-17 — `Directory.CreateDirectory` en constructor

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟡 Media |
| **Ubicación** | `QuestPdfDocumentService.cs:16-22` |

### Causa raíz

```csharp
public QuestPdfDocumentService(ILogger<QuestPdfDocumentService> logger)
{
    _logger = logger;
    _outputDirectory = Path.Combine(Directory.GetCurrentDirectory(), "documents");
    Directory.CreateDirectory(_outputDirectory);
}
```

- Side-effect en constructor (crea directorio en disco).
- Hardcodeado a `Directory.GetCurrentDirectory()`. En containers con `/app` como CWD, funciona; en `dotnet test` → corre contra directorio del runner; en Windows service → variable.
- Falla si el proceso no tiene permisos de escritura — excepción en DI container init, no en runtime del endpoint.

### Solución

```csharp
// Gradus.Infrastructure/Configuration/DocumentStorageOptions.cs
public sealed class DocumentStorageOptions
{
    public const string SectionName = "DocumentStorage";
    public string RootDirectory { get; set; } = "documents";
    public bool CreateIfMissing { get; set; } = true;
}

// DependencyInjection.cs
services.Configure<DocumentStorageOptions>(configuration.GetSection(DocumentStorageOptions.SectionName));

// QuestPdfDocumentService.cs
public QuestPdfDocumentService(
    IOptions<DocumentStorageOptions> options,
    IHostEnvironment env,
    ILogger<QuestPdfDocumentService> logger)
{
    _logger = logger;
    var opt = options.Value;
    _outputDirectory = Path.IsPathRooted(opt.RootDirectory)
        ? opt.RootDirectory
        : Path.Combine(env.ContentRootPath, opt.RootDirectory);
}

public async Task<string> GenerateHomologationDocumentAsync(...)
{
    // Crear el directorio perezosamente, en el único lugar que importa.
    Directory.CreateDirectory(_outputDirectory);
    ...
}
```

Mejor aún: abstracción `IDocumentStorage` → permite swap a Azure Blob sin tocar al `QuestPdfDocumentService`.

---

## F-18 — `NotificationService` traga fallos de SignalR

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟡 Media |
| **Ubicación** | `Gradus.Infrastructure/Notifications/NotificationService.cs:64-92` |

### Causa raíz

```csharp
try
{
    await _realtimeNotifier.SendToUserAsync(...);
}
catch (Exception ex)
{
    _logger.LogWarning(ex, "Error al enviar notificación SignalR a {Recipient}. La notificación quedó persistida en DB.", recipientAzureOid);
}
```

Si SignalR gateway está caído, el caller cree que la notificación se entregó. No hay:
- Métricas de `signalr_send_failed` para alertar.
- Outbox que reintente enviar cuando recupere conexión.

Similar bloque en L107-111 para email.

### Solución

Emitir métrica + categorizar excepciones esperadas:

```csharp
// Gradus.Infrastructure/Notifications/NotificationService.cs
private static readonly Meter Meter = new("Gradus.Notifications", "1.0");
private static readonly Counter<long> SignalRFailures =
    Meter.CreateCounter<long>("gradus_signalr_send_failed_total");

...
catch (HubException ex)
{
    _logger.LogWarning(ex, "SignalR no pudo entregar a {Recipient} — persistida en DB, se verá al reconectar.", recipientAzureOid);
    SignalRFailures.Add(1);
}
catch (Exception ex)
{
    _logger.LogError(ex, "Fallo inesperado SignalR a {Recipient}.", recipientAzureOid);
    SignalRFailures.Add(1);
    throw;   // inesperado → propagar
}
```

Estrategia completa requiere Outbox (tabla `notification_outbox` con reintentos), fuera de alcance de este fix puntual — ver `improvements.md §Observabilidad`.

---

## F-19 — Email del coordinador mal formado

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟢 Baja |
| **Ubicación** | `NotificationService.cs:100-106` |

### Causa raíz

```csharp
toEmail: $"{recipientAzureOid}@politecnicointernacionaldev.onmicrosoft.com",
toName: recipientAzureOid,
```

Construye un email del formato `{OID}@tenant.onmicrosoft.com`. Un Azure OID es un GUID (`dc5b2439-1ae1-494a-9640-47ae1180d6ad`) — la dirección `dc5b2439-…@politecnicointernacionaldev.onmicrosoft.com` **no existe** en el tenant (Azure AD mantiene `userPrincipalName` o `mail`, no el OID). Combinado con F-08, para coordinadores resulta en `coordinator-group@politecnicointernacionaldev.onmicrosoft.com` — también ficticio.

El `StubEmailService` actual solo loguea — no hay daño observable hoy, pero ensamblar un `ISmtpClient` real y enviar a esa dirección fallaría o generaría bounces.

### Solución

Resolver el email vía Azure AD Graph API o mantenerlo en la tabla `coordinators` / `students`:

```csharp
// Domain/Interfaces/IUserDirectory.cs
public interface IUserDirectory
{
    Task<UserContact?> GetByAzureOidAsync(string azureOid, CancellationToken ct = default);
}

public sealed record UserContact(string AzureOid, string DisplayName, string Email);

// NotificationService.cs
var contact = await _userDirectory.GetByAzureOidAsync(recipientAzureOid, ct);
if (contact is null)
{
    _logger.LogWarning("No se pudo resolver contacto de {OID} — email omitido.", recipientAzureOid);
    return;
}
await _emailService.SendAsync(
    toEmail: contact.Email,
    toName:  contact.DisplayName,
    subject: title,
    htmlBody: BuildEmailHtml(title, message, referenceId),
    ct: ct);
```

---

## F-20 — Cache stampede en token M2M

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟠 Alta (al escalar) |
| **Ubicación** | `Gradus.Infrastructure/ExternalServices/UniversitasClient.cs:121-158` |

### Causa raíz

```csharp
var cached = await _cache.GetStringAsync(TokenCacheKey, ct);
if (!string.IsNullOrEmpty(cached)) return cached;

// Sin lock → todas las peticiones concurrentes con cache miss solicitan tokens
var tokenResponse = await RequestNewTokenAsync(ct);
...
await _cache.SetStringAsync(...);
return tokenResponse.AccessToken;
```

Cuando el token expira, N requests concurrentes todos fallan el cache, todos postean a Azure AD. Azure AD tiene límites de rate (1000 tokens/minuto por app) — un servicio ocupado puede golpearlos. Además de consumo innecesario de cuota.

### Reproducción

Vaciar Redis + 100 requests concurrentes → 100 POST a `/oauth2/v2.0/token`.

### Solución

`SemaphoreSlim` local + doble check:

```csharp
public class UniversitasClient : IUniversitasClient
{
    private static readonly SemaphoreSlim TokenLock = new(1, 1);

    private async Task<string> GetOrRefreshTokenAsync(CancellationToken ct)
    {
        var cached = await _cache.GetStringAsync(TokenCacheKey, ct);
        if (!string.IsNullOrEmpty(cached)) return cached;

        await TokenLock.WaitAsync(ct);
        try
        {
            // Double-check — otro hilo pudo haber poblado mientras esperábamos
            cached = await _cache.GetStringAsync(TokenCacheKey, ct);
            if (!string.IsNullOrEmpty(cached)) return cached;

            var tokenResponse = await RequestNewTokenAsync(ct);

            var ttl = TimeSpan.FromSeconds(tokenResponse.ExpiresIn - _options.TokenExpiryBufferSeconds);
            if (ttl > TimeSpan.Zero)
            {
                await _cache.SetStringAsync(
                    TokenCacheKey,
                    tokenResponse.AccessToken,
                    new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl },
                    ct);
            }

            return tokenResponse.AccessToken;
        }
        finally
        {
            TokenLock.Release();
        }
    }
}
```

**Nota:** el `SemaphoreSlim` es por instancia del proceso. Con múltiples réplicas del API aún habrá stampede cross-proceso (cada réplica hace 1 POST). Para eliminarlo completamente, usar `RedLock.net` o un cache-provider con `SingleFlight` (ej. FusionCache).

---

## F-21 — `MarkAsReadAsync` no invoca invariante de dominio

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟡 Media |
| **Ubicación** | `Gradus.API/Controllers/NotificationsController.cs:74-78`; `Gradus.Infrastructure/Persistence/Repositories/NotificationRepository.cs` (método `MarkAsReadAsync`, supuesto ZG) |

### Causa raíz

El controlador llama directamente al repositorio (ver `architecture.md §V-4`) y el repositorio presumiblemente hace `UPDATE notifications SET read_at = NOW() WHERE id = @id` — saltándose `Notification.MarkAsRead()` (`Gradus.Domain/Entities/Notification.cs:53-58`), que incluye **idempotencia**:

```csharp
public void MarkAsRead()
{
    if (ReadAt.HasValue) return;
    ReadAt = DateTime.UtcNow;
}
```

El SQL directo sobreescribe `read_at` cada vez que se llama el endpoint → el timestamp cambia aunque ya estuviera leída. Pierde la información del "primer momento de lectura".

### Solución

Enrutar por MediatR (ver `architecture.md §V-4`):

```csharp
// Gradus.Application/Commands/MarkNotificationRead/MarkNotificationReadCommand.cs
public record MarkNotificationReadCommand(Guid NotificationId, string CallerOid) : IRequest;

// Handler
public async Task Handle(MarkNotificationReadCommand cmd, CancellationToken ct)
{
    var notification = await _notifications.GetByIdAsync(cmd.NotificationId, ct)
        ?? throw new InvalidOperationException("Notificación no encontrada.");

    if (!string.Equals(notification.RecipientAzureOid, cmd.CallerOid, StringComparison.OrdinalIgnoreCase))
        throw new UnauthorizedAccessException("No autorizado.");

    notification.MarkAsRead();             // invariante de dominio aplica
    _notifications.Update(notification);   // tras F-10
    await _uow.SaveChangesAsync(ct);       // tras F-06
}
```

Requiere añadir `INotificationRepository.GetByIdAsync` y `Update` (hoy ausentes).

---

## F-22 — `GetPendingRequestsHandler` ejecuta 2 queries separadas

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟢 Baja |
| **Ubicación** | `Gradus.Application/Queries/GetPendingRequests/GetPendingRequestsHandler.cs:22-34` |

### Causa raíz

```csharp
var pending = await _requests.GetByStatusAsync(HomologationStatus.Pending, cancellationToken);
var reviewing = await _requests.GetByStatusAsync(HomologationStatus.Reviewing, cancellationToken);
return pending.Concat(reviewing).OrderByDescending(r => r.CreatedAt).Select(...).ToList();
```

Dos round-trips a Postgres, dos index seeks sobre `ix_homologation_requests_status`. Un índice-seek con `IN` ejecuta la misma operación en un solo viaje.

### Solución

Extender el repo:

```csharp
// Domain/Interfaces/IHomologationRepository.cs (o IHomologationReader)
Task<IReadOnlyList<HomologationRequest>> GetByStatusesAsync(
    IReadOnlyList<HomologationStatus> statuses, CancellationToken ct = default);

// Infrastructure/.../HomologationRepository.cs
public async Task<IReadOnlyList<HomologationRequest>> GetByStatusesAsync(
    IReadOnlyList<HomologationStatus> statuses, CancellationToken ct = default)
{
    return await _db.HomologationRequests
        .AsNoTracking()
        .Where(r => statuses.Contains(r.Status))
        .OrderByDescending(r => r.CreatedAt)
        .ToListAsync(ct);
}

// Handler — con proyección directa (ver F-11 opción C)
return await _db.HomologationRequests
    .AsNoTracking()
    .Where(r => r.Status == HomologationStatus.Pending || r.Status == HomologationStatus.Reviewing)
    .OrderByDescending(r => r.CreatedAt)
    .Select(r => new PendingRequestDto(...))
    .ToListAsync(cancellationToken);
```

---

## F-23 — Sin abstracción de reloj

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟢 Baja (testabilidad) |
| **Ubicación** | todas las entidades en `Gradus.Domain/Entities/*.cs` usan `DateTime.UtcNow` directo |

### Causa raíz

`HomologationRequest.CreateDraft` L84-85, `Submit` L122, `StartReview` L137, `Approve` L153-154, `Reject` L172-173, `SetDocumentReady` L191, etc.: todos invocan `DateTime.UtcNow`. Impide testear:
- Expiración de Drafts después de X días.
- Orden temporal de eventos sin introducir `Thread.Sleep`.
- Reproducibilidad en snapshots.

.NET 8+ provee `TimeProvider` como abstracción estándar.

### Solución

```csharp
// Gradus.Domain/Entities/HomologationRequest.cs
public static HomologationRequest CreateDraft(
    string studentIdentity, ..., TimeProvider clock)
{
    var now = clock.GetUtcNow().UtcDateTime;
    return new HomologationRequest { ..., CreatedAt = now, UpdatedAt = now };
}

// Refactor incremental:
//  - cada método del agregado acepta un TimeProvider como último parámetro
//  - handlers lo inyectan (ILogger-style) desde DI
//  - tests usan FakeTimeProvider (Microsoft.Extensions.TimeProvider.Testing)
```

Alternativa menos invasiva: servicio singleton `IGradusClock` inyectado en todos los handlers, los handlers pasan el timestamp como parámetro al dominio. Más ergonómico si ya hay >10 llamadas de `DateTime.UtcNow`.

---

## F-24 — Pluralización ingenua en `SnakeCaseNamingConvention`

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟢 Baja |
| **Ubicación** | `Gradus.Infrastructure/Persistence/SnakeCaseNamingConvention.cs:26-28` |

### Causa raíz

```csharp
entityTypeBuilder.ToTable(ToSnakeCase(tableName) + "s");
```

Pluraliza siempre con `+ "s"`. Funciona con los nombres actuales (`HomologationRequest → homologation_requests`, `HomologationSubject → homologation_subjects`, `Notification → notifications`). Fallará si se agregan entidades como:
- `Category` → `categorys` (debería ser `categories`).
- `Status` → `statuss` (debería ser `statuses`).
- `Entity` → `entitys`.

Es deuda latente — bloqueará a quien agregue una entidad nueva sin leer la convención.

### Solución

Usar librería de pluralización (Humanizer) o dejar explícito:

```csharp
// Opción A: librería
using Humanizer;
entityTypeBuilder.ToTable(ToSnakeCase(tableName).Pluralize(false));

// Opción B: eliminar la pluralización, forzar Configure-explícito por entidad
// (más verboso pero 0 magia)
// → `HomologationRequestConfiguration.Configure` ya hace ToTable("homologation_requests") explícito en L11.
// Si se hace en todas, la convención solo pluraliza si quien agrega entidad no hace explícito.
```

Preferible **Opción B + aserción**: la convención detecta si `HasExplicitTableName` y si no, **lanza** en arranque — obliga a quien agrega entidad a configurar nombre explícito.

---

## F-25 — `RecalculateMetrics` suma `SourceCredits`

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟡 Media (semántica) |
| **Ubicación** | `Gradus.Domain/Entities/HomologationRequest.cs:220-226` |

### Causa raíz

```csharp
private void RecalculateMetrics()
{
    var approved = _subjects.Where(s => s.IsHomologable).ToList();
    TotalSubjectsEvaluated = _subjects.Count;
    TotalSubjectsApproved = approved.Count;
    TotalCreditsHomologated = approved.Sum(s => s.SourceCredits);
}
```

`TotalCreditsHomologated` suma los créditos de la materia **origen** (programa actual), no los créditos que el estudiante recibe acreditados en el programa **destino**. El nombre de la métrica + el dominio de homologación académica sugieren que lo homologado es lo que cuenta **para el destino**. Si una materia de 3 créditos (origen) homologa contra una de 4 créditos (destino), ¿qué cuenta el total?

No hay una respuesta universal — depende de la política institucional del Politécnico. Pero el código no la hace explícita. **Tanto el PDF legal como la respuesta de la API dependen de este número.**

### Solución

1. Confirmar con stakeholder/coordinador: ¿se homologan créditos origen o destino? Reflejarlo en nombre:

```csharp
// Renombrar campo según decisión:
public int TotalSourceCreditsHomologated { get; private set; }
public int TotalTargetCreditsHomologated { get; private set; }

private void RecalculateMetrics()
{
    var approved = _subjects.Where(s => s.IsHomologable).ToList();
    TotalSubjectsEvaluated     = _subjects.Count;
    TotalSubjectsApproved      = approved.Count;
    TotalSourceCreditsHomologated = approved.Sum(s => s.SourceCredits);
    TotalTargetCreditsHomologated = approved.Sum(s => s.TargetCredits);
}
```

2. Migración EF: agregar la columna faltante.

3. Actualizar `HomologationDocument` (PDF) y `PreviewHomologationResponse` para exponer ambos valores.

---

## F-26 — `DataSeeder` sin garantía de idempotencia

| Campo | Valor |
|-------|-------|
| **Criticidad** | 🟡 Media (supuesto — archivo no leído en este análisis) |
| **Ubicación** | `Gradus.Infrastructure/Persistence/DataSeeder.cs` (ZG: contenido no verificado en esta pasada); invocado desde `Program.cs:112-113` |

### Causa raíz (supuesto)

Cada arranque en Development invoca `seeder.SeedAsync()`. Si el seeder no chequea `if (await _db.HomologationRules.AnyAsync()) return;` antes de insertar, cada restart duplica datos.

### Solución

```csharp
// Gradus.Infrastructure/Persistence/DataSeeder.cs
public sealed class DataSeeder
{
    private readonly GradusDbContext _db;
    private readonly ILogger<DataSeeder> _logger;

    public DataSeeder(GradusDbContext db, ILogger<DataSeeder> logger)
    {
        _db = db; _logger = logger;
    }

    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (await _db.HomologationRules.AnyAsync(ct))
        {
            _logger.LogInformation("Base ya tiene datos — seed omitido.");
            return;
        }

        // Usar transacción para que un fallo parcial no deje BD medio poblada
        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async token =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(token);
            // ... inserts ...
            await _db.SaveChangesAsync(token);
            await tx.CommitAsync(token);
        }, ct);
    }
}
```

**Verificar** contenido real del archivo actual para confirmar/descartar antes de aplicar fix.

---

## Zonas grises y supuestos de este análisis

**ZG-F-1.** `DataSeeder.cs`, `HomologationRuleConfiguration.cs`, `NotificationRepository.cs`, `SubjectEquivalenceConfiguration.cs`, migración `InitialCreate.cs`, `ReviewHomologationCommand.cs`, `ReviewHomologationValidator.cs`, `SubmitHomologationValidator.cs`, `GetRequestDetailHandler.cs` no se leyeron en esta pasada. Algunos supuestos (F-21, F-26) dependen de su contenido.

**ZG-F-2.** La política de "créditos homologados" (F-25) es ambigüedad **de negocio**, no de código — requiere validación con el coordinador académico.

**ZG-F-3.** `StubDocumentService.cs` y `StubNotificationService.cs` fueron identificados como código muerto en `architecture.md §3.2`; no se documentan como failure adicional aquí — la acción correctiva es eliminación / mover a test fakes.

---

## Referencias cruzadas

- **Seguridad** relacionada: `vulnerabilities.md` §API-08 (path upstream), §API-10 (HttpClient manual = F-05), §API-16 (migraciones = F-15).
- **Arquitectura**: `architecture.md` §4.1 (SRP — motiva F-13), §5.2 (UoW — motiva F-06), §V-4 (controller salta MediatR — motiva F-21).
- **Mejoras**: `improvements.md` §Performance (F-11, F-22), §Testing (F-23 TimeProvider), §Deuda técnica (F-17, F-24).

---

¿Listo para generar el siguiente archivo (`analysis/improvements.md`)?
