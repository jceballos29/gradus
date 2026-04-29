# Claude Prompting Guide — Gradus
## Politécnico Internacional · Sistema de Homologación

Guía para trabajar efectivamente con Claude en el desarrollo de Gradus.
Aplica tanto para Claude Projects como para sesiones individuales.

---

## Cómo está organizado el proyecto en Claude

### Project Knowledge (siempre disponible)
Claude lee estos archivos en cada conversación automáticamente:
- `brief.md` — qué es el proyecto y para qué
- `plan.md` — arquitectura técnica completa
- `tasks.md` — checklist de progreso
- `database-schema-simple.md` — esquema de Prisma

### Instrucción del sistema del proyecto
Configura esto en las instrucciones del Claude Project:

```
Eres el asistente de desarrollo del proyecto Gradus — Sistema de Homologación del Politécnico Internacional.

El proyecto está documentado en los archivos del Knowledge. Léelos antes de responder cualquier pregunta técnica.

Reglas de trabajo:
- Avanzamos paso a paso. Nunca implementes más de lo que se pide en un mensaje.
- Antes de escribir código, confirma que entendiste el objetivo con una frase.
- Cuando termines una tarea, pregunta si está lista para marcar en tasks.md y si continuamos con la siguiente.
- Si detectas una inconsistencia con el plan.md o el esquema, señálala antes de proceder.
- El código va en español para variables y comentarios de lógica de negocio. Inglés para patrones técnicos estándar.
- Siempre indica en qué archivo y carpeta va cada fragmento de código.
```

---

## Estructura de un buen prompt

### Fórmula base

```
[CONTEXTO] + [TAREA ESPECÍFICA] + [RESTRICCIONES] + [FORMATO ESPERADO]
```

### Ejemplo malo
```
Ayúdame con la autenticación de Azure AD
```

### Ejemplo bueno
```
Estamos en T-107 — Autenticación con Azure AD en universitas-ui.

Ya tenemos:
- Proyecto Next.js corriendo en puerto 3003
- Variables de entorno configuradas (.env.local)
- proxy.ts creado con rutas públicas

Necesito crear los tres route handlers de autenticación:
- app/api/auth/login/route.ts
- app/api/auth/callback/route.ts
- app/api/auth/logout/route.ts

Usando el patrón PKCE con Azure AD. El scope debe incluir offline_access para el refresh token.

Dame primero el login/route.ts y cuando confirme que funciona pasamos al callback.
```

---

## Prompts por fase

### Fase 0 — Azure AD

**Iniciar configuración:**
```
Vamos a configurar Azure AD para el proyecto Gradus.
Estoy en la tarea [T-00X del tasks.md].

Mi situación actual:
- Tenant ID: [pegar o "aún no lo tengo"]
- Tengo acceso a portal.azure.com: [sí/no]
- El Politécnico tiene Microsoft 365: [sí/no/desconozco]

Guíame paso a paso para [tarea específica].
Muéstrame instrucciones exactas de dónde hacer clic en Azure Portal.
```

**Verificar configuración:**
```
Necesito verificar que la configuración de Azure AD es correcta antes de escribir código.

Tenant ID: [pegar]
universitas-ui Client ID: [pegar]
gradus-api Client ID: [pegar]

¿Cómo puedo obtener un token de prueba y verificar que los claims incluyen 'roles'?
Dame el comando curl o el archivo .http para probarlo.
```

---

### Fase 1 — universitas-ui

**Iniciar sesión de trabajo:**
```
Estamos en la Fase 1 de Gradus — universitas-ui (Next.js + Prisma).

Estado actual:
- [x/□] Proyecto Next.js creado (puerto 3003)
- [x/□] Prisma inicializado
- [x/□] schema.prisma escrito según database-schema-simple.md
- [x/□] Migración aplicada en universitas_db
- [x/□] Seed de datos cargado
- [x/□] Autenticación Azure AD (login, callback, logout)
- [x/□] proxy.ts configurado
- [x/□] Endpoints M2M implementados

Tarea de esta sesión: [T-1XX — descripción]
```

**Escribir schema.prisma:**
```
Necesito implementar el schema.prisma para universitas-ui basado en database-schema-simple.md del Knowledge.

Restricciones:
- Usar snake_case para nombres de tabla (@@map)
- UUID como PK generado con @default(uuid())
- timestamps createdAt y updatedAt en todas las tablas
- Los enums deben coincidir exactamente con los definidos en el esquema

Dame el schema.prisma completo. Lo revisamos antes de correr la migración.
```

**Implementar endpoint M2M:**
```
Necesito implementar GET /api/m2m/students/[identity]/history en universitas-ui.

La respuesta debe tener este formato exacto (del plan.md):
{
  "identity": "707207",
  "total_asignaturas": 28,
  "asignaturas": [
    {
      "codigo": "0547",
      "nombre": "...",
      "creditos": 4,
      "area": "FORMACION_ESPECIFICA",
      "periodo_pensum": 1,
      "trimestre": "2025-1T",
      "estado": "APROBADA",
      "nota_final": 3.80
    }
  ]
}

El endpoint debe:
1. Validar el token M2M usando m2m-validator.ts (ya existe)
2. Verificar que appid = GRADUS_API_CLIENT_ID del .env
3. Consultar academic_records via Prisma con los joins necesarios
4. Retornar 401 sin token, 403 si no es gradus-api, 404 si no existe el estudiante

Dame solo este endpoint. Los otros ya los tengo.
```

