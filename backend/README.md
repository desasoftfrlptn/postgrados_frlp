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
finales. Las rutas API pueden exigir roles con `requerir_roles(...)`. El acceso
`DOCENTE` usa un token opaco específico de seminario, no una cuenta ni JWT.

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

## Acceso docente (US-B-001)

Coordinación usa su JWT para:

1. `POST /api/v1/seminarios`: crear un seminario con `cohorte_id`, `nombre`,
   `docente_nombre`, `docente_email` y `fecha_fin_cuatrimestre` (`AAAA-MM-DD`).
2. `GET /api/v1/seminarios?cohorte_id=<uuid>`: consultar seminarios; el filtro
   de cohorte es opcional.
3. `POST /api/v1/seminarios/{id}/inscripciones`: enviar
   `{"legajo_ids":["<uuid>"]}`. Los legajos deben estar activos y pertenecer
   a la cohorte. Un lote inválido no se inscribe parcialmente.
4. `POST /api/v1/seminarios/{id}/enlace`: enviar `{}` o
   `{"expira_en":"2027-07-01T00:00:00-03:00"}`. Devuelve `token`,
   `expira_en` y `enlace`. El vencimiento opcional debe incluir zona horaria
   y ser futuro. Por defecto vence al terminar la fecha informada para el
   cuatrimestre en horario argentino UTC-3.

El docente usa `Authorization: Bearer <token>` en
`GET /api/v1/seminarios/{id}/estudiantes`. La respuesta contiene el seminario
y sus estudiantes inscriptos, excluyendo legajos dados de baja. Un token
vigente de otro seminario recibe `403`; uno ausente, inválido o vencido recibe
`401`. Los errores usan el formato documentado en arquitectura.

Cada token se genera con 32 bytes aleatorios y se almacena como hash SHA-256;
generar otro enlace invalida el anterior. El token se entrega en el fragmento
del enlace (`#token=...`) para que no se envíe al servidor en la URL. Debe
tratarse como contraseña y compartirse de forma segura. Las respuestas con
credenciales o datos docentes llevan `Cache-Control: no-store`.

La ruta de frontend incluida en el enlace todavía no está implementada: el
backend puede consumirse directamente, pero abrir el enlace en el navegador no
muestra aún la planilla.

El docente puede usar `POST /api/v1/seminarios/{id}/clases`, `PATCH
/api/v1/seminarios/{id}/clases/{clase_id}`, `PATCH
/api/v1/seminarios/{id}/asistencias`, `PATCH /api/v1/seminarios/{id}/notas` y
`GET /api/v1/seminarios/{id}/exportar`. La planilla incluye clases,
asistencias, porcentaje y condición; solo cuentan las clases ya dictadas.
Las notas admiten valores numéricos de 1 a 10 con hasta un decimal. El dueño
del legajo y coordinación pueden consultar el resultado actualizado en `GET
/api/v1/legajos/{id}/seminarios`.

Coordinación puede clasificar un seminario por carrera y obligatoriedad mediante
`PATCH /api/v1/seminarios/{id}/plan`, y configurar la fecha límite de notas con
`PATCH /api/v1/seminarios/{id}/fecha-limite-notas`. La tarea diaria de las
08:00 (hora local del servidor) envía recordatorios cuando faltan como máximo
48 horas y quedan notas pendientes; se repiten cada 24 horas hasta el plazo.
Los errores SMTP se registran; no existe una cola durable de recordatorios.

Ejecutar `alembic upgrade head` para aplicar `20261117_0010`. Si la base fue
usada con la antigua revisión `0008` o ya contiene tablas del módulo B, revisar
el historial y el esquema antes de migrar; esta revisión crea esas tablas y no
las modifica ni reemplaza automáticamente.
La revisión `20261117_0011` agrega las tablas de clases y asistencia y los
campos de notas, carrera y fecha límite; los seminarios existentes quedan sin
clasificar hasta que coordinación los configure.

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
verificarla.

## Seguimiento de graduación (US-C-002 a US-C-004)

Las rutas usan `Authorization: Bearer <access_token>` y conservan el formato
común de errores. Coordinación configura el plan por cohorte y carrera:

