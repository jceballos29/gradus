# Portal Académico — Esquema de Base de Datos (modelo simplificado)

**Institución:** Politécnico Internacional  
**Motor:** PostgreSQL 15+ · **ORM:** Prisma  
**Última actualización:** Abril 2026

---

## Índice

1. [Visión general](#visión-general)
2. [Diagrama de relaciones](#diagrama-de-relaciones)
3. [Catálogo académico](#catálogo-académico)
4. [Usuarios](#usuarios)
5. [Historial académico](#historial-académico)
6. [Enums](#enums)
7. [Funciones y triggers](#funciones-y-triggers)
8. [Vistas](#vistas)
9. [Convenciones](#convenciones)

---

## Visión general

El modelo está reducido a **8 tablas** (más una auxiliar de períodos) con dos reglas de negocio centrales:

- **Un estudiante pertenece a un único plan de estudios** en un momento dado. No hay tabla intermedia: el `study_plan_id` vive directamente en `students`.
- **Un coordinador gestiona todo el sistema.** No tiene tabla de extensión ni restricción por programa. Sus permisos se controlan en la aplicación verificando `rol = COORDINADOR` en `users`.

El historial académico completo (todos los trimestres) es visible para el estudiante mostrando solo `nota_final`. El detalle de los 3 parciales se expone únicamente para el trimestre activo.

---

## Diagrama de relaciones

```
institutions
    └── programs (1:N)
          └── study_plans (1:N)
                ├── pensum_subjects (1:N)   ← catálogo del pensum
                │       └── academic_records (1:N)
                │                 └── partial_grades (1:N)
                └── students (1:N)          ← un plan por estudiante
                          └── academic_records (1:N)

users (1:1) ──► students
```

---

## Catálogo académico

### `institutions`

Institución educativa raíz del árbol académico.

| Columna                     | Tipo               | Descripción                     |
| --------------------------- | ------------------ | ------------------------------- |
| `id`                        | UUID PK            | Identificador interno           |
| `nombre`                    | VARCHAR(255)       | Nombre de la institución        |
| `nit`                       | VARCHAR(20) UNIQUE | NIT institucional               |
| `activo`                    | BOOLEAN            | Permite desactivar sin eliminar |
| `created_at` / `updated_at` | TIMESTAMPTZ        | Auditoría (trigger automático)  |

**Relaciones:** tiene muchos `programs` (1:N).

---

### `programs`

Cada carrera ofrecida por la institución. El campo `codigo` coincide con el usado en la API de Universitasxxi (`351C`, `372V`, etc.).

| Columna                     | Tipo               | Descripción                         |
| --------------------------- | ------------------ | ----------------------------------- |
| `id`                        | UUID PK            | Identificador interno               |
| `institution_id`            | UUID FK            | Referencia a `institutions`         |
| `codigo`                    | VARCHAR(20) UNIQUE | Código de la API (`351C`)           |
| `nombre`                    | VARCHAR(255)       | Nombre completo del programa        |
| `modalidad`                 | ENUM               | `PRESENCIAL`, `VIRTUAL` o `HIBRIDO` |
| `activo`                    | BOOLEAN            | Estado del programa                 |
| `created_at` / `updated_at` | TIMESTAMPTZ        | Auditoría                           |

**Relaciones:** pertenece a `institutions` (N:1) · tiene muchos `study_plans` (1:N).

---

### `study_plans`

Versión del pensum. Un programa puede tener varias versiones activas en paralelo mientras distintas cohortes terminan sus carreras.

| Columna                     | Tipo        | Descripción                        |
| --------------------------- | ----------- | ---------------------------------- |
| `id`                        | UUID PK     | Identificador interno              |
| `program_id`                | UUID FK     | Referencia a `programs`            |
| `codigo_plan`               | VARCHAR(50) | Código del plan (`35-1`, `V 181`)  |
| `total_creditos`            | INT         | Créditos totales para graduarse    |
| `num_periodos`              | INT         | Número de períodos del pensum      |
| `activo`                    | BOOLEAN     | Disponible para nuevos estudiantes |
| `created_at` / `updated_at` | TIMESTAMPTZ | Auditoría                          |

**Restricción:** `(program_id, codigo_plan)` es único.

**Relaciones:** pertenece a `programs` (N:1) · tiene muchas `pensum_subjects` (1:N) · tiene muchos `students` directamente (1:N).

---

### `pensum_subjects`

Cada asignatura definida en el plan de estudios. Es el catálogo estático del pensum; no cambia por trimestre.

| Columna                     | Tipo         | Descripción                             |
| --------------------------- | ------------ | --------------------------------------- |
| `id`                        | UUID PK      | Identificador interno                   |
| `study_plan_id`             | UUID FK      | Referencia a `study_plans`              |
| `codigo_asignatura`         | VARCHAR(20)  | Código de la API (`0547`, `1422`)       |
| `nombre`                    | VARCHAR(255) | Nombre de la asignatura                 |
| `creditos`                  | INT          | Créditos (≥ 1)                          |
| `periodo_pensum`            | INT          | Período sugerido del pensum (1–10)      |
| `area`                      | ENUM         | Área de formación                       |
| `subarea`                   | VARCHAR(100) | Sub-área dentro de Formación Específica |
| `tipo`                      | ENUM         | Clasificación de la asignatura          |
| `created_at` / `updated_at` | TIMESTAMPTZ  | Auditoría                               |

**Restricciones:**

- `(study_plan_id, codigo_asignatura)` es único.
- `periodo_pensum` entre 1 y 10.
- `creditos` > 0.

**Índices:**

- `(study_plan_id, periodo_pensum)` — carga el pensum ordenado por período.
- `nombre` con GIN `pg_trgm` — búsqueda por texto.

**Relaciones:** pertenece a `study_plans` (N:1) · tiene muchos `academic_records` (1:N).

---

## Usuarios

### `users`

Tabla base para todos los actores. El campo `identity` es el ID externo de Universitasxxi.

| Columna                     | Tipo                | Descripción                     |
| --------------------------- | ------------------- | ------------------------------- |
| `id`                        | UUID PK             | Identificador interno           |
| `identity`                  | VARCHAR(50) UNIQUE  | ID externo de la API (`707207`) |
| `nombre`                    | VARCHAR(100)        | Nombre                          |
| `apellido`                  | VARCHAR(100)        | Apellido                        |
| `email`                     | VARCHAR(255) UNIQUE | Correo institucional            |
| `rol`                       | ENUM                | `ESTUDIANTE` o `COORDINADOR`    |
| `activo`                    | BOOLEAN             | Estado de la cuenta             |
| `created_at` / `updated_at` | TIMESTAMPTZ         | Auditoría                       |

**Relaciones:** puede tener un `student` asociado cuando `rol = ESTUDIANTE` (1:0..1).

---

### `students`

Extiende `users` con los datos académicos del estudiante.

| Columna                     | Tipo               | Descripción                                  |
| --------------------------- | ------------------ | -------------------------------------------- |
| `id`                        | UUID PK            | Identificador interno                        |
| `user_id`                   | UUID FK UNIQUE     | Referencia a `users`                         |
| `study_plan_id`             | UUID FK            | Plan de estudios actual                      |
| `codigo_estudiante`         | VARCHAR(20) UNIQUE | Código institucional                         |
| `sede`                      | VARCHAR(100)       | Sede donde cursa                             |
| `fecha_ingreso`             | DATE               | Fecha de ingreso al programa                 |
| `estado`                    | ENUM               | Estado de la carrera                         |
| `creditos_logrados`         | INT                | Créditos aprobados (actualizado por trigger) |
| `created_at` / `updated_at` | TIMESTAMPTZ        | Auditoría                                    |

**Relaciones:** extiende `users` (1:1) · pertenece a `study_plans` (N:1) · tiene muchos `academic_records` (1:N).

---

## Historial académico

### `academic_records`

Un registro por asignatura cursada por trimestre.

| Columna                     | Tipo         | Descripción                           |
| --------------------------- | ------------ | ------------------------------------- |
| `id`                        | UUID PK      | Identificador interno                 |
| `student_id`                | UUID FK      | Estudiante                            |
| `pensum_subject_id`         | UUID FK      | Asignatura del pensum                 |
| `trimestre`                 | VARCHAR(10)  | Período académico (`2026-1T`)         |
| `estado`                    | ENUM         | Estado de la asignatura               |
| `nota_final`                | NUMERIC(4,2) | Nota definitiva calculada (0.00–5.00) |
| `numero_faltas`             | INT          | Total de faltas acumuladas            |
| `cumple_asistencia`         | BOOLEAN      | Si supera el umbral de asistencia     |
| `observacion`               | TEXT         | Nota libre del coordinador            |
| `created_at` / `updated_at` | TIMESTAMPTZ  | Auditoría                             |

**Restricciones:**

- `(student_id, pensum_subject_id, trimestre)` es único.
- `nota_final` entre 0 y 5, o nula.

**Índices:**

- `student_id` — historial completo del estudiante.
- `(student_id, trimestre)` — asignaturas de un trimestre específico.

**Relaciones:** pertenece a `students` (N:1) · pertenece a `pensum_subjects` (N:1) · tiene 3 `partial_grades` (1:N).

---

### `partial_grades`

Los 3 cortes de evaluación. Porcentajes fijos: 15 %, 35 % y 50 %.

| Columna                     | Tipo         | Descripción                                    |
| --------------------------- | ------------ | ---------------------------------------------- |
| `id`                        | UUID PK      | Identificador interno                          |
| `academic_record_id`        | UUID FK      | Registro académico al que pertenece            |
| `orden`                     | INT          | Número del corte: 1, 2 o 3                     |
| `nombre_parcial`            | VARCHAR(50)  | Nombre del corte (`NOTA PRIMER CORTE`)         |
| `porcentaje`                | NUMERIC(5,2) | Peso en la nota final: 15, 35 o 50             |
| `calificacion`              | NUMERIC(4,2) | Nota (0.00–5.00), `null` si aún no se registra |
| `inasistencia`              | INT          | Faltas en este corte                           |
| `created_at` / `updated_at` | TIMESTAMPTZ  | Auditoría                                      |

**Restricciones:**

- `(academic_record_id, orden)` es único.
- `orden` entre 1 y 3.
- Si se elimina el `academic_record`, los parciales se eliminan en cascada.

**Distribución estándar:**

| `orden` | `nombre_parcial`   | `porcentaje` |
| :-----: | ------------------ | :----------: |
|    1    | NOTA PRIMER CORTE  |     15 %     |
|    2    | NOTA SEGUNDO CORTE |     35 %     |
|    3    | NOTA TERCER CORTE  |     50 %     |

**Fórmula:** `nota_final = (corte1 × 0.15) + (corte2 × 0.35) + (corte3 × 0.50)`

---

### `academic_periods` (tabla auxiliar)

Solo para saber qué trimestre está activo y sus fechas.

| Columna                     | Tipo               | Descripción              |
| --------------------------- | ------------------ | ------------------------ |
| `id`                        | UUID PK            | Identificador interno    |
| `codigo`                    | VARCHAR(10) UNIQUE | `2026-1T`                |
| `fecha_inicio`              | DATE               | Inicio del trimestre     |
| `fecha_fin`                 | DATE               | Fin del trimestre        |
| `activo`                    | BOOLEAN            | Solo uno activo a la vez |
| `created_at` / `updated_at` | TIMESTAMPTZ        | Auditoría                |

---

## Enums

### `modalidad`

| Valor        | Descripción           |
| ------------ | --------------------- |
| `PRESENCIAL` | Clases en sede física |
| `VIRTUAL`    | Clases en línea       |
| `HIBRIDO`    | Combinación de ambas  |

### `user_role`

| Valor         | Descripción                                                 |
| ------------- | ----------------------------------------------------------- |
| `ESTUDIANTE`  | Solo lectura: consulta su historial y notas                 |
| `COORDINADOR` | Gestión completa: crea estudiantes, registra calificaciones |

### `area_formacion`

| Valor                      | Descripción                              |
| -------------------------- | ---------------------------------------- |
| `FORMACION_BASICA`         | Matemáticas, idiomas, ciencias básicas   |
| `FORMACION_ESPECIFICA`     | Núcleo técnico del programa              |
| `FORMACION_COMPLEMENTARIA` | Emprendimiento, proyectos, empleabilidad |
| `PRACTICA_OPCION_GRADO`    | Práctica empresarial y opciones de grado |

### `tipo_asignatura`

| Valor                  | Descripción                           |
| ---------------------- | ------------------------------------- |
| `BASICA`               | Asignatura de formación básica        |
| `ESPECIFICA_PROGRAMA`  | Núcleo técnico del programa           |
| `COMPLEMENTARIA`       | Formación transversal                 |
| `ELECTIVA_GENERAL`     | Electiva abierta a cualquier programa |
| `ELECTIVA_DISCIPLINAR` | Electiva dentro del área del programa |
| `PRACTICA`             | Práctica empresarial o emprendedora   |
| `OPCION_GRADO`         | Modalidad de trabajo de grado         |

### `estado_matricula`

| Valor        | Descripción                           |
| ------------ | ------------------------------------- |
| `ACTIVO`     | Estudiante cursando el programa       |
| `RETIRADO`   | Se retiró voluntariamente             |
| `GRADUADO`   | Completó todos los requisitos         |
| `SUSPENDIDO` | Suspensión académica o administrativa |

### `estado_asignatura`

| Valor       | Descripción                             |
| ----------- | --------------------------------------- |
| `CURSANDO`  | Trimestre en curso, sin nota definitiva |
| `APROBADA`  | Nota ≥ 3.0 y asistencia cumplida        |
| `REPROBADA` | Nota < 3.0 o asistencia insuficiente    |
| `RETIRADA`  | Retirada antes de cierre del período    |

---

## Funciones y triggers

### `set_updated_at()`

Trigger `BEFORE UPDATE` aplicado a las 8 tablas. Mantiene `updated_at` siempre sincronizado.

### `recalcular_nota_final()`

Trigger `AFTER INSERT OR UPDATE` en `partial_grades`. Recalcula automáticamente la `nota_final` en `academic_records`.

```
nota_final = SUM(calificacion × porcentaje / 100)
```

### `actualizar_creditos_logrados()`

Trigger `AFTER UPDATE` en `academic_records`. Cuando `estado` cambia a `APROBADA`, suma los créditos al campo `creditos_logrados` del estudiante.

---

## Vistas

### `v_student_history`

Historial académico completo sin parciales. Para todos los trimestres.

```sql
SELECT * FROM v_student_history
WHERE identity = '707207'
ORDER BY trimestre DESC, periodo_pensum;
```

### `v_active_trimester_detail`

Detalle del trimestre activo con los 3 parciales.

```sql
SELECT * FROM v_active_trimester_detail
WHERE identity = '707207'
  AND trimestre = (SELECT codigo FROM academic_periods WHERE activo = TRUE);
```

### `v_student_progress`

Resumen del avance: créditos logrados, porcentaje de avance, conteo de asignaturas.

```sql
SELECT * FROM v_student_progress
WHERE identity = '707207';
```

---

## Convenciones

- **PKs:** siempre `UUID` generado con `uuid_generate_v4()` (o `@default(uuid())` en Prisma).
- **Tablas:** `snake_case` en singular para Prisma (`@@map("nombre_tabla")`).
- **Timestamps:** `created_at` y `updated_at` en `TIMESTAMPTZ` en todas las tablas.
- **Soft delete:** usar `activo = FALSE` o `estado = RETIRADO` en lugar de `DELETE`.
- **IDs externos:** `identity`, `codigo_programa`, `codigo_asignatura` y `trimestre` se guardan como strings.
- **Notas:** `NUMERIC(4,2)` para calificaciones — valores de 0.00 a 5.00.
