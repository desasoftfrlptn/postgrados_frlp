# SRS-001: Especificación de Requisitos de Software
## Fenix Posgrado · UTN FRLP · 2026

**Versión:** 1.0 | **Fecha:** Abril 2026 | **Estado:** Aprobado (vigente hasta semana 6)
**Basado en:** IEEE 830-1998 adaptado | **Referencias:** PRD-001, BFD-001

---

## 1. Introducción

### 1.1 Propósito

Este documento especifica de forma completa y verificable los requisitos del sistema **Fenix Posgrado**. Sirve como **contrato técnico** entre el cliente (representado por el docente como Product Owner) y los equipos de desarrollo (estudiantes). Toda discrepancia entre este documento y una implementación es un **defecto**, no una interpretación alternativa.

### 1.2 Alcance del Sistema

Fenix digitaliza el ciclo de vida académico y administrativo del posgrado de UTN FRLP: desde la preinscripción hasta la graduación. Reemplaza el flujo actual de email + Excel + carpetas físicas.

**Dentro del alcance:**
- Inscripción digital de aspirantes con upload de documentos PDF
- Gestión del legajo digital con workflow de estados
- Carga de asistencia y calificaciones por docentes
- Semaforización de riesgo académico con alertas automáticas
- Dashboards y exportación de estadísticas para conducción

**Fuera del alcance (MVP):**
- Integración con SIU-Guaraní
- Firma digital certificada
- Pasarela de pagos
- App móvil nativa
- Soporte multiidioma

### 1.3 Glosario

| Término | Definición |
|---------|-----------|
| **Aspirante** | Persona que completa el formulario de preinscripción. Aún no es estudiante. |
| **Legajo** | Conjunto de datos personales, documentos y estado académico. |
| **Cohorte** | Grupo de estudiantes que inician en el mismo año lectivo (ej: "Cohorte 2026"). |
| **Seminario** | Asignatura del posgrado, con docente, asistencias y nota final. |
| **TFI** | Trabajo Final Integrador. Requisito de graduación en Especializaciones. |
| **CPR** | Comisión de Posgrado Regional. Evalúa y aprueba tesis. |
| **Semáforo** | Indicador visual (Verde/Amarillo/Rojo) de riesgo académico. |
| **ASR** | Requisito Arquitectónicamente Significativo. Impacta decisiones de diseño. |
| **DoD** | Definition of Done. Criterios que una historia debe cumplir para estar terminada. |
| **JWT** | JSON Web Token. Mecanismo de autenticación stateless. |

### 1.4 Supuestos

| ID | Supuesto |
|----|---------|
| A-001 | Los usuarios tienen conexión a internet estable (mínimo 3G) durante el uso |
| A-002 | Volumen máximo: 500 aspirantes/cohorte, 3 cohortes activas simultáneas |
| A-003 | La facultad provee servidor Linux con ≥4GB RAM y ≥50GB almacenamiento |
| A-004 | El SMTP institucional de UTN está disponible para envío de emails |
| A-005 | Los navegadores objetivo: Chrome, Firefox, Edge (últimas 2 versiones) |

---

## 2. Requisitos Funcionales

> **Prioridades MoSCoW:** [M] Obligatorio para aprobar · [S] Importante, suma nota · [C] Valor agregado · [W] Fuera de alcance

### 2.1 CORE — Gestión de Admisión y Legajo

#### RF-CORE-001 [M] Formulario de Inscripción Público

Un aspirante completa su preinscripción mediante un formulario web sin necesidad de login previo.

**Campos obligatorios:** Carrera/s elegida/s (máx. 2), Apellido, Nombre, Nacionalidad, DNI o Pasaporte (único en cohorte activa, 7-8 dígitos), Teléfono móvil, Email (único, formato válido), Email alternativo, Domicilio completo (dirección, ciudad, provincia, país), Título de grado, Cómo conoció la oferta (opciones definidas), Motivación (mín. 50 caracteres).

**Campos opcionales:** Teléfono fijo, título de posgrado, solicitud de beca (30%/100% con adjunto específico).

