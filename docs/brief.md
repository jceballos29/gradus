# Gradus — Brief del Proyecto

**Institución:** Politécnico Internacional  
**Proyecto:** Sistema de Homologación — Gradus  
**Fecha:** Abril 2026  
**Estado:** En desarrollo

---

## ¿Qué es Gradus?

Gradus es una plataforma digital que permite a los estudiantes del Politécnico Internacional solicitar homologaciones de asignaturas entre programas académicos de la misma institución, de forma ágil, transparente y con trazabilidad completa.

El sistema automatiza la verificación del historial académico del estudiante, aplica las reglas institucionales de homologación y genera el documento legal correspondiente cuando el coordinador aprueba la solicitud.

---

## Problema que resuelve

Actualmente el proceso de homologación en el Politécnico es manual:

- El estudiante lleva documentos físicos al coordinador
- El coordinador revisa manualmente el historial y el pensum destino
- No hay trazabilidad del estado de la solicitud
- El documento legal se genera de forma artesanal
- No hay notificaciones — el estudiante debe hacer seguimiento presencial

Gradus digitaliza y automatiza todo este proceso.

---

## Producto final

Un ecosistema de tres aplicaciones integradas:

### 1. Portal Universitario (`universitas-ui`)
Portal académico del estudiante. Muestra el historial de notas, el progreso en la carrera y los datos académicos completos. Es la fuente de verdad del historial académico — Gradus consume sus datos via API segura (M2M).

**Usuarios:** Estudiantes, Coordinadores  
**Tecnología:** Next.js 16 + Prisma + PostgreSQL

### 2. Sistema de Homologación (`gradus-web` + `gradus-mobile`)
La aplicación principal del proyecto. Permite al estudiante iniciar una solicitud de homologación, ver la vista previa generada automáticamente, y hacer seguimiento del estado. Al coordinador le permite revisar, aprobar o rechazar solicitudes y generar el documento legal firmado.

**Usuarios:** Estudiantes (solicitar), Coordinadores (revisar y aprobar)  
**Tecnología:** Next.js 16 (web) + React Native (móvil) + .NET 10 API + PostgreSQL

### 3. Autenticación centralizada (Azure AD)
Microsoft Entra ID gestiona la autenticación SSO para todas las aplicaciones. El estudiante inicia sesión una vez con su cuenta institucional y accede a todas las apps del ecosistema sin volver a autenticarse.

---

## Usuarios del sistema

### Estudiante
- Visualiza su historial académico completo
- Selecciona el programa al que desea cambiarse
- Ve la vista previa de la homologación (qué materias se homologan y con qué nota)
- Acepta o rechaza la vista previa
- Hace seguimiento del estado de su solicitud
- Recibe notificaciones cuando su solicitud es aprobada o rechazada

### Coordinador Académico
- Define las reglas de homologación entre programas (nota mínima, créditos equivalentes, área de formación)
- Define las equivalencias entre asignaturas de distintos programas
- Revisa las solicitudes pendientes
- Aprueba o rechaza con observaciones
- Genera el documento legal de homologación (PDF con plantilla institucional)
- Recibe notificaciones cuando hay solicitudes pendientes

---

## Flujo del proceso de homologación

```
Coordinador configura reglas y equivalencias entre programas
                        ↓
Estudiante selecciona el programa destino
                        ↓
Sistema consulta historial en Portal Universitario (via M2M)
                        ↓
Sistema aplica reglas → genera vista previa de homologación
  (qué materias se homologan, con qué nota, cuáles no aplican)
                        ↓
Estudiante revisa y acepta la vista previa
                        ↓
Solicitud enviada a revisión
  → Notificación al coordinador (email + in-app)
                        ↓
Coordinador revisa la solicitud
                        ↓
    ┌─────────────────────────────────┐
    │  Aprueba          Rechaza       │
    │      ↓                ↓        │
    │ Genera PDF        Observación   │
    │ con plantilla     al estudiante │
    │ institucional          ↓       │
    │      ↓         Notificación    │
    │ Notificación    al estudiante  │
    │ al estudiante                  │
    └─────────────────────────────────┘
```

---

## Reglas de homologación

Una asignatura es homologable cuando cumple **todas** las condiciones definidas por el coordinador:

- Nota mínima aprobatoria en la materia origen
- Créditos equivalentes entre la materia origen y la destino
- Misma área de formación (FORMACION_ESPECIFICA, FORMACION_BASICA, etc.)
- Contenido temático similar (criterio del coordinador al configurar equivalencias)

El coordinador también puede definir **excepciones manuales** — homologar una materia específica aunque no cumpla todas las reglas automáticas.

---

## Lo que Gradus NO hace

- No modifica el historial académico en Universitasxxi — solo lo consulta
- No gestiona matrículas ni inscripciones
- No maneja homologaciones externas (de otras instituciones)
- No tiene integración directa con Universitasxxi aún (datos mock en MVP)

---

## Fases de desarrollo

| Fase | Descripción | Estado |
|---|---|---|
| Fase 1 | Azure AD + Portal Universitario (web) | Pendiente |
| Fase 2 | Gradus API (.NET) + Gradus Web (Next.js) — MVP | Pendiente |
| Fase 3 | Generación de documentos PDF | Pendiente |
| Fase 4 | Notificaciones email + in-app | Pendiente |
| Fase 5 | Gradus Mobile (React Native) | Pendiente |
| Fase 6 | Integración real con Universitasxxi API | Pendiente |
| Fase 7 | Despliegue en producción | Pendiente |
