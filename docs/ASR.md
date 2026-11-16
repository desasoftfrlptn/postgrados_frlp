# ASR — Requisitos Arquitectónicamente Significativos
## postgrado Posgrado · 2026

Un **ASR** es un requisito que impacta directamente en las decisiones de arquitectura del sistema. Si el equipo no considera estos requisitos desde el inicio, deberá hacer cambios costosos más adelante.

**Instrucción para los equipos:** Cada equipo debe revisar estos ASR base y agregar al menos 2 ASR específicos de su módulo asignado antes de la semana 3.

---

## ASR-001: Almacenamiento Seguro de Documentos PDF

**Módulo afectado:** Core  
**Atributo de calidad:** Seguridad (Confidencialidad)  
**Fuente:** NFR-S02, BR-006

**Preocupación:**  
Los documentos subidos por los aspirantes (DNI, títulos, partidas de nacimiento) son información personal sensible. No pueden ser accesibles públicamente.

**Escenario de falla:**  
Un usuario malintencionado construye la URL `https://app.example/uploads/dni-30456789.pdf` y accede al documento sin autenticación.

**Escenario correcto:**  
El mismo intento devuelve HTTP 404 o 403. Los archivos no están servidos desde el webroot. Solo son accesibles via `GET /api/v1/documentos/{id}/download` con JWT válido y verificación de que el solicitante tiene permisos sobre ese documento.

**Decisión de diseño:**  
- Almacenamiento en directorio fuera del webroot: `/var/postgrado-storage/uploads/`
- Servicio de descarga como endpoint autenticado
- Nombre de archivo en disco: UUID generado por el servidor (nunca el nombre original)
- Logging de todos los accesos a documentos

**Riesgo si no se implementa:** Exposición de datos personales, incumplimiento de normativa de privacidad, responsabilidad legal.

---

## ASR-002: Segregación de Datos por Rol de Docente

**Módulo afectado:** Módulo B  
**Atributo de calidad:** Seguridad (Control de Acceso)  
**Fuente:** BR-007, NFR-S01

**Preocupación:**  
Un docente del seminario "Metodología" no debe poder ver ni modificar los datos de asistencia del seminario "Estadística Aplicada", aunque ambos pertenezcan a la misma cohorte.

**Escenario de falla:**  
El docente Pérez (asignado al seminario 88) hace `GET /api/v1/seminarios/99/estudiantes` y el sistema retorna los datos.

**Escenario correcto:**  
La API retorna HTTP 403 Forbidden. El guard de autorización verifica que el `seminario_id` solicitado pertenezca a los seminarios del docente en el JWT.

**Decisión de diseño:**  
Middleware/Guard de autorización que, para cada request de docente, verifica que el recurso solicitado pertenezca a los seminarios del docente según el claim del JWT. La verificación se hace una sola vez en el guard, no en cada método del controller.

---

## ASR-003: Consistencia del Algoritmo de Semáforo

**Módulo afectado:** Módulo C  
**Atributo de calidad:** Corrección (Consistencia de datos)  
**Fuente:** RF-GRAD-002, BR-008

**Preocupación:**  
El semáforo debe calcularse consistentemente, sin importar quién lo consulta ni cuándo. Dos consultas al mismo estudiante en el mismo momento deben retornar el mismo resultado.

**Escenario de falla:**  
El cálculo del semáforo se hace en el frontend con datos parciales → los valores difieren según el estado local de la UI.

**Escenario correcto:**  
El semáforo se calcula SIEMPRE en el servidor (capa de dominio). El resultado se almacena en la base de datos y se recalcula por tarea programada diaria. El frontend solo muestra el valor almacenado.

**Pseudocódigo del algoritmo:**
```
calcularSemaforo(legajo: Legajo): 'VERDE' | 'AMARILLO' | 'ROJO'
  diasTranscurridos = hoy - legajo.fechaInscripcion
  duracion = duracionNormativaEnDias(legajo.tipoCarrera)
  porcentajeTiempo = diasTranscurridos / duracion
  
  si legajo.semaforo_manual: retornar legajo.semaforo  // Sobreescritura manual
  si esRojo(legajo, porcentajeTiempo): retornar ROJO
  si esAmarillo(legajo, porcentajeTiempo): retornar AMARILLO
  retornar VERDE
```

**Restricción:** El cálculo no puede estar en stored procedures de la BD (dificulta el testing). Debe estar en la capa de dominio (testeable unitariamente).

---

## ASR-004: Escalabilidad del Upload de Archivos

**Módulo afectado:** Core  
**Atributo de calidad:** Rendimiento (bajo carga)  
**Fuente:** NFR-P05, A-002

**Preocupación:**  
Durante el período de inscripción, múltiples aspirantes podrían subir documentos simultáneamente. Un upload lento o que bloquee el servidor degradaría la experiencia de todos.

**Escenario de carga:**  
50 aspirantes suben simultáneamente un PDF de 5MB cada uno durante las últimas horas antes del cierre de inscripción.

**Respuesta esperada:**  
El servidor acepta y procesa todos los uploads sin retornar errores 500 o timeouts.

