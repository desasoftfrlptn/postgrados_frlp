# Setup del Entorno Local — Guía Paso a Paso

Esta guía te lleva desde cero hasta tener el sistema corriendo localmente. **Seguí cada paso en orden.** Si algo falla, hay una sección de Troubleshooting al final.

---

## Requisitos Previos

Antes de empezar, verificá que tenés instalado:

```bash
# Verificar versiones
git --version          # Necesitás git 2.x o superior
docker --version       # Docker 24.x o superior
docker compose version # Docker Compose 2.x (incluido en Docker Desktop)
node --version         # Node.js 20.x LTS (solo si no usás Docker para todo)
```

**Instaladores oficiales:**
- Git: https://git-scm.com
- Docker Desktop: https://www.docker.com/products/docker-desktop (incluye Docker Compose)
- Node.js LTS: https://nodejs.org (elegí la versión "LTS")

> **Importante:** En Windows, usá PowerShell o Git Bash para los comandos. El Símbolo del Sistema (cmd) puede tener problemas con algunos comandos.

---

## Paso 1: Clonar el Repositorio

```bash
# Reemplazá [NOMBRE-EQUIPO] con el nombre de tu equipo (lo da el docente via GitHub Classroom)
git clone https://github.com/utn-frlp-dev2026/fenix-[NOMBRE-EQUIPO].git

# Entrar al directorio del proyecto
cd fenix-[NOMBRE-EQUIPO]

# Verificar que estás en la rama correcta
git branch
# Deberías ver: * main
```

---

## Paso 2: Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Abrir .env con tu editor
# En VS Code:
code .env
# En cualquier editor de texto:
nano .env   # (Linux/Mac)
notepad .env  # (Windows)
```

**Para desarrollo local, el `.env.example` ya tiene valores que funcionan sin cambios.** No necesitás modificar nada para empezar. Solo en producción necesitarás cambiar las contraseñas y secretos.

```bash
# Verificar que el archivo .env fue creado
ls -la .env    # Linux/Mac
dir .env       # Windows
```

---

## Paso 3: Levantar los Servicios con Docker

```bash
# Levantar todos los servicios en segundo plano (-d = detached)
docker compose up -d

# Esto descarga las imágenes necesarias y crea los contenedores.
# La primera vez puede tardar 3-5 minutos según tu conexión a internet.
```

**¿Cómo sé que están corriendo?**

```bash
docker compose ps
```

Deberías ver algo así:

```
NAME              STATUS          PORTS
fenix-db          Up (healthy)    0.0.0.0:5432->5432/tcp
fenix-backend     Up              0.0.0.0:8000->8000/tcp
fenix-frontend    Up              0.0.0.0:3000->3000/tcp
fenix-mailhog     Up              0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
```

> El campo **STATUS** debe decir **Up**. Si dice **Restarting** o **Exit**, algo salió mal → ver Troubleshooting.

---

## Paso 4: Ejecutar las Migraciones de Base de Datos

```bash
# Aplicar el esquema de base de datos
docker exec fenix-backend npm run db:migrate

# Cargar datos de prueba (50 aspirantes ficticios + usuarios de sistema)
docker exec fenix-backend npm run db:seed
```

**¿Cómo verificar que la migración funcionó?**

```bash
# Conectarse a la base de datos
docker exec -it fenix-db psql -U fenix_user -d fenix_dev

# Dentro del prompt de psql, listar las tablas
\dt

# Deberías ver: legajos, documentos, cohortes, seminarios, etc.
# Para salir:
\q
```

---

## Paso 5: Verificar que Todo Funciona

Abrí estos URLs en tu navegador:

| URL | ¿Qué deberías ver? |
|-----|-------------------|
| `http://localhost:3000` | Pantalla de login del sistema Fenix |
| `http://localhost:3000/inscripcion` | Formulario público de inscripción (sin login) |
| `http://localhost:8000/api/docs` | Swagger UI con todos los endpoints documentados |
| `http://localhost:8025` | MailHog: ver emails enviados por el sistema |
| `http://localhost:8000/api/v1/health` | Responde `{"status": "ok"}` |

**Credenciales de prueba:**

| Usuario | Email | Contraseña | Rol |
|---------|-------|-----------|-----|
| Admin | `admin@fenix.test` | `Admin1234!` | Coordinador |
| Docente | `docente@fenix.test` | `Docente1234!` | Docente |
| CPR | `cpr@fenix.test` | `Cpr1234!` | CPR |

---

