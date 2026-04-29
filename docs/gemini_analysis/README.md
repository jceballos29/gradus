# Análisis Técnico y Auditoría — Gradus API

## 📋 Resumen Ejecutivo

Este documento presenta los resultados de una ingeniería inversa y auditoría técnica exhaustiva realizada sobre la solución **Gradus API**, cuyo propósito aparente es el **Sistema de Homologación Académica — Politécnico Internacional** (según configuración de Swagger).

El proyecto fue heredado sin documentación formal y evaluado bajo estrictos estándares de Arquitectura de Software Empresarial, Seguridad (OWASP API Security Top 10 - 2023), Calidad de Código y Performance en el ecosistema .NET.

---

## 🛠 Stack Tecnológico Detectado

Tras el análisis inicial del código fuente (`.csproj` y `Program.cs`), se confirma el siguiente entorno tecnológico:

- **Framework:** .NET 10.0 (`net10.0`)
- **Tipo de Proyecto:** ASP.NET Core Web API (Arquitectura Híbrida: `Controllers` + `Minimal APIs` + `SignalR`)
- **Estilo Arquitectónico:** Clean Architecture (Capas segregadas: API, Application, Domain, Infrastructure) con patrón CQRS (MediatR).
- **ORM:** Entity Framework Core v10.0.6
- **Motor de Base de Datos:** PostgreSQL (Vía `Npgsql.EntityFrameworkCore.PostgreSQL` v10.0.1)
- **Autenticación:** JWT Bearer Token — Integrado con Azure Active Directory (v2.0)
- **Caché:** Redis (`Microsoft.Extensions.Caching.StackExchangeRedis`)
- **Validación y Logeo:** FluentValidation y Serilog

---

## 🧭 Índice de Auditoría

Los resultados detallados se encuentran divididos en los siguientes módulos de análisis:

1. [📖 Documentación y Modelo de Negocio](./documentation.md) — Inventario de endpoints, casos de uso, ERDs y diagramas de secuencia.
2. [🏗 Arquitectura y Diseño](./architecture.md) — Evaluación SOLID, análisis de Clean Architecture, dependencias NuGet y configuración del Pipeline.
3. [🛡 Auditoría de Seguridad (OWASP)](./vulnerabilities.md) — Reporte de vulnerabilidades, CVSS, impacto y código de mitigación.
4. [💥 Fallos y Bugs Críticos](./failures.md) — Fugas de memoria, race conditions, N+1 en EF Core y manejo de excepciones.
5. [📈 Plan de Mejoras Técnicas](./improvements.md) — Performance, observabilidad, reducción de deuda técnica y DX.

---

## 📊 Matriz de Salud del Proyecto

Se ha evaluado el estado actual del código en base a heurísticas iniciales de calidad y madurez técnica.

| Dominio               | Estado |  Puntaje   | Observación Principal                                                                                          |
| :-------------------- | :----: | :--------: | :------------------------------------------------------------------------------------------------------------- |
| **Arquitectura**      |   🟡   | **6.5/10** | Clara intención de Clean Architecture, pero evidencia de acoplamiento y mezcla de Controllers/Minimal APIs.    |
| **Seguridad**         |   🔴   | **3.0/10** | Identificadas vulnerabilidades críticas como _Path Traversal_ en endpoints estáticos y validación laxa de JWT. |
| **Calidad de Código** |   🟡   | **5.5/10** | Uso de convenciones modernas (Nullable reference types), pero falta uniformidad en el manejo de dependencias.  |
| **Performance**       |   🟡   | **6.0/10** | Uso de Redis, pero potencial severo de consultas N+1 en proyecciones no optimizadas de EF Core.                |
| **Testing**           |   🔴   |  **N/A**   | Ausencia crítica de cobertura visible o tests unitarios/integración en el pipeline principal.                  |

> **Leyenda:** 🟢 Saludable (8-10) | 🟡 Requiere Atención (5-7) | 🔴 Crítico (< 5)

---

## 🚨 Top 5 Hallazgos Críticos (Preview)

1. **Vulnerabilidad de Path Traversal (LFI) [OWASP API8:2023 - Security Misconfiguration]:**
   El endpoint Minimal API `GET /documents/{fileName}` expone el file system sin sanitizar el parámetro de entrada `fileName`. Un ataque de directorio (`../../`) permite leer archivos sensibles del servidor host.
2. **Mezcla Híbrida de Paradigmas de Enrutamiento:**
   Se utilizan simultáneamente `Controllers` clásicos, `Minimal APIs` estáticas en `Program.cs`, y `SignalR Hubs`, incrementando la carga cognitiva y dificultando la centralización de _Filters_ o _Middleware_ específicos.
3. **Migraciones Automáticas en Tiempo de Ejecución:**
   Ejecutar `await db.Database.MigrateAsync();` en el _startup_ de la aplicación (`Program.cs`) es un antipatrón en entornos en la nube o clusters (condiciones de carrera si múltiples réplicas levantan al tiempo).
4. **Validación Laxa en JWT Bearer:**
   La configuración de Azure AD (`AddJwtBearer`) valida el _Issuer_ y el _Audience_, pero no se evidencian _Policies_ estrictas ni validación de roles/claims requeridos para operaciones mutativas.
5. **Configuración de CORS y Entornos Mixtos:**
   Presencia de endpoints de prueba de _Machine to Machine_ (`/test/universitas/`) inyectados en la canalización sin protección fuerte (aunque envueltos en `IsDevelopment()`, representan un riesgo si el flag cambia).

---

_Fin del reporte general. Por favor continuar con los reportes detallados para la remediación._
