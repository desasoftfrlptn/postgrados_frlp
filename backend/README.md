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

La inscripción (`POST /api/v1/legajos`) permanece pública. La interfaz de
coordinación exige el rol `COORDINADOR`; `CPR` puede crear y modificar trabajos
finales. Las rutas API pueden exigir roles con
`requerir_roles(...)`. El acceso de `DOCENTE` mediante link token se implementará
con el Módulo B cuando exista el modelo de seminarios.

`GET /api/v1/legajos`, `GET /api/v1/legajos/exportar` y las rutas de gestión de
cohortes requieren un JWT válido con rol `COORDINADOR`. `GET
/api/v1/legajos/{id}` y `GET /api/v1/documentos/{id}/download` admiten al
coordinador o al dueño del legajo. El listado incluye los datos de
identificación del legajo, `solicita_beca`, `tipo_beca` y, si existe, el tipo
del documento `FORM_BECA`; nunca expone rutas de almacenamiento ni checksums.
Los filtros combinables son `estado`, `cohorte_id` (UUID), `carrera`,
`tiene_beca` (`true`/`false`), `dni` exacto y `apellido` parcial
case-insensitive (mínimo tres caracteres). `tiene_beca` filtra por
`solicita_beca` y, si se omite, no limita los resultados.

`GET /api/v1/cohortes` es público y devuelve únicamente las cohortes abiertas y
los datos mínimos para elegir una en el formulario. `GET
/api/v1/cohortes/proxima-apertura` devuelve la fecha pública más próxima que
informó coordinación. `GET /api/v1/cohortes/gestion`, `POST /api/v1/cohortes` y
`PATCH /api/v1/cohortes/{id}/inscripcion` requieren `COORDINADOR`; al cerrar un
período se debe informar la fecha prevista de reapertura. Las cohortes mantienen
períodos independientes.

La exportación aplica los mismos filtros del listado, genera un XLSX de hasta
500 resultados con encabezados en negrita, anchos ajustados y autofiltro. Su
nombre incluye cohorte y fecha cuando se filtra por cohorte.

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

`POST /api/v1/legajos` recibe `multipart/form-data` y no requiere
autenticación. `carreras` se envía como una lista JSON; el resto de los campos
coincide con los nombres del formulario web. Los cinco documentos obligatorios
son `archivo_preinscripcion`, `archivo_dni`, `archivo_titulo`,
`archivo_partida` y `archivo_cuit`. `archivo_posgrado` es obligatorio si se
informa `titulo_posgrado`; `archivo_beca` si se solicita beca.

El campo opcional `cohorte_id` selecciona una cohorte específica; si se omite,
se mantiene la selección automática de la cohorte abierta más reciente. Se
aceptan PDFs de hasta el límite configurado y se comprueba tanto el MIME
declarado como la firma del contenido. Una respuesta `201` contiene el código
de seguimiento y el estado inicial `Pendiente`; se devuelve `409` para DNI/email
duplicados o si no hay cohorte abierta.
La ruta admite hasta 10 envíos por IP en una ventana fija de una hora; al superar
el límite responde `429` con el encabezado `Retry-After`.

Al recibir una inscripción, el backend genera un token privado aleatorio del
dueño, guarda solo su hash y lo envía al email principal en una confirmación
HTML y de texto. El token vence a los 30 días y se envía en el encabezado
`Authorization: Bearer <token>` para consultar el detalle y operar con los
documentos de ese legajo. No se devuelve en la respuesta HTTP.
La migración no emite tokens para legajos ya existentes; estos siguen
disponibles para coordinación, y el acceso de propietario se habilita
automáticamente para nuevas inscripciones.

`POST /api/v1/legajos/{id}/documentos` recibe `multipart/form-data` con
`tipo` y `archivo`. Solo acepta los tipos documentales del Core, verifica MIME,
firma PDF y tamaño máximo, y almacena el archivo con nombre UUID y checksum
SHA-256. El dueño puede agregar o reemplazar documentos mientras el legajo está
`Pendiente` u `Observado`; reemplazar devuelve `200`, agregar devuelve `201` y
otros estados responden `409`. Los títulos de posgrado y formularios de beca
solo se admiten si fueron declarados en la inscripción.

