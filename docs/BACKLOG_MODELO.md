# Backlog Modelo — Fenix Posgrado 2026

Este documento define las historias de usuario base del proyecto. Cada equipo debe importarlas a **GitHub Projects** y refinarlas con criterios de aceptación específicos para su contexto.

> **Convención de ID:** `US-[MÓDULO]-[NÚMERO]`  
> Ejemplos: US-CORE-001, US-B-001, US-C-001, US-D-001

---

## Épica 1: Gestión de Admisión y Legajo (Core — Obligatorio)

### US-CORE-001 · Formulario de inscripción
**Como** aspirante,  
**quiero** completar mis datos personales y académicos en un formulario web,  
**para que** quede registrada mi intención de postularme a una carrera de posgrado.

**Criterios de aceptación:**
- [ ] El formulario valida cada campo en tiempo real (sin esperar el submit)
- [ ] El DNI debe ser único en la cohorte activa actual
- [ ] El email ingresado recibe confirmación automática de recepción
- [ ] Si el aspirante cierra el navegador, sus datos se recuperan al volver con el mismo email
- [ ] El sistema crea el legajo en estado "Pendiente" al enviar

**Estimación:** 5 pts | **Prioridad:** Must | **Sprint:** 1

---

### US-CORE-002 · Solicitud de beca en el formulario
**Como** aspirante que necesita apoyo económico,  
**quiero** indicar si solicito beca y en qué porcentaje,  
**para que** mi solicitud quede registrada junto con el formulario correspondiente.

**Criterios de aceptación:**
- [ ] Al marcar "Solicito beca", aparecen opciones: 30% / 100%
- [ ] El campo para adjuntar formulario de beca (PDF) se vuelve obligatorio
- [ ] El tipo de beca solicitada es visible para el coordinador en el dashboard

**Estimación:** 2 pts | **Prioridad:** Must | **Sprint:** 1

---

### US-CORE-003 · Upload de documentos PDF
**Como** aspirante,  
**quiero** adjuntar mis documentos en formato PDF,  
**para** completar mi legajo digital sin necesidad de enviar papeles físicos.

**Criterios de aceptación:**
- [ ] Se aceptan SOLO archivos PDF (validación MIME, no solo extensión)
- [ ] Tamaño máximo: 5MB por archivo (con mensaje de error antes de transferir)
- [ ] El archivo se almacena con nombre UUID (no el original del usuario)
- [ ] Se calcula y almacena el checksum SHA-256 del archivo
- [ ] El coordinador puede ver una vista previa de cada PDF desde el dashboard
- [ ] Los PDFs NO son accesibles por URL directa

**Estimación:** 5 pts | **Prioridad:** Must | **Sprint:** 1

---

### US-CORE-004 · Control de documentos obligatorios
**Como** aspirante,  
**quiero** saber exactamente qué documentos me faltan,  
**para** poder completar mi legajo sin consultar a la secretaría.

**Criterios de aceptación:**
- [ ] El sistema muestra el estado de cada documento requerido (Cargado ✓ / Pendiente ✗)
- [ ] No permite "Enviar a revisión" si falta algún documento obligatorio
- [ ] Resalta en rojo los documentos faltantes con nombre descriptivo

**Estimación:** 2 pts | **Prioridad:** Must | **Sprint:** 1

---

### US-CORE-005 · Workflow de estados del legajo
**Como** coordinador de carrera,  
**quiero** cambiar el estado de los legajos con transiciones controladas,  
**para** llevar el control del proceso de admisión.

**Criterios de aceptación:**
- [ ] Las transiciones de estado siguen estrictamente el diagrama del SRS (RF-CORE-003)
- [ ] Solo el coordinador puede mover el legajo a "En Revisión" o "Aprobado"
- [ ] Solo el aspirante puede mover su legajo de "Observado" a "Pendiente" (al corregir)
- [ ] Cada cambio de estado queda registrado en un log de auditoría (quién, cuándo, de qué estado a qué estado)
- [ ] Al aprobar se genera automáticamente el número de legajo (formato: AÑO-COHORTE-SECUENCIAL)

