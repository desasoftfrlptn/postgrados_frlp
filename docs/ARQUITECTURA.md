# Guía de Arquitectura — Sistema Posgrado 2026

**Versión:** 2.0 | **Fecha:** Abril 2026  
**Referencia:** SRS-001, BFD-001, ASR-001

---

## 1. Principios de Diseño

Antes de tomar cualquier decisión técnica, el equipo debe internalizar estos principios. No son sugerencias: son la base de toda decisión de arquitectura en este proyecto.

### 1.1 Simplicidad sobre ingeniosidad
Una solución simple que funciona hoy es mejor que una solución elegante que podría funcionar mañana. No introduzcas patrones avanzados hasta que el problema los exija. Si tenés que explicar por qué usaste ese patrón, probablemente no lo necesitabas.

### 1.2 Explícito sobre implícito
El código debe comunicar su intención sin que el lector tenga que adivinar. Los nombres de módulos, clases y funciones son la documentación más importante del sistema. Si el nombre necesita un comentario, el nombre está mal.

### 1.3 Testeable por diseño
La lógica de negocio —cálculo del semáforo, validación de transiciones de estado, cálculo de asistencia— debe poder probarse con un test unitario que se ejecute en milisegundos, sin base de datos, sin servidor, sin Docker. Si tu lógica de negocio no puede testearse así, está en la capa incorrecta.

### 1.4 Seguridad por defecto
Todo endpoint es privado hasta que se demuestre que debe ser público. Todo archivo está bloqueado hasta que se verifica el permiso. El formulario público de inscripción es la excepción justificada, no la regla.

### 1.5 Decisiones documentadas
Toda decisión arquitectónica significativa —elección de stack, estrategia de almacenamiento, mecanismo de autenticación— debe registrarse en un ADR antes de implementarse. No para pedir permiso, sino para poder revisarla cuando el contexto cambie.

---

## 2. Arquitectura de Software Adoptada

Este proyecto aplica dos principios complementarios de manera conjunta:

### 2.1 Clean Architecture

**Idea central:** Las capas externas (frameworks, bases de datos, interfaces web) dependen de las capas internas (dominio, casos de uso), **nunca al revés**.

```
┌────────────────────────────────────────────────────┐
│                    EXTERNA                          │
│   Frameworks, DB, Web, UI, Dispositivos externos   │
│   ┌────────────────────────────────────────────┐   │
│   │              INFRAESTRUCTURA               │   │
│   │  Repositorios concretos, Email, Storage    │   │
│   │   ┌────────────────────────────────────┐   │   │
│   │   │         APLICACIÓN                 │   │   │
│   │   │   Casos de Uso (orquestan dominio) │   │   │
│   │   │   ┌────────────────────────────┐   │   │   │
│   │   │   │         DOMINIO            │   │   │   │
│   │   │   │  Entidades, Reglas,        │   │   │   │
│   │   │   │  Value Objects, Servicios  │   │   │   │
│   │   │   │  → SIN imports externos ←  │   │   │   │
│   │   │   └────────────────────────────┘   │   │   │
│   │   └────────────────────────────────────┘   │   │
│   └────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

**Regla de dependencia:** Las flechas de importación solo van hacia adentro. El dominio no importa SQLAlchemy. Los casos de uso no importan FastAPI. Si rompés esta regla, rompés la testabilidad.

### 2.2 Screaming Architecture

**Idea central (Uncle Bob):** Cuando alguien abre tu repositorio por primera vez, la estructura de carpetas debe *gritar* de qué trata el sistema. Debe gritar "GESTIÓN DE POSGRADO", no "FASTAPI" ni "NESTJS".

**Mala estructura** (grita el framework):
```
src/
  controllers/       ← Grita "tenemos HTTP"
  services/          ← Grita "tenemos lógica"
  models/            ← Grita "tenemos base de datos"
  schemas/           ← Grita "tenemos validación"
```

**Buena estructura** (grita el dominio — Screaming Architecture):
```
src/
  inscripcion/       ← Grita "inscribimos aspirantes"
  legajo/            ← Grita "gestionamos legajos"
  carga_academica/   ← Grita "cargamos asistencia y notas"
  graduacion/        ← Grita "seguimos la graduación"
  analytics/         ← Grita "analizamos datos"
  shared/            ← Infraestructura compartida
```

Dentro de cada módulo de dominio, Clean Architecture organiza las capas. Los dos principios se complementan: Screaming Architecture te dice *cómo organizar los módulos*, Clean Architecture te dice *cómo organizar el interior de cada módulo*.

---

## 3. Stack Tecnológico

### 3.1 Stack Principal — React 19 + FastAPI + PostgreSQL

> Este es el **stack oficial de la cátedra**. Toda la documentación, ejemplos de código y soporte del docente están orientados a este stack.

| Capa | Tecnología | Versión | Justificación |
|------|-----------|:-------:|--------------|
| **Frontend** | React + TypeScript + Vite + TailwindCSS + TanStack Query | React 19, Vite 6 | React es la tecnología frontend más demandada en Argentina y la región (2026). Vite arranca en <300ms. TanStack Query elimina el boilerplate de fetching y caching de datos. |
| **Backend** | FastAPI (Python) | Python 3.12+, FastAPI 0.115+ | Swagger automático sin configuración. Validación nativa con Pydantic v2. Curva de aprendizaje muy baja. Rendimiento asíncrono excelente para una API REST. |
| **Validación / Schemas** | Pydantic v2 | 2.x | Tipado estricto de datos de entrada y salida. Integrado con FastAPI sin fricción. Genera el Swagger automáticamente. |
| **ORM / Migraciones** | SQLAlchemy 2.0 + Alembic | 2.x | El ORM más maduro de Python. Alembic gestiona migraciones versionadas en Git. Soporte async nativo con `asyncpg`. |
| **Base de datos** | PostgreSQL | 16 LTS (Docker) | ACID, UUID nativo, excelente con Docker. La opción más demandada en el mercado. |
| **Testing** | Pytest + HTTPX | Pytest 8.x | Pytest es el estándar de facto en Python. HTTPX permite testear la API de forma síncrona o asíncrona sin levantar un servidor real. |
| **Linting / Formato** | Ruff + pre-commit | Ruff 0.4+ | Ruff reemplaza flake8 + isort + black con una sola herramienta, 100× más rápido. |
| **Tareas programadas** | APScheduler | 3.x | Para los jobs diarios (recálculo de semáforo, recordatorios). Simple de integrar con FastAPI. |
| **DevOps** | Docker + Docker Compose + GitHub Actions | Docker 26+ | Ambiente completamente reproducible. `docker compose up` levanta todo. |
| **Email (dev)** | MailHog | latest | SMTP falso para desarrollo. Los emails se ven en `http://localhost:8025`. |
| **Dependencias** | Dependabot (GitHub) | — | Actualiza dependencias automáticamente. Se configura en `.github/dependabot.yml`. |

