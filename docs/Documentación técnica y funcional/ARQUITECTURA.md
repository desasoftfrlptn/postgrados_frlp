# Guía de Arquitectura — Fenix Posgrado 2026

**Versión:** 1.0 | **Fecha:** Abril 2026  
**Referencia:** SRS-001, BFD-001, ASR-001

---

## 1. Principios de Diseño

Antes de tomar cualquier decisión técnica, el equipo debe considerar estos principios, en orden de prioridad:

1. **Simplicidad sobre ingeniosidad.** Una solución simple que funciona es mejor que una compleja que podría funcionar. No uses patrones avanzados si no los necesitás.
2. **Explícito sobre implícito.** El código debe ser claro en su intención. Los nombres de variables, funciones y clases deben comunicar propósito.
3. **Testeable por diseño.** La lógica de negocio (cálculo de semáforo, validación de asistencia) debe poder probarse sin levantar un servidor.
4. **Seguridad por defecto.** Primero se niega el acceso y se otorga cuando está justificado, no al revés.
5. **Decisiones documentadas.** Toda decisión arquitectónica significativa debe registrarse en un ADR.

---

## 2. Vista de Contexto (C4 — Nivel 1)

```
┌─────────────────────────────────────────────────────────┐
│                   Sistema Fenix Posgrado                │
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐            │
│  │ Frontend │──▶│  API     │──▶│  Base    │            │
│  │ (React)  │   │  REST    │   │  de      │            │
│  │          │◀──│  + JWT   │◀──│  Datos   │            │
│  └──────────┘   └──────────┘   │ (PgSQL)  │            │
│                      │         └──────────┘            │
│                      ▼                                  │
│                 ┌──────────┐                           │
│                 │ Storage  │                           │
│                 │ (PDFs)   │                           │
│                 └──────────┘                           │
└─────────────────────────────────────────────────────────┘
         │                    │                   │
   [Aspirante]         [Coordinador]          [Docente]
   [Estudiante]           [CPR]
```

**Actores externos:**
- Aspirante, Estudiante, Docente, Coordinador, CPR
- Servicio SMTP de UTN (para notificaciones por email)

**Sistemas externos:** Ninguno en MVP (no hay integración con SIU-Guaraní).

---

## 3. Vista de Contenedores (C4 — Nivel 2)

```
                     FENIX POSGRADO
┌────────────────────────────────────────────────────────┐
│                                                        │
│  ┌─────────────────┐          ┌─────────────────────┐  │
│  │   FRONTEND      │  HTTP    │    BACKEND API      │  │
│  │   React + TS    │◀────────▶│    NestJS / FastAPI │  │
│  │   Vite + TW     │  /api/v1 │    REST + JWT        │  │
│  │   Port: 3000    │          │    Port: 8000        │  │
│  └─────────────────┘          └─────────┬───────────┘  │
│                                          │              │
│                         ┌────────────────┴────────────┐ │
│                         │                             │ │
│                  ┌──────▼──────┐    ┌────────────────┐│ │
│                  │ PostgreSQL  │    │ Filesystem     ││ │
│                  │ Port: 5432  │    │ Storage (PDFs) ││ │
│                  │ Vol: pgdata │    │ /var/storage/  ││ │
│                  └─────────────┘    └────────────────┘│ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Todos los contenedores corren con **Docker Compose** en desarrollo. El mismo `docker-compose.yml` define el ambiente reproducible.

---

## 4. Estructura de Código Recomendada

Se recomienda **Clean Architecture** (también conocida como Arquitectura Hexagonal o de Capas). El objetivo es que la lógica de negocio sea independiente del framework y los detalles de infraestructura.

### 4.1 Backend (NestJS / FastAPI)

```
src/
├── domain/              ← Núcleo del sistema (SIN dependencias externas)
│   ├── entities/        ← Modelos: Legajo, Estudiante, Seminario, etc.
│   ├── value-objects/   ← DNI, Email, EstadoLegajo (tipos con validación)
│   ├── services/        ← Lógica de negocio: calcularSemaforo(), validarTransicion()
│   └── repositories/    ← Interfaces (contratos) sin implementación
│
├── application/         ← Casos de uso (orquestan el dominio)
│   ├── use-cases/
│   │   ├── inscribir-aspirante.ts
│   │   ├── aprobar-legajo.ts
│   │   ├── calcular-semaforo.ts
│   │   └── cargar-asistencia.ts
│   └── dtos/            ← Objetos de transferencia de datos (input/output)
│
├── infrastructure/      ← Implementaciones concretas (BD, email, storage)
│   ├── database/
│   │   ├── repositories/  ← Implementación con Prisma / SQLAlchemy
│   │   └── migrations/
│   ├── email/           ← Implementación del servicio de email (SMTP)
│   └── storage/         ← Implementación del almacenamiento de archivos
│
└── presentation/        ← API REST (controllers, middlewares, guards)
    ├── controllers/
    ├── guards/          ← Autenticación JWT, autorización por roles
    └── filters/         ← Manejo de errores HTTP