**Estimación:** 8 pts | **Prioridad:** Must | **Sprint:** 1-2

---

### US-CORE-006 · Notificaciones automáticas por email
**Como** aspirante,  
**quiero** recibir emails automáticos en los cambios de estado de mi legajo,  
**para** no tener que consultar constantemente el sistema.

**Criterios de aceptación:**
- [ ] Email de confirmación al enviar el formulario (estado → Pendiente)
- [ ] Email con detalles de la observación cuando el estado es "Observado"
- [ ] Email de aprobación cuando el legajo pasa a "Completado"
- [ ] Los emails usan plantillas HTML (no texto plano) con logo UTN

**Estimación:** 3 pts | **Prioridad:** Must | **Sprint:** 1-2

---

### US-CORE-007 · Búsqueda y filtrado de legajos
**Como** coordinador,  
**quiero** buscar y filtrar legajos por múltiples criterios,  
**para** encontrar la información de un aspirante en segundos.

**Criterios de aceptación:**
- [ ] Búsqueda por DNI exacto con resultado en <2 segundos
- [ ] Búsqueda parcial por apellido (case-insensitive, mínimo 3 caracteres)
- [ ] Filtros combinables: Estado, Cohorte, Carrera, Tiene beca (Sí/No)
- [ ] Los resultados muestran: Nº Legajo, Apellido y nombre, DNI, Estado, Carrera

**Estimación:** 5 pts | **Prioridad:** Must | **Sprint:** 2

---

### US-CORE-008 · Exportación Excel de legajos
**Como** coordinadora administrativa,  
**quiero** exportar el listado de inscriptos a Excel,  
**para** preparar reportes para las autoridades de la facultad.

**Criterios de aceptación:**
- [ ] Exporta los resultados de la búsqueda activa actual (no toda la BD)
- [ ] El Excel tiene: headers en negrita, columnas ajustadas, filtros automáticos habilitados
- [ ] El nombre del archivo incluye la fecha: `inscriptos-cohorte2026-YYYY-MM-DD.xlsx`

**Estimación:** 3 pts | **Prioridad:** Should | **Sprint:** 2

---

### US-CORE-009 · Gestión del período de inscripción
**Como** coordinador,  
**quiero** abrir y cerrar el período de inscripción,  
**para** controlar cuándo los aspirantes pueden completar el formulario.

**Criterios de aceptación:**
- [ ] Solo el coordinador puede abrir/cerrar el período (BR-009)
- [ ] Con período cerrado, el formulario muestra mensaje: "La inscripción está cerrada. Próxima apertura: [fecha]"
- [ ] Múltiples cohortes pueden coexistir con períodos independientes

**Estimación:** 2 pts | **Prioridad:** Must | **Sprint:** 2

---

### US-CORE-010 · Vencimiento automático de reserva de vacante
**Como** sistema,  
**quiero** cambiar automáticamente el estado de legajos aprobados no confirmados,  
**para** liberar vacantes después del plazo establecido.

**Criterios de aceptación:**
- [ ] A los 30 días corridos desde "Completado" sin pasar a "Activo" → estado cambia a "Vencido"
- [ ] El coordinador recibe email de notificación al producirse el cambio
- [ ] La tarea programada se ejecuta una vez por día (job/cron)

**Estimación:** 3 pts | **Prioridad:** Must | **Sprint:** 2

---

## Épica 2: Gestión Docente (Módulo B)

### US-B-001 · Acceso del docente a su planilla
**Como** docente,  
**quiero** acceder a la planilla de mi seminario mediante un link específico,  
**para** no necesitar recordar usuario/contraseña y acceder directamente a mis alumnos.

