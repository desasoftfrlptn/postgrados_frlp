# 🎓 Sistema de Posgrado
### Sistema de Gestión Académica · UTN FRLP · Desarrollo de Software 2026

[![Estado](https://img.shields.io/badge/estado-En%20Desarrollo-yellow)](#)
[![Cobertura objetivo](https://img.shields.io/badge/cobertura-≥70%25-green)](#)
[![Semana actual](https://img.shields.io/badge/semana-1%20de%2032-blue)](#)

> **Proyecto integrador** de la cátedra **Desarrollo de Software** — 3° año · Turno NOche · Ingeniería en Sistemas de Información · UTN FRLP · 2026

---

## ¿Qué es este proyecto?

**Sistema Postgrados** reemplaza el proceso manual de gestión de posgrado de UTN FRLP —hoy basado en Excel, carpetas físicas y correos— por una plataforma web centralizada que digitaliza el ciclo de vida del estudiante: desde la preinscripción hasta la graduación.

**Este repositorio es el punto de entrada único** para todos los equipos del curso. Cada equipo implementa el **Módulo Core (obligatorio para todos)** más **un módulo especializado** asignado por sorteo.

---
## Equipo
**Esta seccion es un template para el equipo, debe completarse en le primer commit**

| Nombre              | Rol                          | GitHub                          | Email                          |
|---------------------|------------------------------|---------------------------------|--------------------------------|
| Tu Nombre           | Líder / Desarrollador Principal | [@tuusuario](https://github.com/tuusuario) | tuemail@ejemplo.com           |
| Nombre Compañero 1  | Desarrollador Backend        | [@usuario2](https://github.com/usuario2)   | email2@ejemplo.com            |
| Nombre Compañero 2  | Diseñador / Frontend         | [@usuario3](https://github.com/usuario3)   | email3@ejemplo.com            |

### Reglas básicas del equipo

- **Commits**: Usa mensajes claros y en presente (ej: "Agrega login con GitHub"). Sigue la convención [Conventional Commits](https://www.conventionalcommits.org) si es posible.
- **Branching**: Nunca pushes directos a `main`. Crea una rama con tu nombre o tarea (`feature/nombre-tarea` o `bugfix/...`).
- **Pull Requests**: Siempre abre un PR para revisar el código. Mínimo 1 aprobación antes de mergear.
- **Código**: Mantén el código limpio, comenta lo complejo y respeta el estilo del proyecto (usa el `.editorconfig` si existe).
- **Issues**: Reporta bugs o ideas en la sección de Issues con la plantilla correspondiente.

**Revisa las reglas completas** CONTRIBUTING.md

### Comunicación
- **Comunicacion con docentes:** Mediante CVG o presencial en horarios de catedra
- **Principal del grupo**: Usamos **Discord/Slack/Teams** (agrega el link del canal).
- **Discusiones técnicas**: En los **Issues** y **Pull Requests** del repositorio.
- **Urgencias**: Mensaje directo por WhatsApp/Telegram/Slack.
- **Horario de pair programming**: Reuniones de trabajo virtual programadas
- **Reuniones**: [Breve weekly los miércoles a las XX hs] o según necesidad.

**Cualquier duda** → Pregunta primero en el canal de #general o abre un Issue.

---

## Estructura de Módulos

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **CORE** *(todos los equipos)* | Inscripción, legajo digital, workflow de estados, gestión documental | 🟡 En kickoff |
| **MOD-B** | Gestión Docente: asistencia digital, calificaciones, recordatorios automáticos | 🔴 Pendiente |
| **MOD-C** | Seguimiento de Graduación: TFI/Tesis, semáforo de riesgo académico | 🔴 Pendiente |
| **MOD-D** | Analytics & Reporting: dashboards, estadísticas por cohorte, exportación | 🔴 Pendiente |

---

## Quickstart — Levantá el entorno en 5 minutos

> **Requisitos previos:** Git · Docker Desktop · Node.js 20+ (o Python 3.11+)

```bash
# 1. Cloná tu repositorio (URL provisto por GitHub)
git clone https://github.com/desasoftfrlptn/postgrados_frlp.git
cd postgrado-[NOMBRE-EQUIPO]

# 2. Configurá variables de entorno
cp .env.example .env

# 3. Levantá los servicios (base de datos + backend + frontend)
docker-compose up -d

# 4. Instalá dependencias
npm install        # Si usás Node/NestJS
# -- ó --
pip install -r requirements.txt  # Si usás Python/FastAPI

# 5. Ejecutá las migraciones de base de datos
npm run db:migrate   # Prisma
# -- ó --
alembic upgrade head  # SQLAlchemy

# 6. Iniciá el servidor de desarrollo
npm run dev
```

✅ **Criterio de éxito:** La app corre en `http://localhost:3000` sin errores en consola.

---

## Estructura del Repositorio

```
postgrado-[equipo]/
├── README.md                     ← Empezá acá
├── CONTRIBUTING.md               ← Cómo trabajar: ramas, commits, PRs
├── CHANGELOG.md                  ← Historial de cambios por versión
├── docker-compose.yml            ← Ambiente local unificado
├── .env.example                  ← Variables de entorno de referencia
│
├── docs/
│   ├── SRS.md                    ← Especificación de Requisitos (fuente de verdad)
│   ├── PRD.md                    ← Product Requirements Document
│   ├── BFD.md                    ← Business Flow Diagram
│   ├── ARQUITECTURA.md           ← Decisiones técnicas + diagramas C4
│   ├── CRONOGRAMA.md             ← Roadmap con fechas reales (abr–nov 2026)
│   ├── BACKLOG_MODELO.md         ← Historias de usuario base + plantillas
│   ├── DEFINITION_OF_DONE.md    ← Criterios de completitud del equipo
│   ├── ASR.md                    ← Requisitos arquitectónicamente significativos
│   │
│   ├── onboarding/
│   │   ├── GUIA_KICKOFF.md       ← Qué hacer en las primeras 3 semanas
│   │   ├── SETUP_LOCAL.md        ← Setup paso a paso con troubleshooting
│   │   └── TEAM_CHARTER.md       ← Contrato social del equipo (completar)
│   │
│   └── adr/                      ← Registro de decisiones de arquitectura
│       ├── ADR-000-template.md
│       └── ADR-001-stack.md      ← Primera decisión: elección de stack
│
├── src/
│   ├── core/                     ← Módulo Core (TODOS los equipos)
│   └── mod-[b|c|d]/              ← Módulo especializado asignado
│
└── .github/
    └── workflows/
        └── ci.yml                ← Pipeline: lint + test + build en cada PR
```

---

## Calendario de Entregas 2026

| Hito | Semana | Fecha | Entregable obligatorio |
|------|--------|-------|------------------------|
| **Kickoff completo** | 3 | 01/05 | Repo + Team Charter + ASR + RFC-001 |
| **Sprint 0** | 5 | 15/05 | Auth + DB + `docker-compose up` funcionando |
| **Review 1** | 10 | 19/06 | Demo: inscripción de aspirante end-to-end |
| **Entrega Parcial** | 16 | 31/07 | `git tag v0.5` — Core completo y funcional |
| **Review 2** | 22 | 11/09 | Demo: módulo especializado funcional |
| **Code Freeze** | 27 | 16/10 | Rama `main` congelada, solo bugfixes |
| **Entrega Final** | 28 | 23/10 | `git tag v1.0` — Sistema completo |
| **Exposición** | 30-31 | 06–13/11 | Demo Day con stakeholders reales |

---

## Roles del Equipo (rotan cada 4 semanas)

| Rol | Responsabilidades | Entregables específicos |
|-----|-------------------|------------------------|
| **Product Owner** | Prioriza el backlog, gestiona historias, interfaz con el docente-cliente | PRD actualizado, minutas de sprint planning |
| **Tech Lead** | Decisiones de arquitectura, code reviews obligatorios, ADRs | Diagramas C4, ADRs, configuración CI/CD |
| **Dev Lead** | GitFlow, integración, calidad de código (linting), pair programming | Historial de commits limpio, documentación técnica |
| **QA/UX Lead** | Testing exploratorio, wireframes, criterios de aceptación, reporte de bugs | Casos de prueba, reporte de bugs, análisis UX |

---

## Definition of Done (DoD)

Una historia de usuario está **terminada** cuando cumple **todos** estos criterios:

- [ ] Código mergeado a `main` via **Pull Request** con al menos 1 code review aprobado
- [ ] **Tests unitarios pasando** con ≥70% de cobertura en la lógica nueva
- [ ] **Linter sin errores** (ESLint + Prettier para JS/TS · PEP8 para Python)
- [ ] **Documentación de API actualizada** (Swagger/OpenAPI en `/api/docs`)
- [ ] **Probado en el entorno local de otro integrante** del equipo
- [ ] **`CHANGELOG.md` actualizado** con descripción del cambio

---

## Reglas No Negociables

> Estas reglas aplican a todos los equipos desde el día 1.

1. **Nunca pushees directamente a `main`**. Siempre via Pull Request.
2. **Los commits referencian el requisito**: `feat: REQ-CORE-002 valida tamaño de PDF`
3. **Si el pipeline de CI falla, es prioridad máxima** antes de continuar desarrollo.
4. **Las variables de entorno nunca van al repo** (`.env` está en `.gitignore`).
5. **Los bloqueos se comunican en ≤2 horas**: si estás trabado, avisá en el canal del equipo.

---

## Stack Tecnológico

| Capa | Opción A (Node) | Opción B (Python) | Común |
|------|-----------------|-------------------|-------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS | ← igual | ← igual |
| Backend | NestJS | FastAPI | — |
| ORM | Prisma | SQLAlchemy + Alembic | — |
| BD | PostgreSQL 15 (Docker) | ← igual | ← igual |
| Testing | Vitest + Supertest | Pytest + HTTPX | Playwright (E2E) |
| DevOps | Docker · Docker Compose · GitHub Actions | ← igual | ← igual |

> El stack es sugerido. Si el equipo quiere otra tecnología, debe presentar un **RFC aprobado antes de la semana 4**.

---

## Documentación: Por Dónde Empezar

Lee en este orden antes de escribir código:

1. 📋 [`docs/SRS.md`](docs/SRS.md) — Qué debe hacer el sistema (fuente de verdad de requisitos)
2. 🗺️ [`docs/BFD.md`](docs/BFD.md) — Cómo funciona el negocio hoy y cómo debe ser
3. 📦 [`docs/PRD.md`](docs/PRD.md) — Detalle funcional con criterios de aceptación (Gherkin)
4. 🏗️ [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — Cómo estructurar el código
5. 🗓️ [`docs/CRONOGRAMA.md`](docs/CRONOGRAMA.md) — Tu roadmap personal de las próximas 30 semanas
6. 🚀 [`docs/onboarding/GUIA_KICKOFF.md`](docs/onboarding/GUIA_KICKOFF.md) — Qué entregar en la semana 3

---

## Canales de Ayuda

| Canal | Para qué usarlo |
|-------|----------------|
| Correo `#postgrado-general` | Dudas generales, anuncios del docente |
| Correo `#[nombre-equipo]` | Comunicación interna del equipo |
| Github Discussion `#[nombre-equipo]` | Comunicación interna del equipo |
| **Issues de GitHub** | Bugs, tareas técnicas, dudas de implementación |
| **Clínica de Código** (martes semanas 20hs, aula) | Traé código roto o decisiones difíciles |


---

*Proyecto académico · Cátedra Desarrollo de Software · UTN FRLP · 2026*
