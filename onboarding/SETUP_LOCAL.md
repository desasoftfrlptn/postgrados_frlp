# Setup del Entorno Local — Guía Paso a Paso

Esta guía te lleva desde cero hasta tener el sistema corriendo localmente. **Seguí cada paso en orden.** Si algo falla, hay una sección de Troubleshooting al final.

> **Antes de empezar:** Esta guía asume el **stack principal (FastAPI + Python)**. Si tu equipo eligió el stack alternativo (NestJS + TypeScript), los pasos del sistema son iguales pero los comandos de backend difieren — están indicados en cada sección con el bloque `── Si elegiste NestJS ──`.

---

## Requisitos Previos

Antes de empezar, verificá que tenés instalado:

```bash
git --version          # Necesitás 2.x o superior
docker --version       # Docker 24.x o superior
docker compose version # Compose 2.x (incluido en Docker Desktop)
```

Eso es todo. **Python y Node.js corren dentro de Docker**, no necesitás instalarlos en tu máquina para el flujo principal. Los únicos casos en que los necesitás localmente son:

- Si querés correr los tests fuera de Docker (más rápido para TDD)
- Si querés usar el linter integrado en el editor

**Instaladores:**
- Git: https://git-scm.com
- Docker Desktop: https://www.docker.com/products/docker-desktop

> En Windows: usá **PowerShell** o **Git Bash** para los comandos. El `cmd` clásico no interpreta correctamente algunos paths y variables de entorno.

---
## Paso 0: Fork del repositorio
El encargado del equipo hacer un fork del repositorio de la catedra.
Cada miembro se suma al repositorio como colaborador.

## Paso 1: Clonar el Repositorio

```bash
# Reemplazá [NOMBRE-EQUIPO] con el nombre de tu equipo (lo da el docente via GitHub Classroom)
git clone https://github.com/utn-frlp-dev2026/postgrado-[NOMBRE-EQUIPO].git

cd postgrado-[NOMBRE-EQUIPO]

# Verificar que estás en la rama principal
git branch
# Deberías ver: * main
```

---

## Paso 2: Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo (nunca editarlo directamente)
cp .env.example .env
```

**Para desarrollo local el `.env.example` ya tiene valores funcionales.** No necesitás cambiar nada para empezar. Solo en producción deberás reemplazar contraseñas y secretos.

```bash
# Verificar que el archivo fue creado
ls -la .env      # Linux / Mac
dir .env         # Windows PowerShell
```

El `.env` nunca se commitea a Git (está en `.gitignore`). Si alguien del equipo agrega una variable nueva, debe actualizarla en `.env.example` con un valor de ejemplo.

---

## Paso 3: Levantar los Servicios con Docker

```bash
docker compose up -d
```

Este comando descarga las imágenes y levanta cuatro servicios:

```
postgrado-db        → PostgreSQL 16 (base de datos)
postgrado-backend   → FastAPI en Python  (o NestJS, según tu stack)
postgrado-frontend  → React 19 + Vite
postgrado-mailhog   → Servidor de email falso para desarrollo
```

La primera vez puede tardar 3–5 minutos según tu conexión. Las siguientes veces son casi instantáneas porque las imágenes quedan en caché.

**Verificar que todo levantó correctamente:**

```bash
docker compose ps
```

Deberías ver:

```
NAME              STATUS          PORTS
postgrado-db          Up (healthy)    0.0.0.0:5432->5432/tcp
postgrado-backend     Up              0.0.0.0:8000->8000/tcp
postgrado-frontend    Up              0.0.0.0:3000->3000/tcp
postgrado-mailhog     Up              0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
```

> El campo **STATUS** debe decir **Up**. Si dice **Restarting** o **Exit**, algo salió mal → ir a Troubleshooting.

---

## Paso 4: Aplicar Migraciones de Base de Datos

Las migraciones crean las tablas y la estructura de la base de datos. Deben correrse una vez al clonar el repo, y cada vez que aparezca una migración nueva en `develop`.

### Stack principal — FastAPI + Alembic

```bash
# Aplicar todas las migraciones pendientes
docker exec postgrado-backend alembic upgrade head

