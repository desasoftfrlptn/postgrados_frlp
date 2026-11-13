# Backend — instalación, ejecución y pruebas

La implementación entregada utiliza **FastAPI, SQLAlchemy 2 async, PostgreSQL y Alembic**, manteniendo la separación Controller → Service → Repository.

## 1. Requisitos

- Python 3.11 o superior (se recomienda 3.12).
- PostgreSQL compatible con la versión de SQLAlchemy utilizada por el proyecto.
- `uv` o `pip`.
- Docker Engine y Docker Compose, si se elige ejecución contenerizada.

## 2. Instalar dependencias y levantar localmente

Desde la raíz del backend completo:

```bash
cp .env.example .env # Completar las variables de entorno
cd backend
uv sync
uv run alembic upgrade head # Aplicar migraciones
uv run python -m scripts.seed # Corre seed.py para insertar datos de prueba
uv run uvicorn app.main:app --reload --reload-exclude '.venv' --host 0.0.0.0 --port 8000
```

| Variable | Configuración |
| --- | --- |
| `DATABASE_URL` | Conexión al PostgreSQL local. Si usás Docker, debe coincidir con la base, el usuario y la contraseña configurados. |
| `DB_SCHEMA` | Esquema de la aplicación. El valor predeterminado es `postgrados`. |
| `JWT_SECRET` | Secreto para firmar el JWT, de al menos 32 bytes. |
| `JWT_EXPIRATION` | Duración del token de acceso en horas. El valor predeterminado es `8h`. |
| `JWT_REFRESH_EXPIRATION` | Duración del token de renovación en días. El valor predeterminado es `7d`. |

>IMPORTANTE: es necesario añadir la extensión de unaccent a la BD local. Se puede correr manualmente con `CREATE EXTENSION unaccent;` en el entorno local de postgresql, o bien corriendo el script disponible en scripts/db/01-extensions.sql.

Comprobar:

- `http://localhost:8000/docs`
- `http://localhost:8000/openapi.json`

## 3. Endpoints incluidos

Prefijo: `/api/v1`.

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/accesos` | COORDINADOR |
| POST | `/accesos/validar` | Público, limitado por IP |
| POST | `/accesos/intercambiar` | Público, limitado por IP |
| GET | `/accesos/sesion` | Cookie `acceso_aspirante` |
| DELETE | `/accesos/sesion` | Cookie `acceso_aspirante` |
| GET | `/accesos/legajo` | Cookie de enlace SEGUIMIENTO |
| POST | `/accesos/{enlace_id}/revocar` | COORDINADOR |
| POST | `/legajos` | Cookie de enlace INSCRIPCION |
| GET | `/legajos` | COORDINADOR |
| GET | `/legajos/{legajo_id}` | COORDINADOR o titular estudiante |
| PATCH | `/legajos/{legajo_id}/estado` | COORDINADOR |
| GET | `/legajos/exportar` | COORDINADOR |
| POST | `/auth/activar-cuenta` | Invitación de activación |
| POST | `/auth/login` | JSON con `email` y `password` |
| GET | `/auth/me` | Header `Authorization: Bearer <access_token>` |
| POST | `/auth/refresh` | JSON con `refresh_token` |
| POST | `/auth/logout` | JSON con `refresh_token` |

## 4. Sesiones y roles

El token de acceso es un JWT firmado con HS256. En cada solicitud protegida se valida el token y se consulta que el usuario siga activo. Los tokens de renovación se guardan como hashes SHA-256 en `sesiones_refresh`. Una renovación revoca el token anterior y registra uno nuevo. Al cerrar sesión, el JWT de acceso ya emitido conserva su validez hasta el vencimiento, siempre que el usuario siga activo.

Una ruta que requiera el rol de coordinador puede usar `Depends(require_role("coordinador"))`. La dependencia devuelve `401` cuando falta una sesión válida y `403` cuando el usuario autenticado carece del rol requerido.

Para ejecutar las pruebas, consultá el [README de tests de autenticación](../../tests/auth/README.md).

## 5. Pruebas con Postman

Importar los dos archivos:

- `API_Legajos.postman_collection.json`
- `Local_API_Legajos.postman_environment.json`

Seleccionar el entorno **Local - API Legajos** y completar `cohorte_id` con un UUID existente de una cohorte abierta. Para los tests de seguimiento, contar con un `legajo_id` existente. Configurar el mecanismo de identidad de COORDINADOR que utilice el middleware real; el header Bearer de ejemplo solo sirve si ese middleware lo admite.

### Flujo positivo recomendado

1. `Crear enlace de inscripción` (requiere COORDINADOR).
2. `Validar enlace`.
3. `Intercambiar enlace por sesión temporal`.
4. `Consultar sesión de acceso`.
5. `Crear legajo (con enlace INSCRIPCION)`.
6. `Cerrar sesión temporal`.
7. Con el rol coordinador, listar y consultar legajos.
8. Cambiar estados respetando las transiciones configuradas.
9. Al pasar a `ACTIVO`, capturar `token_activacion` desde `url_activacion`.
10. Activar cuenta, hacer login, consultar `/auth/me` y logout.
11. Para seguimiento, crear enlace `SEGUIMIENTO` para un legajo existente, validar/intercambiarlo y llamar `GET /accesos/legajo`.

La colección captura automáticamente IDs y tokens de las respuestas cuando están disponibles. Los scripts no pueden generar datos previos que no existan en la base.

### Pruebas negativas

La carpeta `04 - Pruebas negativas y autorización` contiene ejemplos para token inválido, sesión ausente, acceso sin enlace, rol insuficiente, UUID/body inválidos, login incorrecto e invitación inválida. Ejecutarlas separadas del flujo feliz; algunas admiten más de un código porque el middleware de personal externo puede rechazar la solicitud antes de validar el body.

## 6. Consideraciones

1. **Estado inicial vs workflow:** `LegajoService.crear_legajo` establece `BORRADOR`, pero `TRANSICIONES` solo define `PENDIENTE → EN_REVISION` y no define transición desde `BORRADOR`. Con la implementación actual, un legajo recién creado no puede avanzar por el flujo de coordinación sin corregir esa discrepancia (por ejemplo, agregar la transición adecuada o cambiar el estado inicial según la regla de negocio acordada). No se modificó aquí porque requiere una decisión funcional.
2. **Migración:** revisar `down_revision` antes de aplicar en un proyecto con migraciones previas.
3. **Autenticación del personal:** integrar el middleware real; el placeholder `coordinator_token` de Postman no crea ni autentica una identidad por sí solo.
4. **SMTP:** la invitación se devuelve en `url_activacion`; la integración SMTP está pendiente.
5. **Producción:** HTTPS, `COOKIE_SECURE=true`, protección CSRF/origin, rate limit del login y gestión segura de secretos.