**Decisión de diseño:**  
- Recepción del archivo en streaming (no cargar en memoria completa antes de escribir)
- Validación de tamaño y MIME antes de almacenar
- Timeout de upload configurado en ≥60 segundos en el servidor
- Si el volumen crece en el futuro: migrar a queue de procesamiento (Bull/Celery)

---

## ASR adicionales del equipo 👩‍💻👨‍💻🤝

## ASR-005: Control de acceso por enlace tokenizado para docentes

**Módulo afectado:** Gestión Docente  
**Atributo de calidad:** Seguridad  
**Fuente:** RF-03

**Preocupación:**  
El acceso docente se realiza mediante un enlace específico. Sin control adecuado, un enlace interceptado o adivinado podría permitir que un tercero acceda a datos académicos de estudiantes y cargue información fraudulenta.

**Escenario de falla:**  
Un docente reenvía por error el enlace de acceso a su planilla. Un tercero accede, modifica calificaciones y porcentajes de asistencia, afectando el estado académico de estudiantes sin que el sistema lo detecte ni lo registre.

**Escenario correcto:**  
Cada enlace generado está asociado a un token de un solo uso con expiración temporal, vinculado a la identidad del docente y al seminario específico. Cualquier intento de acceso desde un contexto distinto (IP diferente, token ya utilizado o expirado) es rechazado y registrado en el log de auditoría.

**Decisión de diseño:**  
Implementar tokens JWT firmados con tiempo de expiración configurable (ej. 72 hs), scope restringido al seminario asignado, y registro de cada acceso en una tabla de auditoría inmutable. El token se invalida tras el cierre del período de carga.

**Riesgo si no se implementa:**  
Adulteración silenciosa de registros académicos sin trazabilidad, comprometiendo la integridad del legajo del estudiante.

---

## ASR-006: Propagación atómica de asistencia y calificaciones al perfil del estudiante

**Módulo afectado:** Gestión Docente  
**Atributo de calidad:** Corrección  
**Fuente:** RF-03

**Preocupación:**  
La carga docente debe impactar automáticamente en el estado académico del estudiante. Si esta sincronización falla parcialmente, el perfil del estudiante quedaría en un estado inconsistente (ej. asistencia actualizada pero calificación no, o viceversa).

**Escenario de falla:**  
Un docente carga la nota final de un seminario. El sistema actualiza la calificación pero falla antes de recalcular el porcentaje de asistencia. El semáforo del perfil del estudiante queda desactualizado, y el equipo de conducción toma decisiones sobre datos incorrectos.

**Escenario correcto:**  
Cada operación de carga docente se ejecuta dentro de una transacción que agrupa la actualización de asistencia, calificación y recálculo del estado académico. Si cualquier paso falla, se realiza rollback completo y se notifica al docente para que reintente.

**Decisión de diseño:**  
Aplicar el patrón Unit of Work sobre una transacción de base de datos que englobe todas las entidades afectadas. Los recálculos de estado (porcentaje de asistencia, condición en asignatura) se ejecutan como procedimientos dentro de la misma transacción, no como procesos asincrónicos posteriores.

**Riesgo si no se implementa:**  
Inconsistencia silenciosa entre lo registrado por el docente y lo visible en el perfil del estudiante, con impacto directo en decisiones académicas y administrativas.

---

## ASR-007: Restricción de escritura sobre datos de tesis a la CPR

**Módulo afectado:** Seguimiento de Graduación  
**Atributo de calidad:** Seguridad  
**Fuente:** RF-07

**Preocupación:**  
Los datos de tesis (título, director/a, codirector/a, fecha de aprobación CPR, número de resolución) solo deben ser cargados por la Comisión de Posgrado Regional. Si otros roles pueden modificar estos campos, se compromete la validez jurídica de la información registrada.

**Escenario de falla:**  
Un miembro del equipo de conducción, con acceso general al perfil del estudiante, edita por error el número de resolución de una tesis aprobada. El sistema acepta el cambio sin validación de rol, y el registro queda alterado sin rastro del dato original.

**Escenario correcto:**  
Los campos de tesis están protegidos por control de acceso basado en roles (RBAC). Solo usuarios con el rol CPR pueden escribir sobre ellos. Cualquier intento de modificación desde otro rol devuelve un error 403 y queda registrado en el log de auditoría con usuario, timestamp y dato intentado.

**Decisión de diseño:**  
Implementar RBAC con granularidad a nivel de campo para el módulo de graduación. Las políticas de autorización se centralizan en una capa de servicio, no en la capa de presentación.

**Riesgo si no se implementa:**  
Alteración de información con valor institucional y legal, sin capacidad de detectar quién realizó el cambio ni recuperar el valor anterior.

---

## ASR-008: Validación de plazos normativos por tipo de carrera

**Módulo afectado:** Seguimiento de Graduación  
**Atributo de calidad:** Corrección  
**Fuente:** RF-11

**Preocupación:**  
El sistema debe calcular alertas de vencimiento de seminarios según los plazos definidos por normativa vigente, que varían según el tipo de carrera (especialización, maestría, doctorado). Un cálculo incorrecto produce alertas tardías o inexistentes, afectando el seguimiento del equipo de conducción.

