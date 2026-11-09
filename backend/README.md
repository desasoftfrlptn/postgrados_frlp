# Autenticación del backend

Este módulo de Fénix Posgrado implementa login con correo y contraseña, identificación de usuarios mediante JWT y control de acceso por rol. La implementación vive en `backend/src/shared/auth/`.

## Preparación local

Requisitos: Python 3.12, `uv` y PostgreSQL. Para usar el PostgreSQL del proyecto, abrí Docker y, desde la raíz del repositorio, copiá `.env.example` a `.env` si todavía no existe. Configurá estas variables:

| Variable | Configuración |
| --- | --- |
| `DATABASE_URL` | Conexión al PostgreSQL local. Si usás Docker, debe coincidir con la base, el usuario y la contraseña configurados. |
| `DB_SCHEMA` | Esquema de la aplicación. El valor predeterminado es `postgrados`. |
| `JWT_SECRET` | Secreto para firmar el JWT, de al menos 32 bytes. |
| `JWT_EXPIRATION` | Duración del token de acceso en horas. El valor predeterminado es `8h`. |
| `JWT_REFRESH_EXPIRATION` | Duración del token de renovación en días. El valor predeterminado es `7d`. |

Desde la raíz del repositorio, ejecutá:

```powershell
docker compose up -d db
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn src.main:app --env-file ../.env --reload
```

Abrí [Swagger](http://127.0.0.1:8000/docs). Para probar un login exitoso necesitás un usuario activo en la base con una contraseña almacenada como hash bcrypt.

## Endpoints

| Método y ruta | Qué recibe | Resultado esperado |
| --- | --- | --- |
| `POST /api/v1/auth/login` | JSON con `email` y `password` | `200` con `access_token`, `refresh_token` y `token_type`. Credenciales inválidas o usuario inactivo reciben `401`. |
| `GET /api/v1/auth/me` | Header `Authorization: Bearer <access_token>` | `200` con `id`, `nombre`, `email` y `rol`. Una sesión inválida recibe `401`. |
| `POST /api/v1/auth/refresh` | JSON con `refresh_token` | `200` con un nuevo par de tokens. Reutilizar un token anterior o presentar uno vencido devuelve `401`. |
| `POST /api/v1/auth/logout` | JSON con `refresh_token` | `204` sin cuerpo. Revoca el token de renovación y admite repetir la solicitud. |

En Swagger, ejecutá el login y pegá el valor de `access_token` en **Authorize** para probar `/me`. Para renovar o cerrar la sesión, enviá el `refresh_token` vigente en el cuerpo de la solicitud.

## Sesiones y roles

El token de acceso es un JWT firmado con HS256. En cada solicitud protegida se valida el token y se consulta que el usuario siga activo. Los tokens de renovación se guardan como hashes SHA-256 en `sesiones_refresh`. Una renovación revoca el token anterior y registra uno nuevo. Al cerrar sesión, el JWT de acceso ya emitido conserva su validez hasta el vencimiento, siempre que el usuario siga activo.

Una ruta que requiera el rol de coordinador puede usar `Depends(require_role("coordinador"))`. La dependencia devuelve `401` cuando falta una sesión válida y `403` cuando el usuario autenticado carece del rol requerido.

Para ejecutar las pruebas, consultá el [README de tests de autenticación](../../tests/auth/README.md).