---

### 3.2 Stack Alternativo — React 19 + NestJS + Prisma

> ⚠️ **Solo para equipos que lo elijan explícitamente.** Requiere un **ADR-001 aprobado con justificación** antes del cierre del Kickoff (Semana 3). El soporte del docente para este stack es funcional pero limitado comparado con el principal.

Este stack es **full TypeScript** (un solo lenguaje en frontend y backend). Es más verboso pero ofrece mayor estructura, mayor demanda en empresas enterprise y un sistema de tipos compartido entre capas.

| Capa | Tecnología | Versión |
|------|-----------|:-------:|
| **Frontend** | React + TypeScript + Vite + TailwindCSS + TanStack Query | React 19 |
| **Backend** | NestJS (Node.js) | NestJS 11+, Node 22 LTS |
| **ORM / Migraciones** | Prisma | 6.x |
| **Base de datos** | PostgreSQL | 16 LTS (igual) |
| **Testing** | Vitest + Supertest | Vitest 2.x |
| **Linting** | ESLint + Prettier | — |
| **Tareas programadas** | `@nestjs/schedule` | — |
| **DevOps** | Docker + Docker Compose + GitHub Actions | igual |

**Ventajas:**
- Un solo lenguaje en todo el proyecto → menos cambio de contexto mental
- NestJS tiene inyección de dependencias nativa, muy similar a Spring → útil si luego trabajan con Java/Kotlin
- Prisma genera tipos TypeScript desde el schema → código extremadamente type-safe
- La estructura de módulos de NestJS se alinea naturalmente con Screaming Architecture

**Desventajas:**
- Curva de aprendizaje mayor (decoradores, módulos, providers de NestJS)
- La documentación de la cátedra está escrita para Python/FastAPI
- Más boilerplate para operaciones simples

**Para activar este stack:** Completar `docs/adr/ADR-001-stack.md` con justificación de al menos 3 integrantes y aprobación del docente antes de la semana 4.

---

## 4. Vista de Contexto (C4 — Nivel 1)

```
┌──────────────────────────────────────────────────────────────┐
│                    SISTEMA  POSGRADO                    │
│                                                              │
│  ┌────────────┐   ┌──────────────────┐   ┌──────────────┐   │
│  │  Frontend  │──▶│   Backend API    │──▶│     Base     │   │
│  │  React 19  │   │ FastAPI Py 3.12  │   │  de Datos    │   │
│  │  + TS + TW │◀──│  (o NestJS TS)  │◀──│ PostgreSQL16 │   │
│  └────────────┘   └──────────────────┘   └──────────────┘   │
│                           │                                  │
│                           ▼                                  │
│                    ┌──────────────┐                          │
│                    │   Storage    │                          │
│                    │ PDFs / docs  │                          │
│                    └──────────────┘                          │
└──────────────────────────────────────────────────────────────┘
         │                   │                    │
   [Aspirante]        [Coordinador]           [Docente]
   [Estudiante]          [CPR]

Sistemas externos: SMTP UTN (notificaciones por email)
Sin integración: CVG, SIU-Guaraní, Etc (fuera de alcance del MVP)
```

---

## 5. Vista de Contenedores (C4 — Nivel 2)

```
                         Sistema POSGRADO
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌──────────────────┐  HTTP   ┌──────────────────────────┐ │
│  │    FRONTEND      │◀───────▶│       BACKEND API        │ │
│  │  React 19 + TS   │  /api/v1│   FastAPI  (Python 3.12) │ │
│  │  Vite + Tailwind │         │   ó NestJS (TypeScript)  │ │
│  │  TanStack Query  │         │   Pydantic/Prisma        │ │
│  │  Port: 3000      │         │   Port: 8000             │ │
│  └──────────────────┘         └──────────┬───────────────┘ │
│                                          │                  │
│                         ┌────────────────┴──────────────┐  │
│                         │                               │  │
│                  ┌──────▼──────┐      ┌───────────────┐ │  │
│                  │ PostgreSQL  │      │   Filesystem  │ │  │
│                  │   16 LTS    │      │    Storage    │ │  │
│                  │ Port: 5432  │      │  (PDFs docs)  │ │  │
│                  │ Vol: pgdata │      │ /var/storage/ │ │  │
│                  └─────────────┘      └───────────────┘ │  │
│                                                          │  │
│                  ┌─────────────┐                         │  │
│                  │   MailHog   │ ← Solo desarrollo        │  │
│                  │ Port: 8025  │   captura todos          │  │
│                  └─────────────┘   los emails            │  │
└────────────────────────────────────────────────────────────┘
```