```gherkin
Escenario: Inscripción exitosa
  Dado un aspirante con datos válidos y documentos completos
  Cuando envía el formulario
  Entonces el sistema crea el legajo en estado "Pendiente"
  Y muestra número de seguimiento
  Y envía email de confirmación al aspirante

Escenario: DNI duplicado en cohorte activa
  Dado que existe un legajo con DNI 30456789 en la cohorte actual
  Cuando otro aspirante ingresa el mismo DNI
  Entonces el sistema muestra: "Ya existe una preinscripción con este DNI para la cohorte actual"
  Y no crea un nuevo legajo

Escenario: Recuperación de borrador
  Dado que el aspirante cerró el formulario a mitad de completar
  Cuando regresa con el mismo email
  Entonces el sistema recupera los datos ya ingresados
```

#### RF-CORE-002 [M] Gestión Documental (Upload de PDFs)

El aspirante adjunta documentos requeridos. El sistema los almacena de forma segura.

**Documentos:**

| Documento | ¿Obligatorio? |
|-----------|:---:|
| Formulario de preinscripción firmado (escaneado) | ✓ |
| Copia DNI o Pasaporte | ✓ |
| Copia título de grado | ✓ |
| Partida de nacimiento | ✓ |
| Constancia CUIT/CUIL | ✓ |
| Título de posgrado | Solo si aplica |
| Formulario de beca firmado | Solo si solicitó beca |

```gherkin
Escenario: Upload exitoso
  Dado que el aspirante selecciona un PDF de 2MB
  Cuando se completa la transferencia
  Entonces el sistema almacena el archivo con nombre UUID (no el nombre original)
  Y registra en DB: legajo_id, tipo, path, checksum SHA-256, fecha
  Y muestra vista previa del documento

Escenario: Archivo inválido
  Dado que el aspirante selecciona un .jpg de 8MB
  Cuando intenta subirlo
  Entonces el sistema rechaza ANTES de transferir:
  Si no es PDF → "Solo se aceptan archivos en formato PDF"
  Si supera 5MB → "El archivo es demasiado grande. Máximo permitido: 5MB"

Escenario: Envío sin documentos completos
  Dado que falta el título de grado
  Cuando el aspirante hace clic en "Enviar a revisión"
  Entonces el sistema bloquea el envío
  Y resalta en rojo los documentos faltantes con descripción
```

**CRÍTICO:** Los archivos se almacenan fuera del webroot. El acceso es ÚNICAMENTE via `GET /api/v1/documentos/{id}/download` con validación de permisos. Nunca por URL directa.

#### RF-CORE-003 [M] Workflow de Estados del Legajo

El sistema controla el ciclo de vida del legajo con transiciones definidas por rol.

```
[Borrador] → [Pendiente] → [En Revisión] → [Completado] → [Activo] → [Graduado]
                                 ↕                              ↕
                           [Observado]                    [En Riesgo] → [Baja]
```

**Transiciones por rol:**

| Transición | De → Hacia | Rol |
|------------|-----------|-----|
| Enviar | Borrador → Pendiente | Aspirante |
| Revisar | Pendiente → En Revisión | Coordinador |
| Observar | En Revisión → Observado | Coordinador |
| Corregir | Observado → Pendiente | Aspirante |
| Aprobar | En Revisión → Completado | Coordinador |
| Rechazar | En Revisión → Rechazado | Coordinador |
| Matricular | Completado → Activo | Coordinador |
| Vencer (auto) | Completado → Vencido | Sistema (30 días) |
| Graduar (auto) | Activo → Graduado | Sistema |
| Dar de baja | Activo/En Riesgo → Baja | Coordinador |

```gherkin
Escenario: Generación de número de legajo
  Cuando el coordinador aprueba un legajo
  Entonces se genera número único con formato: AÑO-COHORTE-SECUENCIAL
  Ejemplo: "26-001-045" → año 2026, cohorte 1, estudiante 45

Escenario: Notificación por observación
  Cuando el coordinador observa con comentario "Falta copia del título"
  Entonces el sistema envía email al aspirante con el texto del comentario

Escenario: Vencimiento automático de reserva de vacante
  Dado que un legajo está en "Completado" hace 31 días
  Cuando corre la tarea programada diaria
  Entonces cambia a "Vencido" y notifica al coordinador
```

#### RF-CORE-004 [M] Búsqueda y Listado de Legajos