**Criterios de aceptación:**
- [ ] El coordinador genera el link desde el panel de administración
- [ ] El link contiene un token seguro único (≥32 bytes random)
- [ ] Al acceder, el docente ve SOLO los estudiantes de su seminario (BR-007)
- [ ] El link tiene fecha de expiración configurable (por defecto: fin del cuatrimestre)

**Estimación:** 3 pts | **Prioridad:** Must | **Sprint:** 3

---

### US-B-002 · Registro de nueva clase y asistencia
**Como** docente,  
**quiero** registrar la asistencia de mis alumnos en cada clase,  
**para** que el sistema calcule automáticamente el porcentaje sin que yo haga ningún cálculo.

**Criterios de aceptación:**
- [ ] Botón "Nueva clase" → aparece columna con la fecha de hoy (editable)
- [ ] Cada celda es un checkbox: marcado = Presente, sin marcar = Ausente
- [ ] El sistema guarda automáticamente cada cambio en ≤500ms (autosave)
- [ ] El porcentaje de asistencia de cada alumno se recalcula al instante
- [ ] Fórmula: (clases presentes / total clases dictadas) × 100 (BR-002)

**Estimación:** 8 pts | **Prioridad:** Must | **Sprint:** 3

---

### US-B-003 · Descarga de planilla en Excel
**Como** docente,  
**quiero** descargar la planilla de asistencia en Excel,  
**para** tener un respaldo físico o digital en el formato que estoy acostumbrado.

**Criterios de aceptación:**
- [ ] Descarga .xlsx con: Apellido, Nombre, Email, Carrera de grado, columna por cada fecha con P/A
- [ ] El % de asistencia aparece calculado en la última columna

**Estimación:** 3 pts | **Prioridad:** Should | **Sprint:** 3

---

### US-B-004 · Carga de nota final del seminario
**Como** docente,  
**quiero** registrar la nota final de cada estudiante,  
**para** que el sistema actualice automáticamente su condición en la asignatura.

**Criterios de aceptación:**
- [ ] Solo acepta valores 1-10 con hasta 1 decimal
- [ ] Nota ≥4 AND asistencia ≥75% → estado del seminario: "Aprobado" (BR-003)
- [ ] Nota <4 → estado: "Desaprobado" (independientemente de asistencia)
- [ ] Asistencia <75% aunque nota ≥4 → estado: "Libre" (condicional)
- [ ] El legajo del estudiante en Core se actualiza en tiempo real

**Estimación:** 5 pts | **Prioridad:** Must | **Sprint:** 3

---

### US-B-005 · Recordatorio automático de carga de notas
**Como** coordinador,  
**quiero** que el sistema envíe recordatorios automáticos a docentes con carga pendiente,  
**para** evitar retrasos en el cierre de actas.

**Criterios de aceptación:**
- [ ] Si faltan ≤48hs para la fecha límite y hay notas sin cargar → email de recordatorio
- [ ] Los recordatorios se repiten cada 24hs hasta que se complete la carga o venza el plazo
- [ ] El email incluye: nombre del seminario, cantidad de alumnos sin nota, link directo a la planilla

**Estimación:** 3 pts | **Prioridad:** Should | **Sprint:** 4

---

## Épica 3: Seguimiento de Graduación (Módulo C)

### US-C-001 · Alta de Trabajo Final / Tesis
**Como** integrante del CPR,  
**quiero** registrar los datos del trabajo final de un estudiante,  
**para** que quede centralizado junto con el resto de su legajo académico.

**Criterios de aceptación:**
- [ ] Solo usuarios con rol CPR pueden crear/modificar registros de tesis (BR-004)
- [ ] Campos: Tipo (TFI/Maestría/Doctorado), Título, Director, Codirector (opcional), Fecha CPR, Nº Resolución
- [ ] El intento de modificación por roles no autorizados devuelve 403 y se registra en auditoría

**Estimación:** 3 pts | **Prioridad:** Must | **Sprint:** 3

---