---

## 6. Estructura de Código: Screaming Architecture + Clean Architecture

### 6.1 Backend — Stack Principal (FastAPI + Python)

La carpeta raíz del backend **grita el dominio del negocio**, no el framework. Cada carpeta de primer nivel es un módulo de negocio. Dentro de cada módulo, las capas de Clean Architecture organizan el código.

```
backend/
├── main.py                      ← Crea la app FastAPI y registra los routers de cada módulo
├── requirements.txt
├── alembic.ini
├── .env                         ← Variables de entorno (nunca en Git)
│
├── src/
│   │
│   ├── inscripcion/             ← 📣 GRITA "inscribimos aspirantes"
│   │   ├── domain/
│   │   │   ├── entities.py      ← class Aspirante, class Legajo (lógica pura, sin DB)
│   │   │   ├── value_objects.py ← class DNI, class Email (validación embebida en el tipo)
│   │   │   ├── estados.py       ← Enum EstadoLegajo + reglas de transición válidas
│   │   │   └── repo.py          ← Abstract class LegajoRepository (interfaz, sin impl)
│   │   ├── application/
│   │   │   ├── inscribir_aspirante.py   ← Caso de uso principal
│   │   │   ├── aprobar_legajo.py
│   │   │   ├── observar_legajo.py
│   │   │   └── matricular_estudiante.py
│   │   ├── infrastructure/
│   │   │   ├── orm_models.py    ← Modelos SQLAlchemy (solo acá vive SQLAlchemy)
│   │   │   ├── pg_repository.py ← Implementación concreta de LegajoRepository
│   │   │   └── email_notifier.py← Envío de emails para este módulo
│   │   └── presentation/
│   │       ├── router.py        ← FastAPI router: @router.post("/legajos")
│   │       └── schemas.py       ← Pydantic schemas (request/response)
│   │
│   ├── gestion_documental/      ← 📣 GRITA "gestionamos documentos del legajo"
│   │   ├── domain/
│   │   │   ├── entities.py      ← class Documento
│   │   │   └── repo.py
│   │   ├── application/
│   │   │   ├── subir_documento.py
│   │   │   └── descargar_documento.py
│   │   ├── infrastructure/
│   │   │   ├── pg_repository.py
│   │   │   └── file_storage.py  ← Lee/escribe PDFs en /var/postgrado-storage/
│   │   └── presentation/
│   │       ├── router.py
│   │       └── schemas.py
│   │
│   ├── carga_academica/         ← 📣 GRITA "registramos asistencia y notas" (Módulo B)
│   │   ├── domain/
│   │   │   ├── entities.py      ← class Seminario, class Asistencia, class Calificacion
│   │   │   ├── value_objects.py ← class PorcentajeAsistencia, class Nota
│   │   │   ├── services.py      ← calcular_porcentaje(), determinar_condicion() → puras
│   │   │   └── repo.py
│   │   ├── application/
│   │   │   ├── registrar_clase.py
│   │   │   ├── cargar_asistencia.py
│   │   │   └── registrar_nota_final.py
│   │   ├── infrastructure/
│   │   │   ├── pg_repository.py
│   │   │   ├── token_acceso.py  ← Genera y valida tokens de link para docentes
│   │   │   └── recordatorio.py  ← Job de recordatorio a docentes
│   │   └── presentation/
│   │       ├── router.py
│   │       └── schemas.py
│   │
│   ├── seguimiento_graduacion/  ← 📣 GRITA "seguimos el avance hacia la graduación" (Módulo C)
│   │   ├── domain/
│   │   │   ├── entities.py      ← class TFI, class Tesis
│   │   │   ├── semaforo.py      ← calcular_semaforo() → función pura y testeable
│   │   │   └── repo.py
│   │   ├── application/
│   │   │   ├── registrar_trabajo_final.py
│   │   │   ├── recalcular_semaforos.py  ← Invocado por el job diario
│   │   │   └── listar_estudiantes_en_riesgo.py
│   │   ├── infrastructure/
│   │   │   ├── pg_repository.py
│   │   │   └── job_semaforo.py  ← APScheduler: corre recalcular_semaforos() a las 2AM
│   │   └── presentation/
│   │       ├── router.py
│   │       └── schemas.py
│   │
│   ├── analytics/               ← 📣 GRITA "analizamos el estado de las carreras" (Módulo D)
│   │   ├── domain/
│   │   │   ├── metricas.py      ← Definición de métricas: TasaRetencion, Desgranamiento
│   │   │   └── repo.py
│   │   ├── application/
│   │   │   ├── obtener_dashboard.py
│   │   │   └── exportar_cohorte.py
│   │   ├── infrastructure/
│   │   │   ├── queries.py       ← SQL de agregación optimizado
│   │   │   └── excel_exporter.py← openpyxl: genera el Excel con formato
│   │   └── presentation/
│   │       ├── router.py
│   │       └── schemas.py
│   │
│   └── shared/                  ← Infraestructura compartida (no es un módulo de negocio)
│       ├── auth/
│       │   ├── jwt.py           ← Generación y validación de tokens JWT
│       │   └── dependencies.py  ← FastAPI Dependencies: get_current_user(), require_role()
│       ├── database/
│       │   ├── connection.py    ← Configuración de SQLAlchemy async engine
│       │   └── session.py       ← FastAPI Dependency: get_db()
│       ├── email/
│       │   └── smtp_client.py   ← Cliente SMTP compartido (MailHog en dev, UTN en prod)
│       └── exceptions.py        ← Excepciones de dominio: LegajoNoEncontrado, etc.
│
├── tests/
│   ├── inscripcion/
│   │   ├── test_domain.py       ← Tests unitarios del dominio (sin DB, sin HTTP)
│   │   ├── test_use_cases.py    ← Tests de casos de uso (con repositorio mock)
│   │   └── test_api.py          ← Tests de integración de la API
│   ├── carga_academica/
│   │   └── test_domain.py       ← ← El test del semáforo/asistencia va acá
│   └── conftest.py              ← Fixtures compartidos (DB de test, cliente HTTP de test)
│
└── alembic/
    └── versions/                ← Migraciones versionadas en Git
```