## Paso 6: Configurar tu Editor (Recomendado: VS Code)

```bash
# Instalar extensiones recomendadas del proyecto
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension prisma.prisma
code --install-extension ms-azuretools.vscode-docker
```

El proyecto incluye `.vscode/settings.json` con la configuración recomendada. El linter y formatter se aplicarán automáticamente al guardar archivos.

---

## Comandos del Día a Día

```bash
# Levantar el ambiente (cada vez que empezás a trabajar)
docker compose up -d

# Ver logs en tiempo real (útil cuando algo falla)
docker compose logs -f backend   # Solo backend
docker compose logs -f           # Todos los servicios

# Detener todo (al terminar de trabajar)
docker compose down

# Correr los tests
docker exec fenix-backend npm test

# Correr tests con reporte de cobertura
docker exec fenix-backend npm run test:coverage

# Correr el linter
docker exec fenix-backend npm run lint

# Acceder a la base de datos
docker exec -it fenix-db psql -U fenix_user -d fenix_dev

# Ver emails enviados por el sistema
# Abrir http://localhost:8025 en el navegador
```

---

## Troubleshooting

### ❌ "docker compose up" falla con error de puerto ocupado

**Error:** `bind: address already in use` en el puerto 5432 (PostgreSQL) o 3000 (Frontend)

**Solución:** Otro servicio está usando ese puerto.
```bash
# Ver qué está usando el puerto (Mac/Linux)
lsof -i :5432
lsof -i :3000

# En Windows
netstat -ano | findstr :5432

# Opción: cambiar el puerto en docker-compose.yml
# Cambiar "5432:5432" por "5433:5432" (el primer número es el puerto del host)
```

---

### ❌ El contenedor `fenix-backend` está en "Restarting"

```bash
# Ver el error específico
docker compose logs backend

# Causas comunes:
# 1. La base de datos no terminó de iniciar → esperar 30 segundos y volver a intentar
# 2. Error en el código → ver el log para identificar el error
# 3. .env mal configurado → revisar DATABASE_URL
```

---

### ❌ "npm run db:migrate" falla con "connection refused"

**Causa:** La base de datos no está completamente lista.

```bash
# Esperar a que la DB esté healthy
docker compose ps
# Si fenix-db dice "starting" en vez de "healthy", esperar 30 segundos

# Volver a intentar
docker exec fenix-backend npm run db:migrate
```

---

### ❌ La app carga pero no se conecta al backend (CORS o 404)

**Causa probable:** El frontend está apuntando a una URL incorrecta.

```bash
# Verificar la variable VITE_API_URL en .env
cat .env | grep VITE_API_URL
# Debe decir: VITE_API_URL=http://localhost:8000/api/v1

# Si la cambiaste, reiniciar el contenedor del frontend
docker compose restart frontend
```

---

### ❌ Todo el ambiente está roto, quiero empezar de cero

```bash
# ⚠️ CUIDADO: Esto borra la base de datos y todos los datos locales
docker compose down -v   # El flag -v borra los volúmenes (incluyendo la BD)
docker compose up -d
docker exec fenix-backend npm run db:migrate
docker exec fenix-backend npm run db:seed
```

---

### ❌ En Windows: "exec format error" o scripts que no corren

**Causa:** Problemas de saltos de línea (CRLF vs LF).

```bash
# En Git Bash, configurar para no convertir saltos de línea
git config core.autocrlf false

# Volver a clonar el repo o correr:
git rm --cached -r .
git reset --hard
```

---

## Checklist Final (Semana 3 — Kickoff)

Antes de que termine la semana 3, verificá que todos los integrantes del equipo pueden completar esta lista:

- [ ] `git clone` del repositorio del equipo funciona
- [ ] `docker compose up -d` levanta todos los servicios sin errores
- [ ] `http://localhost:3000` muestra la pantalla de login
- [ ] `http://localhost:3000/inscripcion` muestra el formulario público
- [ ] `http://localhost:8000/api/docs` muestra el Swagger UI
- [ ] `http://localhost:8025` muestra MailHog
- [ ] Podés hacer login con las credenciales de prueba
- [ ] Los tests corren sin errores: `docker exec fenix-backend npm test`
- [ ] Podés crear una rama, hacer un commit y abrir un PR en GitHub

> **Si alguien del equipo no puede completar el checklist → resolver antes de avanzar al Sprint 1.**  
> Un ambiente que no funciona en la máquina de algún integrante es un bloqueante técnico de alta prioridad.