### US-C-002 · Semáforo de riesgo académico
**Como** coordinador de carrera,  
**quiero** ver el estado de riesgo de cada estudiante con un indicador visual,  
**para** poder intervenir antes de que sea demasiado tarde.

**Criterios de aceptación:**
- [ ] El semáforo se recalcula automáticamente cada día (tarea programada)
- [ ] Reglas según tipo de carrera definidas en SRS RF-GRAD-002
- [ ] El VERDE solo puede asignarse manualmente (BR-008)
- [ ] Los cambios de estado se loggean con timestamp

**Estimación:** 8 pts | **Prioridad:** Must | **Sprint:** 3

---

### US-C-003 · Dashboard de estudiantes en riesgo
**Como** coordinador,  
**quiero** ver un listado de estudiantes en estado ROJO,  
**para** priorizar mi intervención con los casos más críticos.

**Criterios de aceptación:**
- [ ] Dashboard filtra automáticamente estudiantes con semáforo ROJO
- [ ] Muestra: Nombre, Carrera, Fecha inscripción, Seminarios adeudados, Días sin avance
- [ ] Permite exportar el listado a Excel
- [ ] Los estudiantes aparecen ordenados por criticidad (más días en rojo primero)

**Estimación:** 5 pts | **Prioridad:** Must | **Sprint:** 3

---

### US-C-004 · Alertas automáticas por vencimiento de plazos
**Como** coordinador,  
**quiero** recibir alertas automáticas cuando estudiantes cruzan umbrales de riesgo,  
**para** no necesitar revisar el dashboard a diario.

**Criterios de aceptación:**
- [ ] Email automático al coordinador cuando un estudiante cambia a ROJO
- [ ] El email incluye: nombre del estudiante, motivo del cambio, días restantes antes del vencimiento

**Estimación:** 3 pts | **Prioridad:** Should | **Sprint:** 4

---

## Épica 4: Analytics e Inteligencia Académica (Módulo D)

### US-D-001 · Dashboard de estadísticas de cohorte
**Como** directora de posgrado,  
**quiero** ver métricas de inscripción y retención por cohorte,  
**para** tener información actualizada sin tener que cruzar planillas manualmente.

**Criterios de aceptación:**
- [ ] Métricas por cohorte: Total inscriptos, Activos, Graduados, En riesgo, Dados de baja
- [ ] Gráfico comparativo entre cohortes (últimas 3)
- [ ] Dashboard carga en <3 segundos con datos de 3 cohortes activas
- [ ] Filtro por tipo de carrera (Especialización / Maestría / Doctorado)

**Estimación:** 8 pts | **Prioridad:** Must | **Sprint:** 3

---

### US-D-002 · Tasa de desgranamiento
**Como** directora de posgrado,  
**quiero** ver la tasa de desgranamiento por cohorte,  
**para** identificar en qué momento del cursado se producen más abandonos.

**Criterios de aceptación:**
- [ ] Desgranamiento = (estudiantes dados de baja / total inscriptos) × 100
- [ ] Visualización por semestre de cursada (¿cuándo se van?)
- [ ] Comparativa entre cohortes en gráfico de líneas

**Estimación:** 5 pts | **Prioridad:** Should | **Sprint:** 3

---

### US-D-003 · Exportación de reporte a Excel
**Como** secretaria administrativa,  
**quiero** descargar reportes estadísticos en Excel,  
**para** adjuntarlos en informes a las autoridades.

**Criterios de aceptación:**
- [ ] Botón "Exportar Excel" disponible en cada sección del dashboard
- [ ] El Excel tiene: headers en negrita, columnas ajustadas, filtros automáticos
- [ ] Hoja adicional con metadatos: fecha de generación, filtros activos, usuario que exportó

**Estimación:** 3 pts | **Prioridad:** Should | **Sprint:** 3

---