**¿Por qué esta estructura?**

| Pregunta | Respuesta |
|---------|----------|
| ¿Puedo testear `calcular_semaforo()` sin levantar Docker? | ✅ Sí. Está en `seguimiento_graduacion/domain/semaforo.py`, sin imports de SQLAlchemy ni FastAPI. |
| ¿Puedo cambiar PostgreSQL por SQLite en los tests? | ✅ Sí. Solo cambia la implementación en `infrastructure/pg_repository.py`. El dominio no se entera. |
| ¿Puedo agregar un módulo nuevo sin tocar los existentes? | ✅ Sí. Creás una nueva carpeta en `src/` con sus 4 subcarpetas y registrás el router en `main.py`. |
| ¿Un nuevo desarrollador entiende de qué trata el sistema mirando `src/`? | ✅ Sí. Las carpetas gritan el negocio. |

---

### 6.2 Backend — Stack Alternativo (NestJS + TypeScript + Prisma)

NestJS tiene su propio sistema de módulos que se mapea naturalmente a Screaming Architecture. Cada módulo de NestJS es un módulo de negocio.

```
backend/
├── src/
│   │
│   ├── inscripcion/             ← 📣 GRITA "inscribimos aspirantes"
│   │   ├── domain/
│   │   │   ├── legajo.entity.ts         ← class Legajo (lógica pura)
│   │   │   ├── estado-legajo.enum.ts    ← enum + reglas de transición
│   │   │   ├── legajo.repository.ts     ← interface LegajoRepository (contrato)
│   │   │   └── value-objects/
│   │   │       ├── dni.vo.ts
│   │   │       └── email.vo.ts
│   │   ├── application/
│   │   │   ├── inscribir-aspirante.use-case.ts
│   │   │   ├── aprobar-legajo.use-case.ts
│   │   │   └── matricular-estudiante.use-case.ts
│   │   ├── infrastructure/
│   │   │   ├── prisma-legajo.repository.ts  ← Implementación con Prisma
│   │   │   └── email-notifier.ts
│   │   ├── presentation/
│   │   │   ├── inscripcion.controller.ts    ← @Controller('legajos')
│   │   │   └── inscripcion.dto.ts           ← DTOs de request/response
│   │   └── inscripcion.module.ts            ← @Module() que ensambla todo
│   │
│   ├── carga-academica/         ← 📣 GRITA "registramos asistencia y notas" (Módulo B)
│   │   ├── domain/
│   │   │   ├── seminario.entity.ts
│   │   │   └── asistencia.service.ts    ← calcularPorcentaje(): función pura
│   │   ├── application/
│   │   │   ├── cargar-asistencia.use-case.ts
│   │   │   └── registrar-nota.use-case.ts
│   │   ├── infrastructure/
│   │   │   └── prisma-seminario.repository.ts
│   │   ├── presentation/
│   │   │   ├── carga-academica.controller.ts
│   │   │   └── carga-academica.dto.ts
│   │   └── carga-academica.module.ts
│   │
│   ├── seguimiento-graduacion/  ← 📣 GRITA "seguimos el avance hacia la graduación" (Módulo C)
│   │   ├── domain/
│   │   │   ├── tesis.entity.ts
│   │   │   └── semaforo.service.ts      ← calcularSemaforo(): función pura y testeable
│   │   ├── application/
│   │   │   ├── registrar-tfi.use-case.ts
│   │   │   └── recalcular-semaforos.use-case.ts
│   │   ├── infrastructure/
│   │   │   ├── prisma-tesis.repository.ts
│   │   │   └── semaforo.scheduler.ts    ← @Cron('0 2 * * *')
│   │   ├── presentation/
│   │   │   └── graduacion.controller.ts
│   │   └── seguimiento-graduacion.module.ts
│   │
│   ├── analytics/               ← 📣 GRITA "analizamos el estado de las carreras" (Módulo D)
│   │   ├── domain/
│   │   │   └── metricas.types.ts
│   │   ├── application/
│   │   │   ├── obtener-dashboard.use-case.ts
│   │   │   └── exportar-excel.use-case.ts
│   │   ├── infrastructure/
│   │   │   ├── analytics.queries.ts     ← SQL de agregación con Prisma.$queryRaw
│   │   │   └── excel.exporter.ts        ← ExcelJS: genera el Excel
│   │   ├── presentation/
│   │   │   └── analytics.controller.ts
│   │   └── analytics.module.ts
│   │
│   └── shared/
│       ├── auth/
│       │   ├── jwt.strategy.ts          ← Passport JWT strategy
│       │   ├── roles.guard.ts           ← Guard de autorización por rol
│       │   └── roles.decorator.ts       ← @Roles('COORDINADOR')
│       ├── filters/
│       │   └── http-exception.filter.ts ← Formato uniforme de errores
│       └── shared.module.ts
│
├── prisma/
│   ├── schema.prisma            ← El modelo de datos vive acá
│   └── migrations/              ← Migraciones versionadas en Git
│
└── test/
    ├── inscripcion/
    │   ├── domain.spec.ts       ← Tests unitarios (sin Prisma, sin HTTP)
    │   └── api.e2e-spec.ts      ← Tests de integración de la API
    └── jest.config.ts
```

---

### 6.3 Frontend (React 19 + TypeScript — igual para ambos stacks)