```

**¿Por qué esta estructura?**
- La lógica de negocio (`domain/`) puede testearse sin base de datos ni framework.
- Si mañana cambia el ORM, solo cambia `infrastructure/`, no el dominio.
- Nuevos desarrolladores pueden entender el sistema leyendo `domain/` y `application/`.

### 4.2 Frontend (React + TypeScript)

```
src/
├── pages/               ← Una página = una ruta
│   ├── inscripcion/
│   ├── dashboard/
│   └── docente/
├── components/
│   ├── ui/              ← Componentes genéricos (Button, Input, Modal)
│   └── domain/          ← Componentes de negocio (LegajoCard, Semaforo)
├── hooks/               ← Custom hooks para lógica reutilizable
├── services/            ← Llamadas a la API (abstracción de fetch/axios)
├── stores/              ← Estado global (Zustand / Redux Toolkit)
└── types/               ← Tipos TypeScript compartidos
```

---

## 5. Autenticación y Autorización

### 5.1 Flujo de Autenticación

```
[Usuario] ──POST /api/v1/auth/login──▶ [API]
  username + password                     │
                                    Verifica credenciales
                                    bcrypt compare
                                          │
                                    ◀─── JWT (8hs) + Refresh Token (7 días)
                                          │
[Usuario] ──GET /api/v1/legajos──▶ [API]
  Authorization: Bearer {jwt}             │
                                    Valida JWT
                                    Verifica rol
                                          │
                                    ◀─── 200 OK / 401 / 403
```

### 5.2 Roles del Sistema

| Rol | Permisos | Cómo accede |
|-----|----------|------------|
| `ASPIRANTE` | Solo su propio legajo (R/W) | Registro público + link de seguimiento |
| `DOCENTE` | Solo sus seminarios (R/W asistencia y notas) | Link token generado por coordinador |
| `COORDINADOR` | Todos los legajos (R/W) + gestión de cohortes | Login con credenciales |
| `CPR` | Datos de tesis/TFI (R/W) | Login con credenciales |
| `ADMIN` | Configuración del sistema | Login + autenticación 2FA (recomendado) |

### 5.3 Protección de Recursos

```typescript
// Ejemplo de guard de autorización (NestJS)
@Controller('api/v1/documentos')
export class DocumentoController {
  
  @Get(':id/download')
  @UseGuards(JwtAuthGuard, DocumentoOwnerGuard)  // Verifica que el usuario puede ver ESTE documento
  async download(@Param('id') id: string, @Req() req: Request) {
    // El guard ya verificó permisos. Acá solo sirvo el archivo.
    return this.documentoService.getStream(id);
  }
}
```

**Regla crítica:** Los documentos PDF NUNCA se sirven desde una URL estática. Siempre pasan por un endpoint que verifica permisos.

---

## 6. Modelo de Base de Datos

### 6.1 Entidades Principales

```sql
-- Tablas core
CREATE TABLE cohortes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio INTEGER NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  inscripcion_abierta BOOLEAN DEFAULT false,
  fecha_inicio DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE legajos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_legajo VARCHAR(20) UNIQUE,           -- Ej: "26-001-045" (se genera al aprobar)
  cohorte_id UUID REFERENCES cohortes(id),
  dni VARCHAR(20) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  estado VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
    CONSTRAINT estado_valido CHECK (
      estado IN ('BORRADOR','PENDIENTE','EN_REVISION','OBSERVADO',
                 'COMPLETADO','ACTIVO','VENCIDO','RECHAZADO','BAJA','GRADUADO')
    ),
  tipo_carrera VARCHAR(30),
  solicita_beca BOOLEAN DEFAULT false,
  tipo_beca VARCHAR(10),  -- '30%' o '100%'
  fecha_inscripcion TIMESTAMP,
  fecha_activacion TIMESTAMP,   -- Cuando pasa a ACTIVO
  semaforo VARCHAR(10),         -- 'VERDE', 'AMARILLO', 'ROJO'
  semaforo_manual BOOLEAN DEFAULT false,  -- Si el coordinador lo sobreescribió
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legajo_id UUID REFERENCES legajos(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,  -- 'DNI', 'TITULO_GRADO', 'PARTIDA', etc.
  path_storage VARCHAR(500) NOT NULL,  -- Ruta interna, nunca pública
  nombre_original VARCHAR(255),        -- Para mostrar al usuario
  checksum_sha256 VARCHAR(64) NOT NULL,
  tamanio_bytes INTEGER,
  fecha_subida TIMESTAMP DEFAULT NOW(),
  subido_por UUID  -- legajo_id del aspirante
);

