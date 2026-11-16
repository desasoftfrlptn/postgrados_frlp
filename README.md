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
| Anna Luz Serena           | Líder / Desarrolladora Backend | [@annaluzserena](https://github.com/annaluzserena) | annaluzserena@protonmail.com           |
| Rodrigo Solange A.  | Diseñador / Frontend         | [@SolangeRodrigo](https://github.com/SolangeRodrigo)   | solangeabigailrodrigo@gmail.com            |
| Nardulli Ornela | Diseñador / Frontend | [@nardulli03](https://github.com/nardulli03) | ornenardulli@gmail.com            |
| Gomez Gago Aaron  | Desarrollador Backend  | [@aarongomezgago](https://github.com/aarongomezgago) | aarongomezgg@gmail.com |
| Facundo Nahuel Fernandes| Desarrollador Backend   | [@Facu067](https://github.com/Facu067) | facu067@gmail.com  |
| Belén Aylen Marti       | Desarrollador Backend   |  [@martibelen99](https://github.com/martibelen99) |martibelen99@gmail.com |

### Reglas básicas del equip
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

**Completa luego** [`docs/onboarding/TEAM_CHARTER.md`] (TEAM_CHARTER.md) 

---

## Documentación: Por Dónde Empezar
Lee en este orden antes de escribir código:

0. **Lee este docmento README completamente. **

1. 📋 [`docs/SRS.md`](docs/SRS.md) — Qué debe hacer el sistema (fuente de verdad de requisitos)

2. 🗺️ [`docs/BFD.md`](docs/BFD.md) — Cómo funciona el negocio hoy y cómo debe ser

3. 📦 [`docs/PRD.md`](docs/PRD.md) — Detalle funcional con criterios de aceptación (Gherkin)

4. 🏗️ [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — Cómo estructurar el código

5. 🗓️ [`docs/CRONOGRAMA.md`](docs/CRONOGRAMA.md) — Tu roadmap personal de las próximas 30 semanas

6. 🚀 [`onboarding/Guia_KickOff.md`](docs/onboarding/GUIA_KICKOFF.md) — Qué entregar en la semana 3

---

## Estructura de Módulos
| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **CORE** **(todos los equipos)** | Inscripción, legajo digital, workflow de estados, gestión documental | 🟡 En kickoff |
| **MOD-B** | Gestión Docente: asistencia digital, calificaciones, recordatorios automáticos | 🔴 Pendiente |
| **MOD-C** | Seguimiento de Graduación: TFI/Tesis, semáforo de riesgo académico | 🔴 Pendiente |
| **MOD-D** | Analytics & Reporting: dashboards, estadísticas por cohorte, exportación | 🔴 Pendiente |

---

## Inicio rápido con Docker

Necesitás Git y Docker Desktop con Docker Compose. Ejecutá los comandos desde la raíz de `postgrados_frlp`, donde está `docker-compose.yml`.

1. Si todavía no existe `.env`, crealo a partir de `.env.example`. En PowerShell:

   ```powershell
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   ```

   Configurá `JWT_SECRET` y las credenciales de la base. Si ya usás un volumen local, mantené las credenciales con las que se inicializó.

2. Levantá la base, construí las imágenes y aplicá las migraciones de Alembic antes de iniciar el backend y el frontend.

   ```powershell
   docker compose config --quiet
   docker compose up -d db
   docker compose build backend frontend
   docker compose run --rm backend alembic upgrade head
   docker compose up -d backend frontend
   docker compose ps
   ```

3. Verificá que el [frontend](http://localhost:5173) cargue y que la [API](http://localhost:8000/health) devuelva `{"status":"ok"}`. La documentación interactiva está en [Swagger](http://localhost:8000/docs).

### Reutilizar un volumen local de PostgreSQL 15

El Compose del proyecto usa PostgreSQL 16. Si `postgrado-db` se reinicia y aparece como `unhealthy`, revisá sus logs:

```powershell
docker compose logs --tail=60 db
```

Si el log dice que el directorio de datos se inicializó con PostgreSQL 15, creá este archivo de configuración local para usar la versión 15 con tu volumen existente:

```powershell
@'
services:
  db:
    image: postgres:15-alpine
'@ | Set-Content -Encoding ascii compose.postgres15.local.yml

docker compose -f docker-compose.yml -f compose.postgres15.local.yml up -d db
docker compose -f docker-compose.yml -f compose.postgres15.local.yml ps db
```

Cuando la base figure como `healthy`, ejecutá las migraciones y levantá la aplicación con la misma configuración local. Si las imágenes todavía no están construidas, ejecutá primero `docker compose build backend frontend`.

```powershell
docker compose -f docker-compose.yml -f compose.postgres15.local.yml run --rm backend alembic upgrade head
docker compose -f docker-compose.yml -f compose.postgres15.local.yml up -d backend frontend
docker compose -f docker-compose.yml -f compose.postgres15.local.yml ps
```

Mantené `compose.postgres15.local.yml` fuera del commit. Para detener el entorno y conservar los datos, usá `docker compose down` con los mismos dos argumentos `-f`. La opción `-v` elimina el volumen de la base.

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

- [ ] **Documentación de API actualizada** (Swagger/OpenAPI en `/docs`)

- [ ] **Probado en el entorno local de otro integrante** del equipo

- [ ] ****`CHANGELOG.md`** actualizado** con descripción del cambio

---

## Reglas No Negociables
> Estas reglas aplican a todos los equipos desde el día 1.

1. **Nunca pushees directamente a **`main`****. Siempre via Pull Request.

2. **Los commits referencian el requisito**: `feat: REQ-CORE-002 valida tamaño de PDF`

3. **Si el pipeline de CI falla, es prioridad máxima** antes de continuar desarrollo.

4. **Las variables de entorno nunca van al repo** (`.env` está en `.gitignore`).

5. **Los bloqueos se comunican en ≤2 horas**: si estás trabado, avisá en el canal del equipo.

---

## Stack Tecnológico 
** Template a completar por el equipo** 

## Stack Tecnológico
| Capa              | Recomendado (Prioridad: Simplicidad + Demanda) | Alternativa (Mayor estructura / Enterprise) | Justificación |
|-------------------|------------------------------------------------|---------------------------------------------|-------------|
| **Frontend**     | **React 19 + TypeScript + Vite + TailwindCSS + TanStack Query** | Next.js 15+ (App Router) | React sigue siendo la tecnología frontend **más demandada** del mercado. Vite es muy rápido y simple. TanStack Query simplifica mucho la gestión de datos. |
| **Backend**      | **FastAPI (Python 3.12+)**                    | NestJS (TypeScript)                        | FastAPI es **mucho más simple**, rápido de desarrollar, tiene documentación automática (Swagger) y excelente rendimiento. Ideal para proyectos académicos y APIs modernas. NestJS ofrece más estructura pero aumenta la complejidad. |
| **ORM / DB Layer** | **SQLAlchemy 2.0 + Alembic** (con async support) | Tortoise ORM o Prisma (si vas full TypeScript) | SQLAlchemy es el estándar más maduro y potente para Python. Alembic maneja migraciones muy bien. Para proyectos simples también puedes usar **SQLModel** (de tiangolo, creador de FastAPI) → aún más simple. |
| **Base de Datos** | **PostgreSQL 16/17 (Docker)**                 | ← igual                                    | Mejor relación rendimiento / features / ecosistema. Excelente con Docker. |
| **Testing**       | **Pytest + HTTPX** (unitarias + integración) + **Playwright** (E2E opcional) | Vitest + Supertest (si usas NestJS)       | Pytest es muy simple y potente. Enfocarte solo en **unitarias** como dijiste es una buena decisión para no complicar el proyecto. |
| **DevOps / Infra**| **Docker + Docker Compose + GitHub Actions** | ← igual                                    | Estándar actual. Muy simple de configurar con `docker-compose.yml`. |

### Por qué elegimos este stack
- **Alta empleabilidad**: React y PostgreSQL son de las tecnologías más solicitadas en 2026.

- **Simplicidad y velocidad de desarrollo**: FastAPI + SQLModel permite crear APIs completas con muy poco código.

- **Moderno pero maduro**: Evitamos tecnologías demasiado experimentales.

- **Entorno Docker**. Compose reúne la base, el backend y el frontend. Los pasos de arranque están en la sección de inicio rápido.

**¿Quieres cambiar algo?**  

El stack es flexible. Si prefieres **full TypeScript** (React + NestJS + Prisma), también es una excelente opción (más demandada en algunas empresas, pero más verbose).

> El stack es sugerido. Si el equipo quiere otra tecnología, debe presentar un **RFC aprobado antes de la semana 4**.

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

**Proyecto académico · Cátedra Desarrollo de Software · UTN FRLP · 2026**