El frontend también aplica Screaming Architecture: las carpetas top-level revelan las funcionalidades del sistema, no los patrones técnicos.

```
frontend/
├── src/
│   │
│   ├── inscripcion/             ← 📣 GRITA "flujo de inscripción del aspirante"
│   │   ├── pages/
│   │   │   └── FormularioInscripcion.tsx
│   │   ├── components/
│   │   │   ├── PasosDatosPersonales.tsx
│   │   │   ├── PasosDocumentos.tsx
│   │   │   └── IndicadorProgreso.tsx
│   │   ├── hooks/
│   │   │   └── useInscripcion.ts  ← TanStack Query: POST /api/v1/legajos
│   │   └── types.ts
│   │
│   ├── dashboard-coordinador/   ← 📣 GRITA "lo que ve el coordinador"
│   │   ├── pages/
│   │   │   ├── ListaLegajos.tsx
│   │   │   └── DetalleLegajo.tsx
│   │   ├── components/
│   │   │   ├── FiltrosLegajo.tsx
│   │   │   ├── TablaLegajos.tsx
│   │   │   └── BadgeEstado.tsx     ← Muestra el estado con color
│   │   └── hooks/
│   │       └── useLegajos.ts       ← TanStack Query: GET /api/v1/legajos
│   │
│   ├── planilla-docente/        ← 📣 GRITA "lo que usa el docente en clase" (Módulo B)
│   │   ├── pages/
│   │   │   └── PlanillaAsistencia.tsx
│   │   ├── components/
│   │   │   ├── GrillaAsistencia.tsx  ← La grilla editable inline
│   │   │   └── CeldaAsistencia.tsx   ← Checkbox con autosave
│   │   └── hooks/
│   │       ├── useAsistencia.ts
│   │       └── useNotas.ts
│   │
│   ├── seguimiento-graduacion/  ← 📣 (Módulo C)
│   │   └── components/
│   │       └── Semaforo.tsx     ← Componente visual del semáforo
│   │
│   ├── analytics/               ← 📣 (Módulo D)
│   │   ├── pages/
│   │   │   └── DashboardConduccion.tsx
│   │   └── components/
│   │       ├── GraficoCohortes.tsx    ← Recharts
│   │       └── TablaEstudiantesRiesgo.tsx
│   │
│   └── shared/                  ← UI reutilizable sin lógica de negocio
│       ├── components/
│       │   ├── Button.tsx
│       │   ├── Input.tsx
│       │   ├── Modal.tsx
│       │   └── Spinner.tsx
│       ├── api/
│       │   └── client.ts        ← Axios/fetch base: interceptors de JWT, manejo de errores
│       └── auth/
│           ├── AuthContext.tsx
│           └── ProtectedRoute.tsx
```

---

## 7. Autenticación y Autorización

### 7.1 Flujo JWT

```
[Usuario] ──POST /api/v1/auth/login──────────▶ [Backend]
  { email, password }                              │
                                             Verifica password
                                             bcrypt.verify()
                                             cost factor ≥ 12
                                                   │
                               ◀── { access_token (8h), refresh_token (7d) }
                                                   │
[Usuario] ──GET /api/v1/legajos──────────────▶ [Backend]
  Authorization: Bearer {access_token}             │
                                             Decodifica JWT
                                             Verifica firma
                                             Verifica expiración
                                             Verifica rol requerido
                                                   │
                               ◀── 200 OK / 401 Unauthorized / 403 Forbidden
```

### 7.2 Roles y Permisos

| Rol | Permisos | Cómo accede |
|-----|----------|------------|
| `ASPIRANTE` | Solo su propio legajo (lectura/escritura) | Registro público + link de seguimiento |
| `DOCENTE` | Solo sus seminarios (asistencia y notas) | Link con token opaco generado por coordinador |
| `COORDINADOR` | Todos los legajos + gestión de cohortes | Login con email y contraseña |
| `CPR` | Datos de tesis/TFI (creación/modificación) | Login con email y contraseña |
| `ADMIN` | Configuración del sistema | Login + opcional: 2FA |

### 7.3 Implementación de la autorización (FastAPI)

```python
# src/shared/auth/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

def require_role(*roles: str):
    """
    Dependency que verifica que el usuario tenga alguno de los roles especificados.
    Uso: @router.get("/legajos", dependencies=[Depends(require_role("COORDINADOR"))])
    """
    def dependency(
        credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
        db: AsyncSession = Depends(get_db),
    ):
        payload = verificar_jwt(credentials.credentials)
        if payload["rol"] not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol requerido: {roles}. Tu rol: {payload['rol']}"
            )
        return payload
    return dependency
```

### 7.4 Implementación de la autorización (NestJS)

```typescript
// src/shared/auth/roles.guard.ts

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) return true; // Endpoint sin restricción de rol
    const { user } = context.switchToHttp().getRequest();
    if (!roles.includes(user.rol)) {
      throw new ForbiddenException(`Rol requerido: ${roles.join(' o ')}`);
    }
    return true;
  }
}

// Uso en el controller:
@Get()
@Roles('COORDINADOR')
@UseGuards(JwtAuthGuard, RolesGuard)
async listarLegajos() { ... }
```

---

## 8. Modelo de Base de Datos

### 8.1 Entidades Principales (independiente del stack)