### US-D-004 · Notificaciones automáticas a docentes por demora
**Como** coordinador,  
**quiero** que el sistema detecte docentes que no cargaron asistencia en más de 2 semanas,  
**para** enviarles un recordatorio automático sin que yo tenga que hacerlo manualmente.

**Criterios de aceptación:**
- [ ] Si el docente no registró clases en >14 días → email recordatorio
- [ ] El coordinador recibe copia del email enviado al docente

**Estimación:** 3 pts | **Prioridad:** Should | **Sprint:** 4

---

## Historias Técnicas (No funcionales, pero obligatorias)

### US-TECH-001 · Setup de CI/CD
**Como** equipo de desarrollo,  
**quiero** que cada Pull Request ejecute automáticamente lint + tests + build,  
**para** detectar problemas antes de mergear.

**Criterios de aceptación:**
- [ ] GitHub Actions ejecuta en cada PR: linting (ESLint o Flake8), tests unitarios, build exitoso
- [ ] Un PR no puede mergearse si la pipeline falla
- [ ] El badge de estado del pipeline es visible en el README

**Estimación:** 3 pts | **Prioridad:** Must | **Sprint:** 0

---

### US-TECH-002 · Ambiente Docker reproducible
**Como** cualquier integrante del equipo,  
**quiero** levantar todo el ambiente de desarrollo con un solo comando,  
**para** no perder tiempo en configuraciones manuales.

**Criterios de aceptación:**
- [ ] `docker-compose up -d` levanta: base de datos, backend y frontend
- [ ] `npm run db:migrate` (o equivalente) aplica todas las migraciones
- [ ] La app es accesible en `http://localhost:3000` sin configuración adicional
- [ ] `.env.example` está actualizado con todas las variables necesarias

**Estimación:** 3 pts | **Prioridad:** Must | **Sprint:** 0

---

### US-TECH-003 · Documentación de API (Swagger)
**Como** integrante de otro equipo que necesita consumir la API,  
**quiero** que todos los endpoints estén documentados en Swagger,  
**para** no tener que leer el código para entender cómo usar la API.

**Criterios de aceptación:**
- [ ] OpenAPI 3.0 accesible en `/api/docs` en ambiente desarrollo
- [ ] Todos los endpoints documentados con: descripción, parámetros, respuestas y ejemplos
- [ ] Los contratos de integración definidos en BFD/PRD están implementados exactamente

**Estimación:** 3 pts | **Prioridad:** Must | **Sprint:** 1-2 (incremental)

---

## Plantilla para Nuevas Historias

```markdown
### US-[MOD]-[NNN] · [Título breve]
**Como** [rol del usuario],
**quiero** [acción que quiero realizar],
**para** [beneficio o valor que obtengo].

**Criterios de aceptación:**
- [ ] Criterio 1 (verificable, sin ambigüedad)
- [ ] Criterio 2

**Estimación:** [1/2/3/5/8] pts | **Prioridad:** [Must/Should/Could] | **Sprint:** [número]
**Referencia:** [RF-XXXX-NNN del SRS] | **Requiere:** [US-XXX si hay dependencia]
```

---

## Estado del Backlog por Módulo

| Módulo | Historias [M] | Historias [S] | Total | Puntos estimados |
|--------|:---:|:---:|:---:|:---:|
| **Core** | 9 | 1 | 10 | ~44 pts |
| **Módulo B** | 3 | 2 | 5 | ~22 pts |
| **Módulo C** | 3 | 1 | 4 | ~19 pts |
| **Módulo D** | 2 | 3 | 5 | ~22 pts |
| **Técnicas** | 3 | 0 | 3 | ~9 pts |
| **TOTAL** | 20 | 7 | **27** | **~116 pts** |

> **Velocidad esperada del equipo:** 15-20 pts/sprint (sprint de 2 semanas). Backlog alcanzable en ~6-8 sprints.

---

*Importar este backlog a GitHub Projects. Refinamiento en Sprint Planning de cada semana.*
