# Cronograma del Proyecto — Sistema Posgrado 2026

**Inicio:** 14 de abril de 2026  
**Entrega Final:** 23 de octubre de 2026  
**Exposición:** 6 al 13 de noviembre de 2026  
**Total:** ~30 semanas de desarrollo

---

## Vista General del Roadmap

```
ABR          MAY          JUN          JUL          AGO          SEP          OCT          NOV
 |---KICKOFF---|---SPRINT 0---|---SPRINT 1---|---REV1---|---SP2---|---SP3---|---SP4---|---FINAL--|
W1  W2  W3  W4  W5  W6  W7  W8  W9  W10 W11 W12 W13 W14 W15 W16 W17 W18 W19 W20 W21 W22 W23 W24 W25 W26 W27 W28 W29 W30
[KICKOFF    ][S0 ][-------SPRINT 1 (Core)-------][R1][--SPRINT 2--][v0.5][---SPRINT 3---][R2][---SP4---][v1.0][EXPO]
```

---

## Detalle por Semana

### FASE 1: KICKOFF (Semanas 1-3 · 14 Abr – 01 May)

| Semana | Fecha | Actividades | Entregable Obligatorio |
|--------|-------|-------------|----------------------|
| **1** | 14-18 Abr | Presentación del proyecto · Formación de equipos · Lectura del PRD/BFD · Taller "El día de la Secretaria" | Equipo formado, módulo asignado |
| **2** | 21-25 Abr | Workshop de roles · Firma del Team Charter · Definition of Done · Setup de herramientas (GitHub, Discord, Figma) | Team Charter firmado y en repositorio |
| **3** | 28 Abr–1 May | Taller de Arquitectura C4 · Setup de Docker · Grooming inicial del backlog | **Repo en GitHub** + README + ASR (≥3) + RFC-001 + 15 historias en backlog |

**Criterio de salida del Kickoff:** `docker-compose up` levanta la app sin errores en la máquina de cada integrante.

---

### FASE 2: SPRINT 0 — Fundación Técnica (Semanas 4-5 · 02-15 May)

| Semana | Fecha | Foco | Entregable |
|--------|-------|------|-----------|
| **4** | 02-08 May | Modelo de base de datos (Prisma/SQLAlchemy) · Migraciones · Auth básica (JWT) · CI/CD base en GitHub Actions | Pipeline verde en cada PR |
| **5** | 09-15 May | Login funcional · CRUD básico de cohortes · Ambiente Docker estable | Auth funcionando + DB migrada |

**Hito Sprint 0 (15/05):** Sistema arranca, login funciona, `GET /api/v1/health` responde 200.

---

### FASE 3: SPRINT 1 — Core Funcional (Semanas 6-10 · 16 May – 19 Jun)

| Semana | Fecha | Foco | Notas |
|--------|-------|------|-------|
| **6** | 16-22 May | Formulario de inscripción (campos, validaciones) | **Requirements Freeze:** cambios de alcance requieren RFC aprobado |
| **7** | 23-29 May | Upload de documentos PDF + almacenamiento seguro | ASR de archivos debe estar aprobado |
| **8** | 30 May–05 Jun | Workflow de estados del legajo (máquina de estados) | Incluye lógica de notificaciones por email |
| **9** | 06-12 Jun | Búsqueda y filtrado de legajos · Tests de integración | Cobertura ≥70% en lógica de negocio |
| **10** | 13-19 Jun | **REVIEW 1** · Bugfixes · Preparación de demo | Demo: flujo completo de inscripción |

**Hito Review 1 (19/06):** Demo del flujo completo: aspirante se inscribe → sube documentos → coordinador aprueba legajo → aspirante recibe email. Sin errores críticos.

---

### FASE 4: SPRINT 2 — Core Avanzado + Inicio Módulo (Semanas 11-16 · 20 Jun – 31 Jul)

| Semana | Fecha | Foco | Notas |
|--------|-------|------|-------|
| **11** | 20-26 Jun | Correcciones post-Review 1 · Refinamiento de UX del Core | Retroalimentación del docente incorporada |
| **12** | 27 Jun–03 Jul | Core: Gestión de cohortes · Apertura/cierre período inscripción | BR-009 implementada |
| **13** | 04-10 Jul | Core: Exportación Excel del listado · Tests de seguridad (OWASP básico) | NFR-S02: validar acceso a PDFs |
| **14** | 11-17 Jul | **Inicio Módulo Especializado** (B, C o D) · Diseño de interfaz del módulo | Wireframes aprobados en Figma |
| **15** | 18-24 Jul | Módulo: desarrollo de funcionalidad principal | — |
| **16** | 25-31 Jul | **ENTREGA PARCIAL** · Tag v0.5 · Demo del Core completo | **`git tag v0.5`** · Core pasa checklist de aceptación |

**Hito Entrega Parcial (31/07):** Core completo y funcional. El flujo aspirante→estudiante activo funciona sin errores. Inicio del módulo especializado documentado.

---

### FASE 5: SPRINT 3 — Módulo Especializado (Semanas 17-22 · 01 Ago – 11 Sep)