# Cargar datos de prueba (50 aspirantes ficticios + usuarios de sistema)
docker exec postgrado-backend python -m scripts.seed
```

**¿Cómo sé qué versión está aplicada?**

```bash
docker exec postgrado-backend alembic current
# Muestra el hash de la migración activa, por ej: a1b2c3d4 (head)
```

**¿Cómo ver el historial de migraciones?**

```bash
docker exec postgrado-backend alembic history --verbose
```

---

### Stack alternativo — NestJS + Prisma

```bash
# Aplicar el schema de Prisma a la base de datos
docker exec postgrado-backend npx prisma migrate deploy

# O en desarrollo, que también genera el cliente:
docker exec postgrado-backend npx prisma migrate dev

# Cargar datos de prueba
docker exec postgrado-backend npx ts-node prisma/seed.ts
```

---

**Verificar que las tablas existen (igual para ambos stacks):**

```bash
docker exec -it postgrado-db psql -U postgrado_user -d fenix_dev

# Dentro del prompt psql:
\dt
# Deberías ver: legajos, documentos, cohortes, seminarios, auditoria_legajos, etc.

# Para salir:
\q
```

---

## Paso 5: Verificar que Todo Funciona

Abrí estos URLs en tu navegador:

| URL | Qué deberías ver |
|-----|-----------------|
| `http://localhost:3000` | Pantalla de login del sistema Fenix |
| `http://localhost:3000/inscripcion` | Formulario público (sin login requerido) |
| `http://localhost:8000/docs` | Swagger UI — **stack FastAPI** (generado automáticamente) |
| `http://localhost:8000/api` | Swagger UI — **stack NestJS** |
| `http://localhost:8000/api/v1/health` | Responde `{"status": "ok", "stack": "fastapi"}` |
| `http://localhost:8025` | MailHog: todos los emails del sistema aparecen acá |

> **Tip:** Con FastAPI, el Swagger en `/docs` es la documentación viva de tu API. Podés probar los endpoints directamente desde ahí durante el desarrollo.

**Credenciales de prueba (cargadas por el seed):**

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Coordinador | `admin@fenix.test` | `Admin1234!` |
| Docente | `docente@fenix.test` | `Docente1234!` |
| CPR | `cpr@fenix.test` | `Cpr1234!` |

---

## Paso 6: Configurar el Editor — VS Code

### Extensiones para el stack principal (FastAPI + Python)

```bash
code --install-extension ms-python.python           # Python oficial de Microsoft
code --install-extension ms-python.pylance           # IntelliSense y type checking
code --install-extension charliermarsh.ruff          # Linter + formatter (reemplaza flake8 + black)
code --install-extension ms-python.debugpy           # Debugger de Python
code --install-extension bradlc.vscode-tailwindcss   # Autocompletado de clases Tailwind
code --install-extension ms-azuretools.vscode-docker # Docker integrado
```

### Extensiones para el stack alternativo (NestJS + TypeScript)

```bash
code --install-extension dbaeumer.vscode-eslint      # ESLint
code --install-extension esbenp.prettier-vscode      # Prettier
code --install-extension prisma.prisma               # Syntax y format de schema.prisma
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-azuretools.vscode-docker
```

### Extensiones comunes a ambos stacks

```bash
code --install-extension eamodio.gitlens             # Historial de Git en el editor
code --install-extension streetsidesoftware.code-spell-checker  # Corrector ortográfico
code --install-extension humao.rest-client           # Probar APIs desde archivos .http
```

El proyecto incluye `.vscode/settings.json` con la configuración recomendada. El linter se aplica automáticamente al guardar.

---

## Comandos del Día a Día

### Gestión del ambiente Docker

```bash
# Levantar todo (hacé esto al empezar a trabajar)
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f backend      # Solo el backend
docker compose logs -f frontend     # Solo el frontend
docker compose logs -f              # Todos los servicios

# Reiniciar un servicio (útil después de cambiar variables de entorno)
docker compose restart backend

# Detener todo (al terminar de trabajar)
docker compose down
```

---

### Tests y calidad de código — Stack FastAPI (principal)

```bash
# Correr todos los tests
docker exec fenix-backend pytest

# Con reporte de cobertura detallado
docker exec fenix-backend pytest --cov=src --cov-report=term-missing

# Solo tests de un módulo (más rápido durante desarrollo)
docker exec postgrado-backend pytest tests/inscripcion/

# Solo tests de dominio (los más rápidos, sin BD)
docker exec postgrado-backend pytest tests/inscripcion/test_domain.py

# Linter (Ruff — chequea estilo y errores comunes)
docker exec postgrado-backend ruff check src/

# Formatter (Ruff — aplica formato automáticamente)
docker exec postgrado-backend ruff format src/

# Type checking (opcional pero recomendado)
docker exec postgrado-backend mypy src/
```