CREATE TABLE log_estados_legajo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legajo_id UUID REFERENCES legajos(id),
  estado_anterior VARCHAR(30),
  estado_nuevo VARCHAR(30) NOT NULL,
  comentario TEXT,
  usuario_id UUID,  -- Quién hizo el cambio (NULL si es automático)
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 6.2 Índices Recomendados

```sql
-- Para búsquedas frecuentes
CREATE INDEX idx_legajos_dni ON legajos(dni);
CREATE INDEX idx_legajos_email ON legajos(email);
CREATE INDEX idx_legajos_cohorte_estado ON legajos(cohorte_id, estado);
CREATE INDEX idx_legajos_semaforo ON legajos(semaforo) WHERE semaforo = 'ROJO';
CREATE INDEX idx_documentos_legajo ON documentos(legajo_id);
```

---

## 7. Gestión de Archivos PDF

### 7.1 Estrategia de Almacenamiento

**Decisión (ver ADR-002):** Filesystem local con path en base de datos para el MVP. Migrable a S3/MinIO en producción.

**Estructura de directorios:**
```
/var/fenix-storage/
└── uploads/
    └── {cohorte_id}/
        └── {legajo_id}/
            ├── dni-{uuid}.pdf
            ├── titulo-grado-{uuid}.pdf
            └── partida-{uuid}.pdf
```

**Reglas:**
- El nombre del archivo en disco es **siempre un UUID** (no el nombre original del usuario)
- El nombre original se guarda en la tabla `documentos.nombre_original` solo para mostrarlo en la UI
- Los archivos se almacenan **fuera del webroot** (no en `public/`)
- El acceso es **solo** via `GET /api/v1/documentos/{id}/download` con JWT válido

### 7.2 Validación de Archivos

```typescript
// Orden de validaciones (importante: en este orden, antes de guardar en disco)
function validarArchivo(file: Express.Multer.File): void {
  // 1. Validar tamaño (ANTES de procesar el contenido)
  if (file.size > 5 * 1024 * 1024) {  // 5MB
    throw new BadRequestException('El archivo es demasiado grande. Máximo: 5MB');
  }
  
  // 2. Validar MIME type real (leer magic bytes, no confiar en Content-Type del cliente)
  const magic = file.buffer.slice(0, 4);
  const isPDF = magic.toString('hex') === '25504446';  // %PDF
  if (!isPDF) {
    throw new BadRequestException('Solo se aceptan archivos en formato PDF');
  }
}
```

---

## 8. Diseño de la API REST

### 8.1 Convenciones

| Aspecto | Convención | Ejemplo |
|---------|-----------|---------|
| Prefijo | `/api/v1/` | `/api/v1/legajos` |
| Recursos | Plural, kebab-case | `/cohortes`, `/legajos`, `/documentos` |
| Formato | JSON | `Content-Type: application/json` |
| Auth | Bearer token | `Authorization: Bearer {jwt}` |
| Paginación | Query params | `?page=1&limit=20` |

### 8.2 Formato de Errores

Todos los errores deben seguir este formato (facilita el manejo en frontend):

```json
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "El DNI ingresado ya existe en la cohorte actual",
  "field": "dni",
  "timestamp": "2026-04-14T10:30:00Z"
}
```

### 8.3 Endpoints Principales (Resumen)

