# Gradus — Esquema de Base de Datos

**Institución:** Politécnico Internacional  
**Sistema:** Sistema de Homologación — Gradus  
**Motor:** PostgreSQL 17 · **ORM:** EF Core 10 (.NET)  
**Base de datos:** `gradus_db`  
**Última actualización:** Abril 2026

---

## Índice

1. [Visión general](#visión-general)
2. [Diagrama de relaciones](#diagrama-de-relaciones)
3. [Configuración de homologación](#configuración-de-homologación)
4. [Proceso de homologación](#proceso-de-homologación)
5. [Notificaciones](#notificaciones)
6. [Enums](#enums)
7. [Convenciones](#convenciones)

---

## Visión general

Gradus almacena **solo la lógica de homologación** — no duplica datos académicos.

El historial del estudiante vive en `universitas_db` y se consulta en tiempo real via API M2M. Lo que sí persiste en `gradus_db`:

- Las **reglas y equivalencias** configuradas por el coordinador entre programas
- Las **solicitudes de homologación** con su estado y trazabilidad
- Las **materias incluidas** en cada solicitud con el resultado de la evaluación
- Las **notificaciones** in-app para estudiantes y coordinadores

**Referencia al estudiante:** se usa `student_identity` (el ID externo de Universitasxxi, ej: `"707207"`) y `student_azure_oid` (el Object ID de Azure AD). No hay FK física a `universitas_db` — la referencia es lógica.

---

## Diagrama de relaciones

```
homologation_rules (1:N) ──────────────────────────────────┐
  (source_program, target_program)                          │
                                                            │
subject_equivalences (1:N) ────────────────────────────────┤
  (source_program, target_program,                          │
   source_subject, target_subject)                          │
                                                            ↓
                              homologation_requests (1:N) ──► homologation_subjects
                                (student_identity,              (materia origen,
                                 source_program,                 materia destino,
                                 target_program,                 resultado evaluación)
                                 status)

notifications (independiente — por recipient_azure_oid)
```

---

## Configuración de homologación

### `homologation_rules`

Reglas globales por par de programas. Define las condiciones mínimas que debe cumplir cualquier materia para ser homologada entre dos programas.

El coordinador configura una regla por cada par `(programa_origen → programa_destino)`.

| Columna                     | Tipo         | Descripción                                                                |
| --------------------------- | ------------ | -------------------------------------------------------------------------- |
| `id`                        | UUID PK      | Identificador interno                                                      |
| `source_program_code`       | VARCHAR(20)  | Código del programa origen (`351C`)                                        |
| `target_program_code`       | VARCHAR(20)  | Código del programa destino (`372V`)                                       |
| `min_grade`                 | NUMERIC(4,2) | Nota mínima requerida en la materia origen (ej: 3.00)                      |
| `max_credits_percentage`    | INT          | % máximo de créditos del programa destino que se pueden homologar (ej: 60) |
| `requires_same_area`        | BOOLEAN      | Si la materia debe pertenecer al mismo área de formación                   |
| `active`                    | BOOLEAN      | Si la regla está vigente                                                   |
| `created_by_azure_oid`      | VARCHAR(50)  | OID de Azure AD del coordinador que la creó                                |
| `updated_by_azure_oid`      | VARCHAR(50)  | OID de Azure AD del coordinador que la modificó                            |
| `created_at` / `updated_at` | TIMESTAMPTZ  | Auditoría                                                                  |

**Restricción:** `(source_program_code, target_program_code)` es único — solo puede existir una regla por par de programas.

**Índices:**

- `(source_program_code, target_program_code)` — búsqueda al generar vista previa.
- `active` — para listar solo reglas vigentes.

**Relaciones:** tiene muchas `subject_equivalences` (1:N) · es referenciada por `homologation_requests` (lógicamente).

> Si el par `(351C → 372V)` no tiene regla activa, no se puede iniciar una solicitud de homologación entre esos programas.

---

### `subject_equivalences`

Equivalencias específicas entre asignaturas de dos programas. Configuradas manualmente por el coordinador — son el catálogo de "esta materia del programa A equivale a esta del programa B".

| Columna                     | Tipo         | Descripción                                                                                             |
| --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| `id`                        | UUID PK      | Identificador interno                                                                                   |
| `source_program_code`       | VARCHAR(20)  | Código del programa origen                                                                              |
| `target_program_code`       | VARCHAR(20)  | Código del programa destino                                                                             |
| `source_subject_code`       | VARCHAR(20)  | Código asignatura origen (`0547`)                                                                       |
| `source_subject_name`       | VARCHAR(255) | Nombre asignatura origen (desnormalizado para consultas rápidas)                                        |
| `source_credits`            | INT          | Créditos de la asignatura origen                                                                        |
| `target_subject_code`       | VARCHAR(20)  | Código asignatura destino                                                                               |
| `target_subject_name`       | VARCHAR(255) | Nombre asignatura destino (desnormalizado)                                                              |
| `target_credits`            | INT          | Créditos de la asignatura destino                                                                       |
| `min_grade_override`        | NUMERIC(4,2) | Nota mínima específica para esta equivalencia (override de la regla global). Null = usa la regla global |
| `content_similarity_notes`  | TEXT         | Justificación del coordinador sobre similitud de contenidos                                             |
| `active`                    | BOOLEAN      | Si la equivalencia está vigente                                                                         |
| `created_by_azure_oid`      | VARCHAR(50)  | OID Azure AD del coordinador                                                                            |
| `created_at` / `updated_at` | TIMESTAMPTZ  | Auditoría                                                                                               |

**Restricción:** `(source_program_code, target_program_code, source_subject_code)` es único — una asignatura origen solo puede tener una equivalencia por par de programas.

**Índices:**

- `(source_program_code, target_program_code)` — carga todas las equivalencias del par.
- `source_subject_code` — búsqueda por asignatura.

**Relaciones:** pertenece lógicamente a `homologation_rules` (mismo par de programas).

---

## Proceso de homologación

### `homologation_requests`

El núcleo del sistema. Una solicitud por estudiante por cambio de programa. Registra todo el ciclo de vida desde que el estudiante inicia hasta que el coordinador resuelve.

| Columna                     | Tipo         | Descripción                                                |
| --------------------------- | ------------ | ---------------------------------------------------------- |
| `id`                        | UUID PK      | Identificador interno                                      |
| `student_identity`          | VARCHAR(50)  | ID externo de Universitasxxi (`707207`)                    |
| `student_azure_oid`         | VARCHAR(50)  | OID de Azure AD del estudiante                             |
| `student_name`              | VARCHAR(200) | Nombre del estudiante (desnormalizado al momento de crear) |
| `student_code`              | VARCHAR(20)  | Código estudiantil (desnormalizado)                        |
| `source_program_code`       | VARCHAR(20)  | Programa actual del estudiante                             |
| `source_program_name`       | VARCHAR(255) | Nombre del programa actual (desnormalizado)                |
| `target_program_code`       | VARCHAR(20)  | Programa al que desea cambiarse                            |
| `target_program_name`       | VARCHAR(255) | Nombre del programa destino (desnormalizado)               |
| `status`                    | ENUM         | Estado de la solicitud                                     |
| `total_subjects_evaluated`  | INT          | Total de materias evaluadas                                |
| `total_subjects_approved`   | INT          | Total de materias que se homologan                         |
| `total_credits_homologated` | INT          | Total de créditos homologados                              |
| `student_notes`             | TEXT         | Observaciones del estudiante al enviar                     |
| `coordinator_notes`         | TEXT         | Observaciones del coordinador al resolver                  |
| `reviewed_by_azure_oid`     | VARCHAR(50)  | OID Azure AD del coordinador que resolvió                  |
| `reviewed_at`               | TIMESTAMPTZ  | Fecha y hora de resolución                                 |
| `document_url`              | TEXT         | URL del PDF legal generado (null hasta aprobación)         |
| `document_generated_at`     | TIMESTAMPTZ  | Cuándo se generó el PDF                                    |
| `created_at` / `updated_at` | TIMESTAMPTZ  | Auditoría                                                  |

**Restricción:** Un estudiante no puede tener dos solicitudes activas (`PENDING` o `REVIEWING`) al mismo tiempo para el mismo par de programas.

**Índices:**

- `student_identity` — solicitudes del estudiante.
- `student_azure_oid` — autenticación Azure AD.
- `status` — filtrar solicitudes pendientes para el coordinador.
- `(status, created_at)` — solicitudes pendientes ordenadas por antigüedad.
- `(source_program_code, target_program_code)` — reportes por par de programas.

**Relaciones:** tiene muchas `homologation_subjects` (1:N).

**Transiciones de estado válidas:**

```
DRAFT → PENDING           (estudiante acepta la vista previa y envía)
PENDING → REVIEWING       (coordinador abre la solicitud para revisarla)
REVIEWING → APPROVED      (coordinador aprueba)
REVIEWING → REJECTED      (coordinador rechaza)
APPROVED → DOCUMENT_READY (PDF generado exitosamente)
```

---

### `homologation_subjects`

Cada asignatura evaluada en una solicitud de homologación. Se genera automáticamente al crear la vista previa y se persiste cuando el estudiante acepta.

| Columna                      | Tipo         | Descripción                                          |
| ---------------------------- | ------------ | ---------------------------------------------------- |
| `id`                         | UUID PK      | Identificador interno                                |
| `homologation_request_id`    | UUID FK      | Solicitud a la que pertenece                         |
| `source_subject_code`        | VARCHAR(20)  | Código asignatura cursada                            |
| `source_subject_name`        | VARCHAR(255) | Nombre asignatura cursada                            |
| `source_subject_grade`       | NUMERIC(4,2) | Nota obtenida por el estudiante                      |
| `source_subject_credits`     | INT          | Créditos de la asignatura cursada                    |
| `source_subject_area`        | VARCHAR(50)  | Área de formación de la asignatura cursada           |
| `target_subject_code`        | VARCHAR(20)  | Código asignatura destino (null si no aplica)        |
| `target_subject_name`        | VARCHAR(255) | Nombre asignatura destino (null si no aplica)        |
| `target_subject_credits`     | INT          | Créditos de la asignatura destino                    |
| `is_homologable`             | BOOLEAN      | Si la materia cumple las reglas y se puede homologar |
| `rejection_reason`           | ENUM         | Razón por la que no aplica (null si es homologable)  |
| `auto_approved`              | BOOLEAN      | True si fue aprobada automáticamente por reglas      |
| `coordinator_override`       | BOOLEAN      | True si el coordinador hizo una excepción manual     |
| `coordinator_override_notes` | TEXT         | Justificación de la excepción                        |
| `created_at`                 | TIMESTAMPTZ  | Auditoría                                            |

**Restricción:** `(homologation_request_id, source_subject_code)` es único — una asignatura cursada aparece una sola vez por solicitud.

**Índices:**

- `homologation_request_id` — todas las materias de una solicitud.
- `is_homologable` — filtrar las que sí aplican.

**Relaciones:** pertenece a `homologation_requests` (N:1). Si se elimina la solicitud, los subjects se eliminan en cascada.

---

## Notificaciones

### `notifications`

Notificaciones in-app para estudiantes y coordinadores. Persisten hasta que el usuario las marca como leídas.

| Columna               | Tipo         | Descripción                                             |
| --------------------- | ------------ | ------------------------------------------------------- |
| `id`                  | UUID PK      | Identificador interno                                   |
| `recipient_azure_oid` | VARCHAR(50)  | OID Azure AD del destinatario                           |
| `title`               | VARCHAR(200) | Título de la notificación                               |
| `message`             | TEXT         | Cuerpo del mensaje                                      |
| `type`                | ENUM         | Tipo de evento que la originó                           |
| `reference_id`        | UUID         | ID de la `homologation_request` relacionada             |
| `reference_type`      | VARCHAR(50)  | `homologation_request` (extensible a futuro)            |
| `read_at`             | TIMESTAMPTZ  | null = no leída. Se actualiza cuando el usuario la abre |
| `created_at`          | TIMESTAMPTZ  | Cuándo se creó                                          |

**Índices:**

- `(recipient_azure_oid, read_at)` — notificaciones no leídas del usuario (hot path).
- `recipient_azure_oid` — todas las notificaciones del usuario.
- `created_at` — ordenar por más reciente.

**Nota:** Las notificaciones por email se envían en el momento del evento y no se persisten aquí — solo las in-app.

---

## Enums

### `homologation_status`

Estado de una solicitud de homologación.

| Valor            | Descripción                                                     |
| ---------------- | --------------------------------------------------------------- |
| `DRAFT`          | Vista previa generada, el estudiante aún no ha enviado          |
| `PENDING`        | Estudiante aceptó y envió. Esperando que un coordinador la tome |
| `REVIEWING`      | Un coordinador está revisando activamente la solicitud          |
| `APPROVED`       | Coordinador aprobó la homologación                              |
| `REJECTED`       | Coordinador rechazó la solicitud                                |
| `DOCUMENT_READY` | PDF legal generado y disponible para descarga                   |

### `rejection_reason`

Razón por la que una materia no es homologable automáticamente.

| Valor                    | Descripción                                                 |
| ------------------------ | ----------------------------------------------------------- |
| `GRADE_TOO_LOW`          | La nota no alcanza el mínimo requerido                      |
| `INSUFFICIENT_CREDITS`   | Los créditos de la materia origen son insuficientes         |
| `DIFFERENT_AREA`         | La materia es de un área de formación diferente             |
| `NO_EQUIVALENCE_DEFINED` | No existe equivalencia configurada para esta materia        |
| `SUBJECT_ALREADY_PASSED` | El estudiante ya aprobó esta materia en el programa destino |

### `notification_type`

Tipo de evento que originó la notificación.

| Valor                  | Destinatario | Descripción                                   |
| ---------------------- | ------------ | --------------------------------------------- |
| `REQUEST_SUBMITTED`    | Coordinador  | Nueva solicitud pendiente de revisión         |
| `REQUEST_APPROVED`     | Estudiante   | Su solicitud fue aprobada                     |
| `REQUEST_REJECTED`     | Estudiante   | Su solicitud fue rechazada                    |
| `DOCUMENT_READY`       | Estudiante   | El PDF legal está disponible para descarga    |
| `REQUEST_UNDER_REVIEW` | Estudiante   | Un coordinador comenzó a revisar su solicitud |

---

## Convenciones

- **PKs:** siempre `UUID` generado en la aplicación con `Guid.NewGuid()` (EF Core: `ValueGeneratedNever()`).
- **Tablas:** `snake_case` configurado automáticamente en `GradusDbContext` via convención.
- **Timestamps:** `created_at` y `updated_at` en `TIMESTAMPTZ`. El `updated_at` lo gestiona EF Core al hacer `SaveChangesAsync()`.
- **Datos desnormalizados:** nombres de programas, asignaturas y estudiantes se guardan en las tablas de Gradus para evitar dependencia de universitas-ui en consultas de historial. Los datos se copian al momento de crear la solicitud.
- **Sin FKs físicas a universitas_db:** toda referencia entre bases de datos es lógica — `student_identity` y `student_azure_oid` son strings, no FKs.
- **Soft delete:** las equivalencias y reglas usan `active = false` en lugar de `DELETE` para preservar el historial de solicitudes que las referenciaron.
- **Notas:** `NUMERIC(4,2)` para calificaciones — igual que universitas_db.
- **OIDs de Azure AD:** se almacenan como `VARCHAR(50)` — el formato es `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (36 chars), pero se deja margen.

---

## Reglas de negocio documentadas

### Regla 1 — Una solicitud activa por par de programas

Un estudiante no puede tener dos solicitudes en estado `PENDING` o `REVIEWING` para el mismo par `(source_program, target_program)`. Puede iniciar una nueva solo cuando la anterior esté en `APPROVED`, `REJECTED` o `DOCUMENT_READY`.

### Regla 2 — Inmutabilidad del documento

Una vez generado el PDF (`DOCUMENT_READY`), no se modifica. Si hay un error, el coordinador rechaza y el estudiante inicia una nueva solicitud.

### Regla 3 — Desnormalización al crear

Cuando el estudiante acepta la vista previa, se copian los nombres de programa, asignatura y datos del estudiante a `homologation_requests` y `homologation_subjects`. Esto garantiza que el historial de la solicitud es inmutable aunque los datos en universitas cambien.

### Regla 4 — El coordinator_override requiere justificación

Si `coordinator_override = true`, el campo `coordinator_override_notes` es obligatorio. No se puede aprobar una excepción sin documentar el motivo.

### Regla 5 — Créditos máximos homologables

La regla `max_credits_percentage` limita cuántos créditos del programa destino se pueden homologar. Si la suma de `target_subject_credits` de las materias homologables supera este límite, el sistema descarta las de menor nota hasta cumplir el límite.