---

### Tests y calidad de código — Stack NestJS (alternativo)

```bash
# Correr todos los tests
docker exec postgrado-backend npm test

# Con cobertura
docker exec postgrado-backend npm run test:cov

# Solo tests de un módulo
docker exec postgrado-backend npm test -- --testPathPattern=inscripcion

# Linter
docker exec postgrado-backend npm run lint

# Formatter
docker exec postgrado-backend npm run format

# Verificar tipos TypeScript sin compilar
docker exec postgrado-backend npm run typecheck
```

---

### Migraciones de base de datos

```bash
# ── FastAPI / Alembic ────────────────────────────────────────

# Crear una nueva migración a partir de cambios en los modelos SQLAlchemy
docker exec postgrado-backend alembic revision --autogenerate -m "agrega columna beca a legajos"

# Aplicar migraciones pendientes
docker exec postgrado-backend alembic upgrade head

# Ver migración actual
docker exec postgrado-backend alembic current

# Revertir la última migración (con cuidado)
docker exec postgrado-backend alembic downgrade -1


# ── NestJS / Prisma ──────────────────────────────────────────

# Crear migración después de editar schema.prisma
docker exec postgrado-backend npx prisma migrate dev --name agrega-columna-beca

# Aplicar migraciones en CI / producción
docker exec postgrado-backend npx prisma migrate deploy

# Ver el estado de las migraciones
docker exec postgrado-backend npx prisma migrate status

# Regenerar el cliente Prisma (luego de editar schema.prisma)
docker exec postgrado-backend npx prisma generate
```

---

### Acceso directo a la base de datos

```bash
# Conectarse con psql
docker exec -it postgrado-db psql -U postgrado_user -d postgrado_dev

# Comandos útiles dentro de psql:
#   \dt             → listar tablas
#   \d legajos      → describir la tabla legajos (columnas, tipos, constraints)
#   \x              → activar modo vertical (más legible para filas con muchas columnas)
#   \q              → salir

# Consulta rápida sin entrar al prompt interactivo:
docker exec postgrado-db psql -U postgrado_user -d postgrado_dev -c "SELECT id, dni, estado FROM legajos LIMIT 5;"
```

---

## Troubleshooting

### ❌ `docker compose up` falla con "port is already in use"

**Error:** `bind: address already in use` — algún puerto (5432, 3000, 8000) está ocupado.

```bash
# Ver qué proceso ocupa el puerto (Mac / Linux)
lsof -i :5432
lsof -i :8000

# En Windows PowerShell
netstat -ano | findstr :5432

# Solución A: detener el proceso que ocupa el puerto
# Solución B: cambiar el puerto en docker-compose.yml
# Ejemplo: "5433:5432" expone el 5432 interno en el 5433 del host
```

---

### ❌ `postgrado-backend` en estado "Restarting"

```bash
# Ver el error exacto
docker compose logs backend --tail=50

# Causas frecuentes:
# 1. La DB no terminó de iniciar → esperar 30 seg y correr: docker compose restart backend
# 2. Error de sintaxis en el código → el log muestra el traceback completo
# 3. Variable de entorno faltante → revisar que .env existe y tiene DATABASE_URL
# 4. Puerto 8000 ocupado por otra app → ver troubleshooting anterior
```

---

### ❌ `alembic upgrade head` falla con "connection refused"

**Causa:** La base de datos no terminó de iniciar (el healthcheck de Docker puede tardar).

```bash
# Verificar que postgrado-db está "healthy" (no solo "Up")
docker compose ps
# Si dice "starting" esperar 30 segundos

# Intentar nuevamente
docker exec postgrado-backend alembic upgrade head

# Si sigue fallando, verificar DATABASE_URL en .env:
# Debe ser: postgresql+asyncpg://postgrado_user:postgrado_dev_password@db:5432/postgrado_dev
# IMPORTANTE: el host es "db" (nombre del servicio en docker-compose), no "localhost"
```

---

### ❌ `npx prisma migrate dev` falla con "P1001: Can't reach database"

