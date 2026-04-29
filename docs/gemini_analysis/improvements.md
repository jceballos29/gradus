# Plan de Mejoras Estratégicas y Técnicas — Gradus API

Este documento detalla las oportunidades de mejora arquitectónica, performance y Developer Experience (DevEx). Las tareas se encuentran categorizadas según su retorno de inversión técnico.

---

## 🎯 Matriz de Priorización (Impacto × Esfuerzo)

| Categoría | Baja Complejidad (Bajo Esfuerzo) | Alta Complejidad (Alto Esfuerzo) |
| :--- | :--- | :--- |
| **Alto Impacto** | 🟢 **Quick Wins:**<br>1. Centralizar secrets fuera de `appsettings`.<br>2. Agregar `AsNoTracking` a Queries.<br>3. Mover validaciones JWT a Policies. | 🔵 **Strategic:**<br>1. Integrar Testcontainers y xUnit.<br>2. Montar stack OpenTelemetry (Traces/Metrics).<br>3. Migrar endpoint pesado a `IAsyncEnumerable`. |
| **Bajo Impacto** | 🟡 **Fill-ins:**<br>1. Limpieza de magic strings.<br>2. Agregar archivo `.editorconfig`.<br>3. Habilitar Roslyn Analyzers estrictos. | ⚪ **Thankless:**<br>1. Refactor completo de SignalR Hubs a gRPC.<br>2. Migrar de `QuestPDF` a HTML-to-PDF puro. |

---

## 🚀 1. Performance y Optimización de Datos

El motor actual utiliza EF Core 10 y Redis, pero desaprovecha características modernas:

1. **Uso sistemático de `AsNoTracking`:**
   En todos los CQRS *Queries* (ej. `GetPendingRequestsQuery`), las entidades de sólo lectura se están trackeando en memoria. 
   * **Acción:** Añadir `.AsNoTracking()` a todos los métodos de repositorios que no modifiquen estado.
2. **Proyecciones y Selects:**
   Retornar entidades del Dominio directamente a la capa de API consume memoria innecesaria.
   * **Acción:** Utilizar `.Select(x => new Dto(...))` en el IQueryable antes de iterar, delegando el mapeo a la base de datos (PostgreSQL).
3. **Caché Distribuido (Redis) para Reglas Estáticas:**
   Las reglas de equivalencia entre materias de Universitas y Gradus rara vez cambian.
   * **Acción:** Implementar el patrón *Cache-Aside* con `IDistributedCache` inyectado en la evaluación de homologación para evitar peticiones redundantes a la DB.
4. **Paginación Asíncrona (IAsyncEnumerable):**
   El endpoint de notificaciones trae páginas a memoria de golpe.
   * **Acción:** Para endpoints de exportación masiva, retornar `IAsyncEnumerable<T>` desde la API para hacer streaming directo de Postgres al cliente vía System.Text.Json sin sobrecargar la RAM.

---

## 📡 2. Observabilidad (Telemetry & Health)

Actualmente hay uso de Serilog (`LogInformation`, `LogWarning`), pero en una arquitectura de microservicios (con Universitas M2M), no es suficiente.

1. **Correlation IDs:**
   Se necesita trazar cuándo un request que entra por `HomologationController` falla al comunicarse con `Universitas`.
   * **Acción:** Inyectar un Middleware que atrape/genere un header `X-Correlation-ID` y usar `LogContext.PushProperty("CorrelationId", id)` de Serilog.
2. **OpenTelemetry (Otel):**
   * **Acción:** Instalar `OpenTelemetry.Extensions.Hosting`. Exportar Traces (paso por MediatR y HttpClient de Universitas) y Metrics (latencia de `QuestPDF`) hacia Prometheus/Jaeger o Application Insights.
3. **Health Checks Avanzados:**
   Actualmente `/health` solo responde `200 OK` estático.
   * **Acción:** Instalar `AspNetCore.HealthChecks.Npgsql` y `AspNetCore.HealthChecks.Redis`. Exponer `/health/ready` (que valide que la DB y Redis estén arriba) y `/health/live` (solo ping).

---

## 🧪 3. Estrategia de Testing (Cobertura actual: ~0%)

La ausencia de un proyecto de pruebas (Unit/Integration) es la deuda técnica más grave del proyecto.

1. **Pruebas de Integración (API Tests):**
   * **Herramienta:** `xUnit` + `Microsoft.AspNetCore.Mvc.Testing` (`WebApplicationFactory`).
   * **Acción:** Levantar la API en memoria, saltándose autenticación (o burlando el `JwtBearerHandler`) para probar los endpoints E2E.
2. **Testcontainers (Base de datos real):**
   * **Acción:** Para las pruebas de integración, usar el paquete `Testcontainers.PostgreSql`. Levanta un contenedor Docker de Postgres temporal por corrida de test, corre las migraciones, ejecuta la prueba, y se destruye. Evita la inestabilidad de usar `UseInMemoryDatabase()`.
3. **Mocks de Servicios Externos:**
   * **Acción:** Usar `WireMock.Net` en los tests para simular el endpoint externo `http://localhost:3003` (Universitas API) y probar cómo el sistema reacciona ante timeouts o HTTP 500.

---

## 🧹 4. Deuda Técnica y Calidad de Código

1. **Magic Strings en Configuración:**
   * **Acción:** Existen strings crudos como `"GradusDb"` o roles como `"coordinador"`. Crear clases estáticas `Constants.Roles` y usar patrones fuertemente tipados (`nameof()`).
2. **Warnings de Nullable Reference Types:**
   * El `.csproj` tiene `<Nullable>enable</Nullable>`, pero seguramente habrá advertencias silenciadas u omitidas (`!`). Revisar las clases DTO para aplicar los atributos `required` introducidos en C# recientes.
3. **Hardcodeo de Entornos de Frontend:**
   * La política CORS `GradusFrontend` tiene *hardcodeado* `http://localhost:3004`. Esto fallará en el pipeline de despliegue a Staging/Prod. Debe moverse a los `appsettings.json`.

---

## 🏗 5. DevEx y CI/CD Pipelines

Para que el equipo adopte estos estándares sin fricción:

1. **`Directory.Build.props`:**
   * **Acción:** Crear este archivo en la raíz del repositorio (`apps/Gradus/`) para forzar reglas a todos los `.csproj` (Application, Domain, API, Infra). Por ejemplo, forzar `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` a nivel global.
2. **Roslyn Analyzers (`.editorconfig`):**
   * **Acción:** Agregar reglas estándar de .NET (`dotnet new editorconfig`). Imponer convenciones (ej. prefijos de interfaz con `I`, variables privadas con `_`) de manera que la IDE marque error si no se cumplen.
3. **Pipeline de GitHub Actions / Azure DevOps:**
   * **Acción:** Implementar un YML que haga `dotnet build`, corra el `Testcontainers`, genere métricas de cobertura de código (ej. SonarQube / Coverlet) y verifique el formateo (`dotnet format --verify-no-changes`) en cada Pull Request.