1. Crear o clasificar los seminarios de la cohorte mediante
   `POST /api/v1/seminarios` o `PATCH /api/v1/seminarios/{id}/plan` con
   `{"carrera":"Maestría","es_obligatorio":true}`.
2. Confirmar que el conjunto de seminarios obligatorios está completo con
   `POST /api/v1/graduacion/planes/confirmar` y
   `{"cohorte_id":"<uuid>","carrera":"Maestría","confirmar":true}`.
   `GET /api/v1/graduacion/planes?cohorte_id=<uuid>` lista los planes.
   Una modificación de la clasificación invalida las confirmaciones afectadas.
3. Para recibir alertas, un `ADMIN` o `COORDINADOR` asigna coordinadores activos
   por carrera con `POST /api/v1/graduacion/asignaciones` y
   `{"carrera":"Maestría","usuario_id":"<uuid>"}`. Se pueden consultar con
   `GET /api/v1/graduacion/asignaciones` y quitar con
   `DELETE /api/v1/graduacion/asignaciones/{id}`.
4. `POST /api/v1/graduacion/recalcular`, para coordinación, calcula los estados
   y procesa las alertas pendientes. Devuelve `cambios`, `alertas_enviadas` y
   `alertas_pendientes`. También se ejecuta diariamente a las 02:00, hora local
   del servidor, mientras la aplicación esté en funcionamiento.

`GET /api/v1/legajos/{id}/semaforo` devuelve un arreglo con un estado por
carrera del legajo. Sin plan confirmado informa `SIN_DATOS`; después de
confirmar o reconfirmar y hasta el siguiente cálculo informa `SIN_EVALUAR`.
La respuesta calculada incluye motivo, seminarios adeudados, última fecha de
avance, días sin avance y fecha de cambio. Solo coordinación puede consultar
o usar `PATCH` en esa ruta con
`{"carrera":"Maestría","estado":"VERDE"}`; el próximo recálculo vuelve a
aplicar las reglas automáticas.

`POST /api/v1/legajos/{id}/avances-tesis` permite a `CPR` registrar
`{"carrera":"Maestría","fecha":"2026-10-10","descripcion":"Revisión de tesis"}`.
La carrera debe pertenecer al legajo y la fecha debe estar entre su inscripción
y la fecha actual. El último avance también considera aprobaciones CPR,
asistencias y cambios de notas en seminarios de esa carrera.

`GET /api/v1/graduacion/en-riesgo?page=1&limit=20` devuelve los legajos activos
en ROJO, ordenados por fecha de cambio más antigua. `limit` admite 1 a 500;
`GET /api/v1/graduacion/en-riesgo/exportar` descarga el listado completo en
XLSX. Ambos requieren `COORDINADOR`. Los seminarios obligatorios no inscriptos
cuentan como adeudados; los inscriptos se consideran aprobados según su nota y
asistencia del módulo B.

El cálculo sigue el algoritmo de Arquitectura, con duraciones de 730, 1095 y
1825 días para Especialización, Maestría y Doctorado. Los umbrales se comparan
estrictamente y el cálculo puede asignar VERDE automáticamente. Esta decisión
contradice BR-008 del SRS y fue elegida para esta implementación. Los cambios
quedan auditados; al entrar en ROJO se registra una alerta con motivo y días
restantes. Sin coordinadores asignados o ante un fallo SMTP la alerta queda
pendiente para reintento. Los mensajes pendientes describen el cambio histórico,
por lo que podrían llegar cuando el estado ya haya cambiado. Si ocurre una
caída después del envío SMTP y antes de confirmar la entrega, puede repetirse.
La tarea depende de que haya un proceso de aplicación activo; no es una cola
externa ni garantiza horarios o entrega exactamente una vez.

La migración `20261117_0012` crea los planes, asignaciones, avances, estados y
alertas. Ejecutar `alembic upgrade head` antes de iniciar el backend. Las
pruebas de migración incluidas usan SQLite; validar también la migración en el
entorno PostgreSQL de destino antes del despliegue. Los recordatorios docentes
generan el token antes de enviar el correo y confirman la transacción después:
existe una breve ventana en que el enlace recibido aún no está confirmado.

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