`GET /api/v1/documentos/{id}/download` transmite el PDF en línea al
coordinador o al dueño autenticado del legajo, sin exponer la ruta privada.

Los emails se envían usando SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, `SMTP_STARTTLS` y `EMAIL_FROM`). En Docker, MailHog captura los
mensajes de desarrollo en `http://localhost:8025`. Los errores de entrega quedan
registrados en el log del backend.

## Notificaciones por cambios de estado

`PATCH /api/v1/legajos/{legajo_id}/estado` requiere el rol
`COORDINADOR`. Al ejecutar `OBSERVAR`, envía al aspirante el motivo registrado;
al ejecutar `APROBAR`, cambia el estado a `Completado`, asigna el número de
legajo y envía el aviso de aprobación. La confirmación de inscripción se envía
al crear el legajo en estado `Pendiente`.

Los tres correos comparten una plantilla HTML con el logo público de UTN FRLP y
una alternativa de texto para clientes de correo que no renderizan HTML. Se
envían mediante `BackgroundTasks` y el cliente SMTP compartido; los errores se
registran sin bloquear la operación. Como documenta ADR-006, estas tareas no
son una cola durable y no tienen reintentos persistentes.

Cada día a las 03:00 (hora local del servidor), la tarea del ciclo de vida de
FastAPI vence las reservas que llevan 30 días en `Completado` sin una transición
posterior. El cambio queda auditado y se envía un correo con los legajos
afectados a cada usuario activo con rol `COORDINADOR`.

Todas las respuestas HTTP incluyen los encabezados de seguridad configurados
por `MiddlewareEncabezadosSeguridad`. CORS permite el origen definido en
`CORS_ORIGIN`.

## Trabajos finales (US-C-001)

Las tres operaciones usan `Authorization: Bearer <access_token>`:

- `POST /api/v1/legajos/{id}/trabajo-final`: `CPR` registra un trabajo para
  un legajo existente y recibe el registro completo con su `id` y `legajo_id`
  (`201`). Un legajo puede tener varios trabajos.
- `PATCH /api/v1/trabajos-finales/{id}`: `CPR` modifica parcialmente el
  registro y recibe el resultado (`200`). Se debe enviar al menos un campo;
  únicamente `codirector` puede establecerse en `null`.
- `GET /api/v1/legajos/{id}/trabajo-final`: `CPR` o `COORDINADOR` obtiene un
  arreglo de trabajos; si no existen, el arreglo está vacío.

Ejemplo de creación:

```json
{
  "tipo": "Maestría",
  "titulo": "Investigación aplicada",
  "director_nombre": "María Pérez",
  "director_email": "directora@example.com",
  "codirector": null,
  "fecha_aprobacion_cpr": "2026-10-10",
  "numero_resolucion": "123/2026"
}
```

Los tipos aceptados son `TFI`, `Maestría` y `Doctorado`. Todos los campos son
obligatorios salvo `codirector`. El servidor valida textos, email y fecha.
Responde `401` si falta o es inválida la autenticación, `403` ante un rol sin
permiso, `404` para un recurso inexistente y `422` ante datos inválidos. Las
creaciones, modificaciones e intentos denegados de escritura se registran en
auditoría sin guardar el contenido del trabajo. Un aspirante con token de
propietario vigente también recibe `403` al intentar escribir y su legajo queda
identificado en el evento; un token vencido o inválido recibe `401`.
Los errores de estas rutas siguen el formato de arquitectura: `statusCode`,
`error`, `message`, `field` (puede ser `null`) y `timestamp` UTC.

La migración `20261116_0009` depende de `20261116_0007`. En este árbol las
migraciones vacías de carga académica están inactivas. Si una base ya registra
la revisión `20261116_0008`, Alembic no podrá actualizarla automáticamente:
revisar su historial y esquema antes de intervenir; no cambiar su versión sin
verificarla. El semáforo y las alertas corresponden a historias posteriores.

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