| Semana | Fecha | Foco | Notas |
|--------|-------|------|-------|
| **17** | 01-07 Ago | Módulo: funcionalidades core (las [M]) | Priorizar Must sobre Should |
| **18** | 08-14 Ago | Módulo: lógica de negocio compleja (semáforo / cálculo / analytics) | Tests unitarios críticos |
| **19** | 15-21 Ago | Módulo: integraciones con Core via API | Contratos API del BFD/PRD deben respetarse |
| **20** | 22-28 Ago | Módulo: UX polish + tests de aceptación | UX walkthrough documentado |
| **21** | 29 Ago–04 Sep | Módulo: funcionalidades [S] · Bugfixes | — |
| **22** | 05-11 Sep | **REVIEW 2** · Demo del módulo completo | Demo: flujo end-to-end del módulo especializado |

**Hito Review 2 (11/09):** Demo del módulo especializado funcionando integrado con Core. El docente valida criterios de aceptación del módulo.

---

### FASE 6: SPRINT 4 — Hardening (Semanas 23-27 · 12 Sep – 16 Oct)

| Semana | Fecha | Foco | Notas |
|--------|-------|------|-------|
| **23** | 12-18 Sep | Testing: cobertura completa ≥70% · Testing exploratorio | Incluye regresión del Core |
| **24** | 19-25 Sep | Seguridad: revisión OWASP Top 10 · Rate limiting · Headers | Sin vulnerabilidades críticas |
| **25** | 26 Sep–02 Oct | DevOps: CI/CD completo · Deploy en servidor/cloud (si aplica) | Pipeline: lint + test + build + deploy |
| **26** | 03-09 Oct | Documentación: C4 (niveles 1-2-3) · Manual de usuario · Swagger completo | Docs en `/docs/` del repositorio |
| **27** | 10-16 Oct | **CODE FREEZE** · Solo bugfixes críticos · Preparación de exposición | Rama `main` congelada |

**Hito Code Freeze (16/10):** No se agregan features nuevas. Solo correcciones de bugs con impacto en criterios de aceptación.

---

### FASE 7: ENTREGA FINAL Y EXPOSICIÓN (Semanas 28-30 · 17 Oct – 13 Nov)

| Semana | Fecha | Actividad |
|--------|-------|-----------|
| **28** | 17-23 Oct | **ENTREGA FINAL** · `git tag v1.0` · Checklist de aceptación completo |
| **29** | 24-30 Oct | Preparación de presentación · Ensayo de demo |
| **30-31** | 06-13 Nov | **DEMO DAY** · Exposición ante stakeholders (si se coordinan con Posgrado real) |

---

## Fechas Clave Resumidas

| Fecha | Hito | Qué se entrega |
|-------|------|---------------|
| **01/05** | Kickoff completo | Repo + Team Charter + ASR (≥3) + RFC-001 + Backlog (15 historias) |
| **15/05** | Sprint 0 | Sistema levanta, auth funciona, DB migrada |
| **19/06** | Review 1 | Demo flujo de inscripción end-to-end |
| **31/07** | Entrega Parcial `v0.5` | Core completo + inicio módulo documentado |
| **11/09** | Review 2 | Demo módulo especializado integrado |
| **16/10** | Code Freeze | Rama main congelada |
| **23/10** | Entrega Final `v1.0` | Sistema completo + docs + deploy |
| **06-13/11** | Demo Day | Exposición con stakeholders |

---

## Ceremonies y Ritmos

| Ceremonia | Frecuencia | Duración | Objetivo |
|-----------|-----------|---------|---------|
| **Daily Async** (texto en Discord) | Lunes a Viernes | 5 min | ¿Qué hice ayer? ¿Qué hago hoy? ¿Bloqueantes? |
| **Sprint Planning** | Cada 2 semanas | 1 hora | Selección de historias para el sprint |
| **Review Técnica** | Semanas 10, 16, 22, 28 | 30 min/equipo | Demo de lo implementado + feedback |
| **Retrospectiva** | Cada 4 semanas | 45 min | ¿Qué mejorar? ¿Qué mantener? |
| **Clínica de Código** | Jueves semanas pares | 1 hora (todo el curso) | Revisión colectiva de código problemático |

---

## Guía de Estimación (Story Points)

Referencia para el equipo al estimar historias durante el Sprint Planning:

| Puntos | Descripción | Ejemplo |
|--------|-------------|---------|
| **1** | Tarea trivial, <2 horas | Cambiar texto de un label, agregar campo a formulario ya existente |
| **2** | Tarea simple, 2-4 horas | CRUD completo de una entidad nueva, validación de campo |
| **3** | Tarea media, medio día | Upload de archivos con validación, integración de API externa |
| **5** | Tarea compleja, 1 día | Workflow de estados, cálculo de asistencia, exportación Excel |
| **8** | Tarea muy compleja, 2 días | Algoritmo de semáforo, dashboard con múltiples fuentes, auth completa |
| **13** | Épica: dividir en historias menores | Si llegás a 13, revisá si no se puede partir |

---

*Cronograma sujeto a ajustes por el docente. Cambios se informan con al menos 1 semana de anticipación.*