```
# Auth
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

# Cohortes
GET    /api/v1/cohortes
POST   /api/v1/cohortes                    [COORDINADOR]
PATCH  /api/v1/cohortes/:id/inscripcion    [COORDINADOR] → abre/cierra

# Legajos
POST   /api/v1/legajos                     [Público] → inscripción aspirante
GET    /api/v1/legajos                     [COORDINADOR] → listado con filtros
GET    /api/v1/legajos/:id                 [COORDINADOR, dueño]
PATCH  /api/v1/legajos/:id/estado          [COORDINADOR] → transición de estado
GET    /api/v1/legajos/exportar            [COORDINADOR] → Excel

# Documentos
POST   /api/v1/legajos/:id/documentos      [Aspirante dueño] → upload
GET    /api/v1/documentos/:id/download     [COORDINADOR, dueño] → stream del PDF

# Seminarios (Módulo B)
GET    /api/v1/seminarios/:id/estudiantes  [DOCENTE del seminario]
POST   /api/v1/seminarios/:id/clases       [DOCENTE] → nueva fecha de clase
PATCH  /api/v1/seminarios/:id/asistencias  [DOCENTE] → registra asistencia batch
PATCH  /api/v1/seminarios/:id/notas        [DOCENTE] → carga notas finales

# Tesis (Módulo C)
POST   /api/v1/legajos/:id/tesis           [CPR]
PATCH  /api/v1/tesis/:id                   [CPR]
GET    /api/v1/legajos/:id/semaforo        [COORDINADOR]

# Analytics (Módulo D)
GET    /api/v1/analytics/dashboard         [COORDINADOR]
GET    /api/v1/analytics/cohortes/:id      [COORDINADOR]
GET    /api/v1/analytics/exportar          [COORDINADOR] → Excel
```

---

## 9. Tareas Programadas (Jobs / Cron)

Estas tareas deben ejecutarse diariamente (sugerido: 2:00 AM):

| Job | Frecuencia | Responsabilidad |
|-----|-----------|----------------|
| `recalcular-semaforos` | Diaria (2:00 AM) | Recalcula el estado del semáforo de todos los estudiantes activos |
| `vencer-reservas` | Diaria (3:00 AM) | Pasa a "Vencido" los legajos "Completados" hace >30 días |
| `recordatorio-docentes` | Diaria (8:00 AM) | Envía recordatorios a docentes con notas pendientes |
| `recordatorio-actas` | Diaria (8:00 AM) | Alerta a docentes faltando ≤48hs para cierre de actas |

---

## 10. ASR — Requisitos Arquitectónicamente Significativos

El equipo debe completar y ampliar estos ASR en `/docs/ASR.md`.

### ASR-001: Almacenamiento Seguro de PDFs
- **Preocupación:** Los documentos son sensibles (DNI, información personal). No pueden ser públicos.
- **Escenario:** Un usuario anónimo intenta acceder a `http://app.example/uploads/dni-abc123.pdf`
- **Respuesta requerida:** El servidor retorna 404 o 403. El archivo no está expuesto al webroot.
- **Decisión:** Los archivos se almacenan en `/var/fenix-storage/` (fuera del webroot). El acceso es solo via endpoint autenticado.

### ASR-002: Segregación de Datos por Rol
- **Preocupación:** Un docente no debe poder ver datos de otro seminario.
- **Escenario:** `GET /api/v1/seminarios/99/estudiantes` ejecutado por el docente del seminario 88.
- **Respuesta requerida:** El sistema retorna 403 Forbidden.
- **Decisión:** Guard de autorización verifica que el seminario pertenezca al docente del JWT.

### ASR-003: Consistencia del Semáforo
- **Preocupación:** El semáforo debe ser consistente y no depender del cliente.
- **Escenario:** 500 legajos activos recalculando simultáneamente durante el cron job.
- **Respuesta requerida:** El recálculo completa sin errores en <30 segundos.
- **Decisión:** El algoritmo se ejecuta en el servidor (lógica de dominio), no en el cliente ni en la BD (no stored procedures).

---

## 11. Checklist de Arquitectura (Semana 3)

Cada equipo debe poder responder SÍ a todas estas preguntas antes de comenzar a codificar:

- [ ] ¿Tenemos el modelo de datos (al menos las 4 entidades principales) dibujado y aprobado?
- [ ] ¿Definimos cómo vamos a almacenar los PDFs y cómo vamos a servirlos de forma segura?
- [ ] ¿Tenemos claro el flujo de autenticación (JWT) y los roles del sistema?
- [ ] ¿Sabemos qué endpoints de API necesitamos para nuestro módulo?
- [ ] ¿El `docker-compose.yml` base está funcionando en la máquina de todos?
- [ ] ¿Tenemos al menos 1 ADR documentado (el de elección de stack)?

---

*Para decisiones específicas del equipo, crear documentos ADR en `/docs/adr/` siguiendo el template.*