```gherkin
Escenario: Búsqueda por DNI
  Dado el DNI "30456789" en el buscador
  Cuando ejecuta la búsqueda
  Entonces retorna el legajo correspondiente en <2 segundos

Escenario: Filtros combinados
  El sistema filtra simultáneamente por: Estado, Cohorte, Carrera, Tiene beca

Escenario: Exportación
  Dado 150 registros en la búsqueda actual
  Cuando hace clic en "Exportar Excel"
  Entonces descarga .xlsx con columnas: Nº Legajo, Apellido y nombre, DNI, Estado, Carrera, Fecha inscripción
```

---

### 2.2 MOD-B — Gestión Docente

#### RF-DOC-001 [M] Acceso del Docente a su Seminario

El docente accede mediante link único generado por el coordinador. Solo ve sus propios estudiantes (BR-007).

#### RF-DOC-002 [M] Planilla de Asistencia Digital

```gherkin
Escenario: Nueva clase
  Cuando el docente hace clic en "Registrar clase"
  Entonces aparece nueva columna con fecha de hoy (editable)
  Y todos los estudiantes figuran como "Ausente" por defecto

Escenario: Autosave
  Cuando el docente marca "Presente" para un estudiante
  Entonces se guarda automáticamente en ≤500ms (sin botón "Guardar")

Escenario: Cálculo de porcentaje
  Dado 10 clases dictadas y 7 asistencias para un estudiante
  Entonces el sistema muestra "70%" (Fórmula: Presentes/Total_dictadas × 100)
```

#### RF-DOC-003 [M] Carga de Calificaciones Finales

```gherkin
Escenario: Nota aprobatoria
  Dado nota ≥4 Y asistencia ≥75%
  Entonces estado del seminario → "Aprobado"

Escenario: Nota reprobatoria
  Dado nota <4
  Entonces estado → "Desaprobado" (independientemente de asistencia)

Escenario: Validación de rango
  Solo se aceptan valores numéricos 1-10 con hasta 1 decimal
  "11", "0", "abc", "7.55" → error descriptivo
```

#### RF-DOC-004 [S] Recordatorios Automáticos

Si faltan ≤48hs para la fecha límite y hay notas sin cargar → email de recordatorio diario hasta completar.

---

### 2.3 MOD-C — Seguimiento de Graduación

#### RF-GRAD-001 [M] Registro de Trabajo Final / Tesis

Solo usuarios con rol CPR pueden crear/modificar. Datos: Tipo (TFI/Tesis), Título, Director/a, Codirector/a, Fecha aprobación CPR, Número de resolución.

#### RF-GRAD-002 [M] Algoritmo de Semaforización

**Reglas por tipo de carrera:**

| Tipo | Duración | 🟢 Verde | 🟡 Amarillo | 🔴 Rojo |
|------|----------|---------|------------|---------|
| Especialización | 730 días | Dentro de tiempos | >50% tiempo + TFI no iniciado | >75% tiempo + adeuda ≥1 seminario |
| Maestría | 1095 días | Dentro de tiempos | >50% tiempo + sin director asignado | >80% tiempo + adeuda seminarios |
| Doctorado | 1825 días | Dentro de tiempos | >40% tiempo + sin avance registrado | >70% tiempo + sin fecha CPR |

```gherkin
Escenario: Cambio a rojo dispara alerta
  Dado que un estudiante cruza el umbral de riesgo
  Cuando el sistema ejecuta el recálculo diario
  Entonces el estado cambia a ROJO
  Y el estudiante aparece en el dashboard de alertas del coordinador
  Y se envía notificación automática

Escenario: Solo el coordinador puede asignar VERDE manualmente
  El sistema automáticamente asigna AMARILLO y ROJO
  El VERDE solo puede ser asignado manualmente por el coordinador (BR-008)
```

---

### 2.4 MOD-D — Analytics e Inteligencia Académica

#### RF-REP-001 [M] Dashboard de Estadísticas

Métricas requeridas: Inscriptos por cohorte, Tasa de retención, Promedio de tiempo de graduación, Estudiantes en riesgo (semáforo rojo), Desgranamiento por cohorte. Tiempo de carga: <3 segundos con 3 cohortes activas.

#### RF-REP-002 [S] Exportación a Excel

```gherkin
Escenario: Exportación con formato profesional
  El Excel generado cumple:
  - Headers en negrita
  - Columnas con ancho ajustado al contenido
  - Filtros automáticos habilitados
  - Hoja adicional con metadatos (fecha de generación, filtros aplicados)
```

