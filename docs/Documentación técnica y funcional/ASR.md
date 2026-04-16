# ASR — Requisitos Arquitectónicamente Significativos
## Fenix Posgrado · 2026

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
- Almacenamiento en directorio fuera del webroot: `/var/fenix-storage/uploads/`
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

## Template para ASR adicionales del equipo

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
