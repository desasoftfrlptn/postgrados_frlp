# Backend

API REST de inscripción implementada con FastAPI, SQLAlchemy y PostgreSQL.

## Desarrollo local

Desde la carpeta `backend`:

```powershell
python -m pip install -e ".[dev]"
$env:DATABASE_URL = "postgresql+psycopg2://postgrado_user:cambiar_en_produccion@localhost:5432/postgrado_dev"
alembic upgrade head
backend
```

El comando `backend` inicia la aplicación desde `main.py` y activa la recarga
automática cuando `ENVIRONMENT=development`. Para iniciar Uvicorn manualmente,
ejecutar `uvicorn main:app --reload` desde la carpeta `backend`.

La migración inicial crea las tablas de cohortes, legajos y documentos, y abre la
cohorte 2026 para desarrollo. En Docker, `STORAGE_PATH` configura el directorio
privado de archivos y `MAX_FILE_SIZE_MB` el tamaño máximo por PDF (5 MB por
defecto). Los archivos no se exponen como recursos estáticos.

La documentación interactiva de la API queda disponible en
`http://localhost:8000/api/docs`; el chequeo de disponibilidad está en
`/health` requiere un JWT válido como el resto de las rutas privadas.

## Autenticación y autorización

`POST /api/v1/auth/login` recibe JSON con `email` y `password`, y devuelve un
access token JWT firmado con
HS256. El access token vence según `JWT_EXPIRATION` (por defecto, 8 horas).
`GET /api/v1/auth/me` requiere `Authorization: Bearer <token>`. El refresh
token (por defecto, 7 días) se rota en cada uso y se almacena como hash; logout
revoca toda la familia de tokens de esa sesión. Los usuarios se almacenan con
bcrypt (cost factor 12) y no existe registro público.

La inscripción (`POST /api/v1/inscripciones`) permanece pública. La interfaz de
coordinación exige el rol `COORDINADOR`; `CPR` puede autenticarse, pero su módulo
todavía no está disponible. Las rutas API pueden exigir roles con
`requerir_roles(...)`. El acceso de `DOCENTE` mediante link token se implementará
con el Módulo B cuando exista el modelo de seminarios.

`GET /api/v1/legajos` devuelve el listado básico para coordinación y requiere un
JWT válido con rol `COORDINADOR`. Incluye los datos de identificación del legajo,
`solicita_beca`, `tipo_beca` y, si existe, el tipo del documento `FORM_BECA`;
nunca expone rutas de almacenamiento ni URLs de archivos.
Admite combinar los filtros opcionales `estado`, `cohorte_id` (UUID), `carrera`
y `tiene_beca` (booleano, `true`/`false`); este último filtra por
`solicita_beca` y, si se omite, no limita los resultados.

En desarrollo, ejecutar `alembic upgrade head` y luego `python -m scripts.seed`
desde `backend` para crear cuentas locales:

| Rol | Email | Contraseña |
|---|---|---|
| COORDINADOR | `admin@fenix.test` | `Admin1234!` |
| CPR | `cpr@fenix.test` | `Cpr1234!` |

El seed rechaza cualquier entorno distinto de `development` y no restablece
contraseñas de usuarios existentes. En producción, configurar `ENVIRONMENT`,
`JWT_SECRET` (secreto aleatorio de al menos 32 caracteres) y una expiración
adecuada; la aplicación rechaza secretos de ejemplo.

Para aprovisionar una cuenta fuera del seed de desarrollo, usar
`python -m scripts.create_user <email> <COORDINADOR|CPR|ADMIN>` desde `backend`;
el comando solicita la contraseña sin mostrarla y almacena únicamente su hash.

## Inscripción pública

`POST /api/v1/inscripciones` recibe `multipart/form-data` y no requiere
autenticación. `carreras` se envía como una lista JSON; el resto de los campos
coincide con los nombres del formulario web. Los cinco documentos obligatorios
son `archivo_preinscripcion`, `archivo_dni`, `archivo_titulo`,
`archivo_partida` y `archivo_cuit`. `archivo_posgrado` es obligatorio si se
informa `titulo_posgrado`; `archivo_beca` si se solicita beca.

Se aceptan PDFs de hasta el límite configurado y se comprueba tanto el MIME
declarado como la firma del contenido. Una respuesta `201` contiene el código
de seguimiento y el estado inicial `Pendiente`; se devuelve `409` para DNI/email
duplicados o si no hay cohorte abierta.

Al recibir una inscripción, el backend envía una confirmación HTML y de texto al
email principal usando SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, `SMTP_STARTTLS` y `EMAIL_FROM`). En Docker, MailHog captura los
mensajes de desarrollo en `http://localhost:8025`. Los errores de entrega quedan
registrados en el log del backend.

## Servicios compartidos

Las dependencias reutilizables para módulos nuevos están en `src/shared`:

- `autorizacion.permisos`: `requerir_roles(...)` y
  `verificar_propietario_o_roles(...)` para
  autorización por rol y propiedad del recurso. La autorización del backend
  debe aplicarse en cada endpoint privado; proteger una ruta en React no la
  reemplaza.
- `correo.cliente_smtp`: envío de `EmailMessage` usando la configuración SMTP
  común.
- `auditoria.servicio.registrar_evento_auditoria`: agrega un evento de auditoría a la sesión
  SQLAlchemy; la transacción que realiza la operación debe confirmarlo.
- `limite_solicitudes.servicio.dependencia_limite_solicitudes`: limitador de ventana fija con
  contador persistente compartido por procesos. Debe agregarse como dependencia
  a los endpoints que lo requieran. No se aplica automáticamente a rutas de
  módulos.
- `http.encabezados.MiddlewareEncabezadosSeguridad` y
  `http.errores.ErrorAplicacion`: headers HTTP y formato común para errores de
  aplicación.

Las migraciones `20261116_0003` y `20261116_0004` crean y normalizan los nombres
de las tablas compartidas. En desarrollo, ejecutar `alembic upgrade head` antes
de usar esos servicios. Los detalles de auditoría no deben incluir contraseñas,
tokens ni otros datos sensibles.