Misma causa que el punto anterior. El host en `DATABASE_URL` debe ser `db`, no `localhost`.

```bash
# Verificar en .env:
# DATABASE_URL="postgresql://postgrado_user:postgrado_dev_password@db:5432/postgrado_dev"
#                                                           ^^
#                                               Nombre del servicio Docker, no localhost
```

---

### ❌ La app levanta pero el frontend no puede conectar al backend (CORS / 404)

```bash
# Verificar que VITE_API_URL apunta al backend correcto
grep VITE_API_URL .env
# Debe decir: VITE_API_URL=http://localhost:8000/api/v1

# Verificar que el backend responde
curl http://localhost:8000/api/v1/health
# Debe responder: {"status":"ok"}

# Si cambiaste VITE_API_URL, reiniciar el frontend para que tome el nuevo valor
docker compose restart frontend
```

---

### ❌ `pytest` falla con "ModuleNotFoundError"

**Causa:** El módulo no está instalado en el contenedor, o hay un problema con el `PYTHONPATH`.

```bash
# Reinstalar dependencias dentro del contenedor
docker compose build backend --no-cache
docker compose up -d backend

# Verificar que el módulo existe
docker exec postgrado-backend pip list | grep fastapi

# Si agregaste una dependencia nueva a requirements.txt:
# El contenedor debe reconstruirse para incluirla
docker compose build backend
docker compose up -d
```

---

### ❌ En Windows: "exec format error" o scripts que no se ejecutan

**Causa:** Saltos de línea CRLF (Windows) en scripts que esperan LF (Unix).

```bash
# Configurar Git para no convertir saltos de línea al clonar
git config core.autocrlf false

# Si ya clonaste con CRLF, corregirlo:
git rm --cached -r .
git reset --hard
```

---

### ❌ Todo está roto. Quiero empezar desde cero.

```bash
# ⚠️ Esto borra la base de datos y todos los datos locales
docker compose down -v      # -v elimina los volúmenes (base de datos incluida)
docker compose up -d

# Volver a aplicar migraciones y seed
# Stack FastAPI:
docker exec postgrado-backend alembic upgrade head
docker exec postgrado-backend python -m scripts.seed

# Stack NestJS:
docker exec postgrado-backend npx prisma migrate deploy
docker exec postgrado-backend npx ts-node prisma/seed.ts
```

---

### ❌ El Swagger de FastAPI (`/docs`) no muestra mis endpoints nuevos

**Causa:** FastAPI genera el Swagger en tiempo de ejecución, pero si el servidor tiene un error de importación, algunos routers no se cargan.

```bash
# Ver el error de carga
docker compose logs backend --tail=30

# El error más común: un import circular o un schema de Pydantic mal definido
# Buscar en el log: "ImportError" o "ValidationError"
```

---

## Checklist de Salida — Kickoff Semana 3

Antes de dar por terminado el kickoff, **todos los integrantes** del equipo deben poder completar esta lista de forma independiente:

```
AMBIENTE
[ ] git clone del repositorio del equipo funciona
[ ] docker compose up -d levanta los 4 servicios sin errores
[ ] docker compose ps muestra todos los servicios en estado "Up"

APLICACIÓN
[ ] http://localhost:3000 muestra la pantalla de login
[ ] http://localhost:3000/inscripcion muestra el formulario público
[ ] http://localhost:8000/docs (FastAPI) o /api (NestJS) muestra el Swagger
[ ] http://localhost:8025 muestra MailHog con la bandeja vacía
[ ] Login con admin@postgrado.test / Admin1234! funciona sin errores de consola

BASE DE DATOS
[ ] Las migraciones corrieron sin errores
[ ] psql \dt muestra las tablas del sistema
[ ] Los datos del seed están cargados (hay legajos en la pantalla del coordinador)

TESTS
[ ] Stack FastAPI: docker exec postgrado-backend pytest → todos pasan
[ ] Stack NestJS:  docker exec postgrado-backend npm test → todos pasan
[ ] El pipeline de CI está en verde en GitHub

GIT
[ ] Podés crear una rama, hacer un commit y abrir un Pull Request en GitHub
[ ] El PR dispara el pipeline de CI automáticamente
```

> Si algún integrante no puede completar este checklist, **el equipo resuelve el bloqueo antes de avanzar al Sprint 1.** Un ambiente roto en una sola máquina es un riesgo real para la integración continua.
