# Fallos, Bugs y Cuellos de Botella — Gradus API

Este reporte documenta errores lógicos, fugas potenciales, condiciones de carrera y antipatrones de performance descubiertos mediante análisis estático del código base.

---

## 💥 1. Thread Pool Starvation (Bloqueo Sincrónico en Async)
**Criticidad:** 🔴 **CRÍTICA**
**Ubicación:** `Gradus.Infrastructure/Documents/QuestPdfDocumentService.cs:35`

### Causa Raíz
El método `GenerateHomologationDocumentAsync` tiene la firma `async Task<string>`, pero en su interior ejecuta la generación del PDF de QuestPDF de forma totalmente **sincrónica** e intensiva en CPU/Memoria (`document.GeneratePdf(filePath)`). 
En ASP.NET Core, esto secuestra un hilo del *ThreadPool* durante varios milisegundos o segundos. Bajo carga (ej. varios coordinadores aprobando al tiempo), el *ThreadPool* se agotará, provocando caídas en cascada y tiempos de respuesta degradados en *toda* la API.

### Código de Solución
Se debe delegar el trabajo intensivo de CPU a un hilo de fondo explícito (`Task.Run`), permitiendo que el hilo de ASP.NET Core sea liberado mientras se genera el archivo.

**Antes:**
```csharp
var document = new HomologationDocument(request);
document.GeneratePdf(filePath); // BLOQUEANTE
return await Task.FromResult(documentUrl); // Pseudo-async
```

**Después:**
```csharp
var document = new HomologationDocument(request);
// Mueve la carga intensiva a un hilo del ThreadPool y libera el hilo principal
await Task.Run(() => document.GeneratePdf(filePath), ct);

return documentUrl; // Task.FromResult ya no es necesario
```

---

## 🐢 2. Problema N+1 en Actualizaciones Masivas (Bulk Update)
**Criticidad:** 🟠 **ALTA**
**Ubicación:** `Gradus.Infrastructure/Persistence/Repositories/NotificationRepository.cs:57-65`

### Causa Raíz
Para marcar "todas" las notificaciones como leídas, el código realiza un `ToListAsync()`, trayendo cientos de entidades a la memoria RAM de la aplicación, las itera y modifica su estado en memoria. Posteriormente, al llamar `SaveChangesAsync()`, Entity Framework Core emitirá **N consultas `UPDATE`** individuales a la base de datos (una por notificación).

### Código de Solución
En .NET 7/8/10, EF Core introdujo `ExecuteUpdateAsync`, que permite traducir la operación directamente a un solo bloque `UPDATE SQL` en la base de datos, sin traer datos a RAM.

**Antes:**
```csharp
var unread = await _db.Notifications
    .Where(n => n.RecipientAzureOid == recipientAzureOid && n.ReadAt == null)
    .ToListAsync(ct);

foreach (var n in unread)
    n.MarkAsRead(); // Modifica RAM. SaveChanges hará N updates.
```

**Después:**
```csharp
var now = DateTime.UtcNow;

// Genera un solo SQL: UPDATE Notifications SET ReadAt = @now WHERE ...
await _db.Notifications
    .Where(n => n.RecipientAzureOid == recipientAzureOid && n.ReadAt == null)
    .ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, now), ct);
```

---

## ⚡ 3. Condición de Carrera en Migraciones (Race Condition)
**Criticidad:** 🟠 **ALTA**
**Ubicación:** `Gradus.API/Program.cs:111`

### Causa Raíz
El código invoca `await db.Database.MigrateAsync();` en el arranque de la aplicación. En entornos distribuidos (Kubernetes, AWS ECS) donde múltiples instancias (pods) levantan simultáneamente, todas intentarán aplicar las migraciones a la misma base de datos al mismo tiempo. Esto resulta en *Deadlocks*, tablas duplicadas o caída de los contenedores por excepciones de concurrencia.

### Solución
1. Remover `MigrateAsync()` del código fuente.
2. Ejecutar las migraciones como un paso aislado en el Pipeline de CI/CD (GitHub Actions / Azure DevOps) usando:
   `dotnet ef database update --connection "..."`
3. O bien, utilizar un patrón *Init-Container* en Kubernetes que corra un script de migración *antes* de levantar los pods de la API.

---

## ⚠️ 4. Ruido de Logs y Falsos Positivos en Excepciones (Cancelaciones)
**Criticidad:** 🟡 **MEDIA**
**Ubicación:** `Gradus.API/Middleware/ExceptionHandlingMiddleware.cs:89`

### Causa Raíz
El middleware atrapa `Exception` genérico en su último bloque `catch` y lo registra como un error severo (`_logger.LogError(...)`), retornando un HTTP 500. 
Sin embargo, no distingue la `OperationCanceledException` o `TaskCanceledException`. Estas ocurren normalmente cuando un cliente (navegador o app móvil) **aborta o cierra la conexión HTTP** antes de que el servidor termine de procesar. Esto llena el sistema de observabilidad de falsos "Errores Internos 500", activando alertas innecesarias.

### Código de Solución
Agregar un bloque específico para cancelaciones, evitando el ruido en los logs.

**Añadir antes del `catch (Exception ex)`:**
```csharp
catch (OperationCanceledException)
{
    _logger.LogInformation("La petición fue cancelada por el cliente.");
    
    // Status 499 es la convención no oficial (Nginx) para Client Closed Request
    context.Response.StatusCode = 499; 
    
    // Opcional: no retornar body, la conexión ya está cerrada.
}
```

---

## 📉 5. Potencial Explosión Cartesiana en EF Core
**Criticidad:** 🟡 **MEDIA**
**Ubicación:** `Gradus.Infrastructure/Persistence/Repositories/HomologationRepository.cs:28`

### Causa Raíz
En el método `GetByIdWithSubjectsAsync`, se hace un `.Include(r => r.Subjects)`. Aunque actualmente `HomologationRequest` solo tiene una colección hija (`Subjects`), si en el futuro se añade otra relación 1 a N (por ejemplo, `.Include(r => r.AuditLogs)`), Entity Framework Core ejecutará un solo `JOIN`, multiplicando las filas exponencialmente (*Explosión Cartesiana*), afectando drásticamente el uso de RAM y CPU de Postgres y la API.

### Solución Preventiva
Es una buena práctica acostumbrar el uso de proyecciones o partición de consultas (*Split Queries*) en *Aggregates* que incluyen colecciones pesadas:

```csharp
return await _db.HomologationRequests
    .Include(r => r.Subjects)
    .AsSplitQuery() // <-- Divide en dos consultas pequeñas: Select Request; Select Subjects
    .FirstOrDefaultAsync(r => r.Id == id, ct);
```