```sql
-- Las tablas son iguales para ambos stacks.
-- FastAPI las gestiona con SQLAlchemy + Alembic.
-- NestJS las gestiona con Prisma.

CREATE TABLE cohortes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio        INTEGER NOT NULL,
  nombre      VARCHAR(50) NOT NULL UNIQUE,
  abierta     BOOLEAN NOT NULL DEFAULT false,
  fecha_inicio DATE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE legajos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_legajo   VARCHAR(20) UNIQUE,   -- Ej: "26-001-045" (se asigna al aprobar)
  cohorte_id      UUID NOT NULL REFERENCES cohortes(id),
  dni             VARCHAR(20) NOT NULL,
  apellido        VARCHAR(100) NOT NULL,
  nombre          VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  estado          VARCHAR(30) NOT NULL DEFAULT 'BORRADOR'
    CONSTRAINT estado_legajo_valido CHECK (
      estado IN ('BORRADOR','PENDIENTE','EN_REVISION','OBSERVADO',
                 'COMPLETADO','ACTIVO','VENCIDO','RECHAZADO','BAJA','GRADUADO')
    ),
  tipo_carrera    VARCHAR(30)
    CONSTRAINT tipo_carrera_valido CHECK (
      tipo_carrera IN ('Especializacion','Maestria','Doctorado')
    ),
  solicita_beca   BOOLEAN DEFAULT false,
  tipo_beca       VARCHAR(10),
  fecha_inscripcion TIMESTAMP,
  fecha_activacion  TIMESTAMP,          -- Cuando pasa a ACTIVO
  semaforo        VARCHAR(10) DEFAULT 'VERDE'
    CONSTRAINT semaforo_valido CHECK (semaforo IN ('VERDE','AMARILLO','ROJO')),
  semaforo_manual BOOLEAN DEFAULT false, -- TRUE = coordinador sobreescribió el valor
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legajo_id       UUID NOT NULL REFERENCES legajos(id) ON DELETE CASCADE,
  tipo            VARCHAR(50) NOT NULL
    CONSTRAINT tipo_doc_valido CHECK (
      tipo IN ('DNI','TITULO_GRADO','PARTIDA','CUIT_CUIL',
               'FORM_INSCRIPCION','FORM_BECA','TITULO_POSGRADO')
    ),
  path_storage    VARCHAR(500) NOT NULL,  -- Ruta interna, nunca pública
  nombre_original VARCHAR(255),
  checksum_sha256 VARCHAR(64) NOT NULL,
  tamanio_bytes   INTEGER,
  fecha_subida    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE auditoria_legajos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legajo_id       UUID NOT NULL REFERENCES legajos(id),
  estado_anterior VARCHAR(30),
  estado_nuevo    VARCHAR(30) NOT NULL,
  comentario      TEXT,
  usuario_email   VARCHAR(255),           -- NULL si fue automático
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Índices para las búsquedas más frecuentes
CREATE INDEX idx_legajos_dni          ON legajos(dni);
CREATE INDEX idx_legajos_email        ON legajos(email);
CREATE INDEX idx_legajos_cohorte_est  ON legajos(cohorte_id, estado);
CREATE INDEX idx_legajos_semaforo_rojo ON legajos(semaforo) WHERE semaforo = 'ROJO';
CREATE INDEX idx_docs_legajo          ON documentos(legajo_id);
```

### 8.2 Prisma Schema (stack NestJS)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Legajo {
  id             String   @id @default(uuid())
  numeroLegajo   String?  @unique @map("numero_legajo")
  cohorteId      String   @map("cohorte_id")
  dni            String
  apellido       String
  nombre         String
  email          String   @unique
  estado         EstadoLegajo @default(BORRADOR)
  tipoCarrera    TipoCarrera? @map("tipo_carrera")
  solicitaBeca   Boolean  @default(false) @map("solicita_beca")
  semaforo       Semaforo @default(VERDE)
  semaforoManual Boolean  @default(false) @map("semaforo_manual")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  cohorte        Cohorte      @relation(fields: [cohorteId], references: [id])
  documentos     Documento[]
  auditoria      AuditoriaLegajo[]

  @@map("legajos")
}

enum EstadoLegajo {
  BORRADOR EN_REVISION PENDIENTE OBSERVADO
  COMPLETADO ACTIVO VENCIDO RECHAZADO BAJA GRADUADO
}

enum Semaforo { VERDE AMARILLO ROJO }
enum TipoCarrera { Especializacion Maestria Doctorado }
```

---

## 9. Almacenamiento Seguro de PDFs

### 9.1 Estrategia (igual para ambos stacks)

```
/var/postgrado-storage/              ← Fuera del webroot
└── uploads/
    └── {cohorte_id}/
        └── {legajo_id}/
            ├── {uuid}.pdf       ← Nombre en disco: UUID (nunca el original)
            └── {uuid}.pdf
```

**Reglas no negociables:**
- El directorio de storage **no está servido por el web server**. No existe ninguna URL que apunte directamente a un archivo.
- El nombre del archivo en disco es **siempre un UUID** generado por el servidor. El nombre original se guarda solo en la base de datos para mostrárselo al usuario.
- Todo acceso va por el endpoint autenticado `GET /api/v1/documentos/{id}/download` que verifica permisos antes de hacer streaming del archivo.

### 9.2 Validación de PDFs — Python

```python
# src/gestion_documental/infrastructure/file_storage.py
import magic  # pip install python-magic

MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

def validar_pdf(contenido: bytes, nombre_original: str) -> None:
    """
    Valida tamaño y tipo REAL del archivo.
    Lee los magic bytes, NO confía en el Content-Type del cliente.
    """
    if len(contenido) > MAX_SIZE_BYTES:
        raise ValueError(
            f"El archivo '{nombre_original}' es demasiado grande. "
            f"Máximo permitido: 5MB"
        )
    tipo_real = magic.from_buffer(contenido[:2048], mime=True)
    if tipo_real != "application/pdf":
        raise ValueError(
            f"Solo se aceptan archivos en formato PDF. "
            f"'{nombre_original}' es de tipo: {tipo_real}"
        )
