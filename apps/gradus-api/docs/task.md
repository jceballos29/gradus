# Tasks — Autorización JWT en Gradus API

- `[x]` **Paso 1** — Crear `ICurrentUserService` en Application (interfaz)
- `[x]` **Paso 2** — Crear `CurrentUserService` en API (implementación)
- `[x]` **Paso 3** — Registrar `IHttpContextAccessor` y `CurrentUserService` en `Program.cs`
- `[x]` **Paso 4** — Corregir `Audience` y `RoleClaimType` en la config JWT de `Program.cs`
- `[x]` **Paso 5** — Refactorizar `HomologationController` para inyectar y usar `ICurrentUserService`
- `[x]` **Paso 6** — Verificar build: `dotnet build` → ✅ 0 errores, 0 advertencias
- `[ ]` **Paso 7** — Smoke test en Swagger con token real