#### RF-REP-003 [S] Notificaciones Automáticas

Triggers: docente sin cargar asistencia en >2 semanas lectivas, fecha límite de actas a <48hs.

---

## 3. Requisitos No Funcionales

### 3.1 Rendimiento

| ID | Requisito | Métrica |
|----|-----------|---------|
| NFR-P01 | Carga del formulario de inscripción | <3 seg en 3G |
| NFR-P02 | Autosave en planilla de asistencia | <500ms |
| NFR-P03 | Búsquedas en BD (10.000 registros) | <2 seg |
| NFR-P04 | Dashboard (3 cohortes) | <3 seg |
| NFR-P05 | Upload PDF 5MB | Sin timeout en 30 seg |

### 3.2 Seguridad

| ID | Requisito |
|----|-----------|
| NFR-S01 | Todos los endpoints requieren JWT válido, excepto: formulario de inscripción y login |
| NFR-S02 | PDFs solo accesibles via endpoint autenticado, nunca por URL directa al filesystem |
| NFR-S03 | ORM con prepared statements obligatorio. Prohibido SQL dinámico concatenado |
| NFR-S04 | Contraseñas: bcrypt con cost factor ≥12 |
| NFR-S05 | Headers HTTP: X-Content-Type-Options, X-Frame-Options, Content-Security-Policy |
| NFR-S06 | Rate limiting en formulario público: máx. 10 envíos/IP/hora |

### 3.3 Usabilidad

| ID | Requisito |
|----|-----------|
| NFR-U01 | Responsive: funcional de 375px (móvil) a 1920px (desktop) |
| NFR-U02 | Mensajes de error en español, orientados a la acción, con campo resaltado |
| NFR-U03 | WCAG 2.1 nivel AA: contraste ≥4.5:1, labels en inputs, navegación por teclado |

### 3.4 Mantenibilidad

| ID | Requisito |
|----|-----------|
| NFR-M01 | Cobertura tests unitarios ≥70% en lógica de negocio |
| NFR-M02 | OpenAPI 3.0 accesible en `/api/docs` en ambiente desarrollo |
| NFR-M03 | Guía de estilo: ESLint+Prettier (JS/TS) o PEP8+Black (Python) |
| NFR-M04 | Secretos solo en variables de entorno, nunca hardcodeados |
| NFR-M05 | `docker-compose up` levanta todo el sistema desde cero |

---

## 4. Reglas de Negocio

| ID | Regla | Módulo |
|----|-------|--------|
| BR-001 | Máximo 2 carreras simultáneas por aspirante en el mismo período | Core |
| BR-002 | Asistencia = (presentes / clases dictadas hasta hoy) × 100 | Mod-B |
| BR-003 | Aprobado = Asistencia ≥75% AND Nota ≥4 | Mod-B |
| BR-004 | Solo CPR puede crear/modificar datos de tesis | Mod-C |
| BR-005 | Reserva de vacante vence a los 30 días corridos desde "Completado" | Core |
| BR-006 | Documentos adjuntos deben conservarse ≥5 años post-graduación | Core |
| BR-007 | Docente solo puede acceder a datos de sus propios seminarios | Mod-B |
| BR-008 | El semáforo VERDE solo puede ser asignado manualmente por el coordinador | Mod-C |
| BR-009 | El período de inscripción solo lo abre/cierra el coordinador | Core |

---

## 5. Criterios de Aceptación del Sistema Completo

El sistema está **aceptado para la entrega final** (Noviembre 2026) cuando:

1. Un aspirante completa inscripción completa (formulario + documentos) en <15 minutos sin asistencia
2. El coordinador aprueba un legajo y notifica al aspirante en <2 minutos
3. Un docente carga asistencia de 30 estudiantes en <5 minutos
4. El semáforo se actualiza automáticamente sin intervención manual
5. La exportación Excel de una cohorte completa (100 estudiantes) toma <10 segundos
6. No existen vulnerabilidades OWASP Top 10 críticas sin mitigar
7. El sistema se levanta desde cero con `docker-compose up` en <10 minutos

---

*Cambios a este documento post-semana 6 requieren RFC + aprobación del Product Owner.*