```

### 9.3 Validación de PDFs — TypeScript

```typescript
// src/gestion-documental/infrastructure/file-storage.ts
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // '%PDF'

export function validarPDF(buffer: Buffer, nombreOriginal: string): void {
  if (buffer.length > MAX_SIZE) {
    throw new BadRequestException(
      `El archivo '${nombreOriginal}' es demasiado grande. Máximo: 5MB`
    );
  }
  if (!buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    throw new BadRequestException('Solo se aceptan archivos en formato PDF');
  }
}
```

---

## 10. La función `calcular_semaforo()` — El Test Más Importante del Proyecto

Esta función es el núcleo de negocio más complejo del Módulo C. Debe existir como función pura, sin dependencias externas, y debe tener tests que pasen sin base de datos.

### 10.1 Python

```python
# src/seguimiento_graduacion/domain/semaforo.py
from dataclasses import dataclass
from datetime import date
from enum import Enum

class EstadoSemaforo(Enum):
    VERDE = "VERDE"
    AMARILLO = "AMARILLO"
    ROJO = "ROJO"

DURACION_DIAS = {
    "Especializacion": 730,
    "Maestria": 1095,
    "Doctorado": 1825,
}

@dataclass
class DatosSemaforo:
    tipo_carrera: str
    fecha_inscripcion: date
    seminarios_obligatorios_total: int
    seminarios_aprobados: int
    tiene_tfi_registrado: bool
    tiene_director_asignado: bool
    tiene_fecha_cpr: bool
    hoy: date = None  # Inyectable para facilitar los tests

def calcular_semaforo(datos: DatosSemaforo) -> EstadoSemaforo:
    """
    Función pura. No tiene efectos secundarios.
    No importa SQLAlchemy ni FastAPI.
    Se puede testear con: assert calcular_semaforo(datos) == EstadoSemaforo.ROJO
    """
    hoy = datos.hoy or date.today()
    dias = (hoy - datos.fecha_inscripcion).days
    duracion = DURACION_DIAS[datos.tipo_carrera]
    pct_tiempo = dias / duracion

    if datos.tipo_carrera == "Especializacion":
        if pct_tiempo > 0.75 and datos.seminarios_aprobados < datos.seminarios_obligatorios_total:
            return EstadoSemaforo.ROJO
        if pct_tiempo > 0.50 and not datos.tiene_tfi_registrado:
            return EstadoSemaforo.AMARILLO

    elif datos.tipo_carrera == "Maestria":
        if pct_tiempo > 0.80 and datos.seminarios_aprobados < datos.seminarios_obligatorios_total:
            return EstadoSemaforo.ROJO
        if pct_tiempo > 0.50 and not datos.tiene_director_asignado:
            return EstadoSemaforo.AMARILLO

    elif datos.tipo_carrera == "Doctorado":
        if pct_tiempo > 0.70 and not datos.tiene_fecha_cpr:
            return EstadoSemaforo.ROJO
        if pct_tiempo > 0.40 and not datos.tiene_director_asignado:
            return EstadoSemaforo.AMARILLO

    return EstadoSemaforo.VERDE


# ─── Test correspondiente ─────────────────────────────────────────────────────
# tests/seguimiento_graduacion/test_domain.py
from datetime import date, timedelta
from src.seguimiento_graduacion.domain.semaforo import calcular_semaforo, DatosSemaforo, EstadoSemaforo

def test_especializacion_rojo_cuando_supera_75pct_y_adeuda_seminario():
    datos = DatosSemaforo(
        tipo_carrera="Especializacion",
        fecha_inscripcion=date(2026, 4, 1),
        seminarios_obligatorios_total=8,
        seminarios_aprobados=6,           # Adeuda 2
        tiene_tfi_registrado=False,
        tiene_director_asignado=False,
        tiene_fecha_cpr=False,
        hoy=date(2026, 4, 1) + timedelta(days=550)  # 75.3% de 730
    )
    assert calcular_semaforo(datos) == EstadoSemaforo.ROJO

def test_especializacion_verde_si_esta_al_dia():
    datos = DatosSemaforo(
        tipo_carrera="Especializacion",
        fecha_inscripcion=date(2026, 4, 1),
        seminarios_obligatorios_total=8,
        seminarios_aprobados=3,
        tiene_tfi_registrado=False,
        tiene_director_asignado=False,
        tiene_fecha_cpr=False,
        hoy=date(2026, 4, 1) + timedelta(days=200)  # 27%
    )
    assert calcular_semaforo(datos) == EstadoSemaforo.VERDE
```

### 10.2 TypeScript (NestJS)

```typescript
// src/seguimiento-graduacion/domain/semaforo.service.ts

export type EstadoSemaforo = 'VERDE' | 'AMARILLO' | 'ROJO';

const DURACION_DIAS: Record<string, number> = {
  Especializacion: 730, Maestria: 1095, Doctorado: 1825,
};

export interface DatosSemaforo {
  tipoCarrera: 'Especializacion' | 'Maestria' | 'Doctorado';
  fechaInscripcion: Date;
  seminariosObligatoriosTotal: number;
  seminariosAprobados: number;
  tieneTFIRegistrado: boolean;
  tieneDirectorAsignado: boolean;
  tieneFechaCPR: boolean;
  hoy?: Date; // Inyectable para facilitar tests
}