**Escenario de falla:**  
Un estudiante de doctorado cursa bajo plazos distintos a los de especialización. El sistema aplica la misma regla de vencimiento para ambos casos. El equipo de conducción no recibe alerta sobre un estudiante próximo a exceder el plazo doctoral, y el caso de ralentización no es detectado a tiempo.

**Escenario correcto:**  
El sistema consulta una tabla de configuración de plazos parametrizable por tipo de carrera. Al registrar cada seminario, asocia el plazo correcto según el tipo de carrera del estudiante. Las alertas se generan comparando la fecha actual contra ese plazo calculado individualmente.

**Decisión de diseño:**  
Separar la lógica de cálculo de plazos en un servicio de dominio independiente, alimentado por una tabla de configuración editable por administradores sin necesidad de modificar código. Esto permite adaptar los plazos ante cambios normativos sin redeploy.

**Riesgo si no se implementa:**  
Estudiantes en situación de ralentización que el sistema no detecta, con consecuencias académicas y administrativas que solo se descubren de forma manual.

---

## ASR-009: Generación de reportes estadísticos sin impacto en la operación transaccional

**Módulo afectado:** Analytics & Reporting  
**Atributo de calidad:** Rendimiento  
**Fuente:** RF-12

**Preocupación:**  
Las consultas estadísticas (totales por cohorte, desgranamiento, estado de tesis, graduados) implican agregaciones sobre grandes volúmenes de datos históricos. Si estas consultas se ejecutan directamente sobre la base de datos operacional, pueden degradar el rendimiento del sistema durante su uso cotidiano.

**Escenario de falla:**  
El equipo de conducción solicita un reporte global de desgranamiento por cohorte durante el horario en que los docentes están cargando asistencia. La consulta analítica bloquea tablas críticas, los docentes experimentan timeouts al intentar guardar datos, y la planilla queda con carga incompleta.

**Escenario correcto:**  
Las consultas analíticas se ejecutan sobre una réplica de lectura o un esquema de datos agregados (materializado), completamente separado de la base operacional. El tiempo de respuesta del módulo de estadísticas no afecta en ningún caso la disponibilidad de los módulos transaccionales.

**Decisión de diseño:**  
Implementar una réplica de lectura sincronizada o vistas materializadas actualizadas periódicamente (ej. cada noche o bajo demanda) para el módulo de Analytics. Las consultas del equipo de conducción se dirigen exclusivamente a esta réplica, aislando el tráfico analítico del operacional.

**Riesgo si no se implementa:**  
Degradación del sistema en momentos de uso intensivo, con posible pérdida de datos por timeouts en operaciones de carga docente o estudiantil.

---

## ASR-010: Integridad y completitud de los datos exportados en PDF y Excel

**Módulo afectado:** Analytics & Reporting  
**Atributo de calidad:** Corrección  
**Fuente:** RF-12

**Preocupación:**  
Los reportes descargables deben reflejar con exactitud el estado del sistema al momento de la exportación. Un reporte con datos parciales, desactualizados o truncados puede conducir a decisiones institucionales incorrectas.

**Escenario de falla:**  
El equipo de conducción descarga el reporte de estado de acreditación de seminarios para una cohorte. Debido a un error en la generación del archivo, algunos estudiantes aparecen sin calificación aunque ya la tienen registrada. El equipo los contacta innecesariamente, generando fricciones y pérdida de confianza en el sistema.

**Escenario correcto:**  
Antes de entregar el archivo generado, el sistema ejecuta una validación que contrasta la cantidad de registros exportados contra la cantidad esperada según la consulta de origen. Si hay discrepancia, el sistema aborta la descarga, notifica el error al usuario y registra el evento para diagnóstico.

**Decisión de diseño:**  
Incorporar una capa de validación post-generación que compare el checksum o conteo de filas del archivo producido contra los datos fuente. Los archivos exportados incluyen metadata de generación (timestamp, usuario, filtros aplicados) embebida en el documento para trazabilidad.

**Riesgo si no se implementa:**  
Reportes silenciosamente incompletos utilizados como base para decisiones académicas y administrativas, sin posibilidad de detectar la inconsistencia a posteriori.

```markdown
## ASR-[NNN]: [Título descriptivo]

**Módulo afectado:** [Core / Mod-B / Mod-C / Mod-D]  
**Atributo de calidad:** [Seguridad / Rendimiento / Disponibilidad / Mantenibilidad / Corrección]  
**Fuente:** [ID de requisito del SRS]

**Preocupación:**  
[Qué puede salir mal si no se considera este requisito]

**Escenario de falla:**  
[Descripción concreta de qué pasaría si el sistema falla en este punto]

**Escenario correcto:**  
[Cómo debería comportarse el sistema]

**Decisión de diseño:**  
[Qué decisión arquitectónica toma el equipo para cumplir este ASR]

**Riesgo si no se implementa:** [Consecuencia concreta]
```

---

*El docente debe aprobar los ASR de cada equipo antes de finalizar la semana 3.*