---

### Fase 2 — Gradus API (.NET)

**Iniciar sesión:**
```
Estamos en la Fase 2 — Gradus API (.NET 10 Clean Architecture).
La solución está en src/services/Gradus/.

Estado actual:
- [x/□] Solución y proyectos creados (Domain, Application, Infrastructure, API)
- [x/□] Domain: entidades y repositorios definidos
- [x/□] Infrastructure: EF Core + migración inicial
- [x/□] UniversitasClient M2M implementado
- [x/□] Lógica de homologación (Commands/Queries)
- [x/□] Generación de documentos PDF
- [x/□] Notificaciones (email + SignalR)

Tarea: [T-2XX — descripción]
```

**Implementar lógica de homologación:**
```
Necesito implementar PreviewHomologationCommand en Gradus.Application.

El comando recibe:
- studentIdentity: string (ID en Universitasxxi)
- targetProgramCode: string (programa destino)

Debe:
1. Llamar a UniversitasClient.GetHistoryAsync(identity) para obtener el historial
2. Obtener las equivalencias configuradas para el par (programa_actual → programa_destino)
3. Aplicar las reglas: nota mínima, créditos equivalentes, misma área
4. Retornar vista previa con materias que SÍ y NO se homologan, y total de créditos homologables

Las reglas están en HomologationRule y las equivalencias en SubjectEquivalence.
Dame el Command, Validator y Handler completos.
```

---

### Fase 3 — Gradus Web

**Iniciar sesión:**
```
Estamos en la Fase 3 — Gradus Web (Next.js 16, puerto 3004).
Gradus.API: http://localhost:5002
universitas-ui: http://localhost:3003

La autenticación usa el mismo patrón de proxy.ts + Azure AD que universitas-ui.

Estado actual:
- [x/□] Proyecto Next.js creado
- [x/□] Autenticación Azure AD implementada
- [x/□] proxy.ts configurado
- [x/□] Cliente de Gradus API (lib/gradus-api.ts)
- [x/□] Vista del estudiante
- [x/□] Vista del coordinador
- [x/□] Notificaciones in-app (SignalR)

Tarea: [T-3XX — descripción]
```

---

## Prompts para situaciones específicas

### Cuando hay un error

```
Tengo este error en [archivo]:

ERROR:
[pegar el error completo — no resumas]

CONTEXTO:
- Fase: [X]
- Tarea: [T-XXX]
- Lo que hace el código: [una línea]

CÓDIGO:
[pegar solo el fragmento relevante, máx 50 líneas]

¿Cuál es el problema y cómo lo corrijo?
```

### Cuando algo no compila

```
El build falla con estos errores:

[pegar output de: dotnet build 2>&1 | grep "error CS"]
o
[pegar output de: pnpm build]

El archivo que está fallando es: [ruta completa]
Su contenido actual: [pegar el archivo]
```

### Cuando el flujo no funciona como esperado

```
El flujo [describir] no funciona como esperaba.

ESPERADO: [describir qué debería pasar]
REAL: [describir qué está pasando]

Network tab: [requests relevantes con status codes]

¿Qué puede estar causando esto?
Revisa el plan.md para confirmar si estamos haciendo algo diferente a lo planificado.
```

### Para revisar código antes de continuar

```
Antes de pasar a la siguiente tarea, revisa este código:

[pegar el código]

Verifica:
1. Que cumple con la arquitectura del plan.md
2. Que no hay violaciones de Clean Architecture (si es .NET)
3. Que maneja correctamente los errores
4. Que el contrato de API coincide con lo definido en plan.md

Si hay algo que mejorar, dímelo antes de continuar.
```

### Para pedir una explicación antes de implementar

```
Antes de implementar [concepto/tecnología], explícame:
- Qué es y para qué sirve en el contexto de Gradus
- Cómo encaja con el resto de la arquitectura
- Qué alternativas hay y por qué elegimos esta

Luego de la explicación, implementamos juntos.
```

---

## Reglas de oro

**1. Una tarea a la vez**
No pidas "implementa toda la autenticación". Pide "implementa solo el login/route.ts".

**2. Siempre indica el estado actual**
Claude no sabe qué tienes y qué no. Dile exactamente qué archivos ya existen.

**3. Pega errores completos**
No resumas el error. El mensaje exacto, la línea, el stack trace completo.

**4. Confirma antes de seguir**
Después de cada implementación, prueba que funciona y díselo a Claude antes de pedir la siguiente tarea.

**5. Referencia el plan.md**
Cuando dudes de una decisión técnica: "¿Esto es consistente con el plan.md?"

**6. Especifica el formato esperado**
Si necesitas una respuesta específica de un endpoint, pega el JSON exacto del plan.md.

**7. Divide y conquistarás**
Un endpoint complejo → primero el handler, luego el validator, luego el controller.

---

## Cómo actualizar tasks.md

Al completar una tarea:
```
La tarea T-107 está completa y probada.
Dame el tasks.md actualizado con [x] en esa tarea
y con la fecha de hoy en la tabla de progreso de Fase 1.
```

---

## Señales de que el prompt necesita mejorar

- Claude da código que no pediste → el prompt era muy amplio
- Claude hace preguntas antes de responder → faltó contexto
- El código no compila → no especificaste las dependencias existentes
- Claude ignora el plan.md → recuérdale que lo consulte
- La respuesta es muy genérica → agrega más detalles del caso específico