// Función pura — sin decoradores NestJS, sin inyección de dependencias
// Se puede importar y testear en cualquier contexto
export function calcularSemaforo(datos: DatosSemaforo): EstadoSemaforo {
  const hoy = datos.hoy ?? new Date();
  const dias = Math.floor((hoy.getTime() - datos.fechaInscripcion.getTime()) / 86_400_000);
  const pctTiempo = dias / DURACION_DIAS[datos.tipoCarrera];

  if (datos.tipoCarrera === 'Especializacion') {
    if (pctTiempo > 0.75 && datos.seminariosAprobados < datos.seminariosObligatoriosTotal)
      return 'ROJO';
    if (pctTiempo > 0.50 && !datos.tieneTFIRegistrado) return 'AMARILLO';
  }
  // ... Maestria y Doctorado análogos
  return 'VERDE';
}
```

---

## 11. Diseño de la API REST

### 11.1 Convenciones (iguales para ambos stacks)

| Aspecto | Convención | Ejemplo |
|---------|-----------|---------|
| Prefijo | `/api/v1/` | `/api/v1/legajos` |
| Recursos | Plural, kebab-case | `/cohortes`, `/legajos` |
| Formato | JSON | `Content-Type: application/json` |
| Auth | Bearer token | `Authorization: Bearer {jwt}` |
| Paginación | Query params | `?page=1&limit=20` |
| Path params | `{id}` en Python · `:id` en Express/NestJS | `GET /legajos/{id}` |

### 11.2 Formato uniforme de errores

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "El DNI ingresado ya existe en la cohorte actual",
  "field": "dni",
  "timestamp": "2026-04-14T10:30:00Z"
}
```

### 11.3 Endpoints principales

```
# Autenticación
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

# Cohortes
GET    /api/v1/cohortes
POST   /api/v1/cohortes                         [COORDINADOR]
PATCH  /api/v1/cohortes/{id}/inscripcion        [COORDINADOR] → abre/cierra

# Legajos (Módulo Core)
POST   /api/v1/legajos                          [Público] → inscripción
GET    /api/v1/legajos                          [COORDINADOR] → listado con filtros
GET    /api/v1/legajos/{id}                     [COORDINADOR, dueño]
PATCH  /api/v1/legajos/{id}/estado              [COORDINADOR] → transición
GET    /api/v1/legajos/exportar                 [COORDINADOR] → Excel

# Documentos (Módulo Core)
POST   /api/v1/legajos/{id}/documentos          [Aspirante dueño] → upload
GET    /api/v1/documentos/{id}/download         [COORDINADOR, dueño] → PDF stream

# Seminarios y carga académica (Módulo B)
GET    /api/v1/seminarios/{id}/estudiantes      [DOCENTE del seminario]
POST   /api/v1/seminarios/{id}/clases           [DOCENTE] → nueva fecha de clase
PATCH  /api/v1/seminarios/{id}/asistencias      [DOCENTE] → registra batch
PATCH  /api/v1/seminarios/{id}/notas            [DOCENTE] → notas finales

# Seguimiento de graduación (Módulo C)
POST   /api/v1/legajos/{id}/trabajo-final       [CPR]
PATCH  /api/v1/trabajos-finales/{id}            [CPR]
GET    /api/v1/legajos/{id}/semaforo            [COORDINADOR]
GET    /api/v1/graduacion/en-riesgo             [COORDINADOR] → lista semáforo rojo

# Analytics (Módulo D)
GET    /api/v1/analytics/dashboard              [COORDINADOR]
GET    /api/v1/analytics/cohortes/{id}          [COORDINADOR]
GET    /api/v1/analytics/exportar               [COORDINADOR] → Excel
```

---

## 12. Tareas Programadas (Jobs)

| Job | Horario | Responsabilidad | FastAPI | NestJS |
|-----|:-------:|----------------|:-------:|:------:|
| `recalcular_semaforos` | 2:00 AM | Recalcula el semáforo de todos los estudiantes activos | APScheduler | `@Cron('0 2 * * *')` |
| `vencer_reservas` | 3:00 AM | Pasa a "Vencido" los legajos "Completados" hace >30 días | APScheduler | `@Cron('0 3 * * *')` |
| `recordatorio_docentes` | 8:00 AM | Email a docentes sin cargar notas (faltando ≤48hs) | APScheduler | `@Cron('0 8 * * *')` |

---

## 13. ASR — Recordatorio

Los ASR completos están en `docs/ASR.md`. Los más críticos para las decisiones de arquitectura:

| ASR | Impacto en la estructura de código |
|-----|----------------------------------|
| **ASR-001 PDFs seguros** | Los PDFs viven en `shared/` o en `gestion_documental/infrastructure/`. Nunca accesibles por URL directa. |
| **ASR-002 Segregación por docente** | El guard/dependency de autorización vive en `shared/auth/`. Cada router de `carga_academica/presentation/` lo usa. |
| **ASR-003 Semáforo consistente** | `calcular_semaforo()` en `seguimiento_graduacion/domain/semaforo.py`. Sin imports de SQLAlchemy ni FastAPI. Testeable en aislamiento. |

---

## 14. Checklist de Arquitectura — Semana 3

Cada equipo debe responder SÍ a todo esto antes de escribir código de producción:

- [ ] ¿Eligieron stack? ¿Hay un ADR-001 aprobado?
- [ ] ¿La estructura de carpetas del backend sigue Screaming Architecture? (el dominio visible en primer nivel)
- [ ] ¿La lógica de negocio central (`calcular_semaforo`, `calcular_asistencia`, `validar_transicion`) está en la capa `domain/` sin imports del framework?
- [ ] ¿Tienen al menos 1 test unitario que prueba lógica de dominio sin base de datos?
- [ ] ¿El modelo de datos (las 4 entidades core) está dibujado y aprobado?
- [ ] ¿Los PDFs serán almacenados fuera del webroot con acceso solo por endpoint autenticado?
- [ ] ¿`docker compose up` levanta todo el ambiente en la máquina de todos los integrantes?
- [ ] ¿El pipeline de CI corre los tests automáticamente en cada PR?

---

*Para decisiones del equipo: crear documentos ADR en `/docs/adr/` siguiendo el template.*
