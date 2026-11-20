# Avance de implementación: autenticación y perfiles

> Esta guía describe el avance actual observado en el código y lo informado durante el trabajo. No significa que todo el sistema esté terminado. Por indicación del equipo, no se ejecutaron pruebas automatizadas.

## 1. Resumen para presentar

Se conectó una primera versión del formulario de inicio de sesión de React con un endpoint de FastAPI. FastAPI consulta las cuentas en PostgreSQL, verifica la contraseña usando un hash Argon2, obtiene el rol y devuelve datos de la persona junto con un JWT. React usa esa respuesta para mostrar el nombre y el rol, y dirigir a la persona a un dashboard.

También se cargó el catálogo de roles mediante un script y se creó una herramienta de consola para generar cuentas de desarrollo. El endpoint de inscripción recibe los datos del aspirante y crea un legajo. Las pantallas de aspirante y docente ya pueden mostrar los datos recibidos al iniciar sesión; varias tarjetas todavía contienen datos de ejemplo.

## 2. Organización del proyecto: qué hace cada capa y por qué

En el backend se distribuye el trabajo entre cuatro capas:

1. **Presentación:** recibe solicitudes HTTP y produce respuestas; en React, contiene páginas y componentes visuales.
2. **Aplicación:** ejecuta casos de uso, como iniciar sesión o crear una cuenta.
3. **Dominio:** representa conceptos y reglas del sistema.
4. **Infraestructura:** conecta con PostgreSQL y contiene detalles técnicos, como modelos SQLAlchemy.

La separación permite cambiar una parte sin mezclar responsabilidades. Por ejemplo, la ruta HTTP delega la comprobación de contraseña al servicio, y el servicio consulta datos por medio de la sesión de base de datos.

### Backend actual

La raíz del backend es **src/backend/**. **main.py** crea la aplicación FastAPI e incluye los enrutadores. El comando **uvicorn main:app --reload** se ejecuta desde esa carpeta: **main** es el módulo del archivo **main.py** y **app** es el objeto FastAPI que Uvicorn debe iniciar.

~~~text
src/backend/
├── main.py
└── src/
    ├── autenticacion/
    │   ├── aplicacion/
    │   ├── dominio/
    │   ├── infraestructura/
    │   └── presentacion/
    ├── compartido/
    ├── inscripcion/
    │   ├── dominio/
    │   ├── infraestructura/
    │   └── presentacion/
    ├── infraestructura/       # hoy contiene un modelo de noticias
    └── scripts/
~~~

La estructura de autenticación e inscripción sigue módulos con responsabilidades claras. La organización aún necesita una pasada: el modelo de noticias vive en una infraestructura genérica y existe una carpeta **noticias/infraestructura** vacía. También se encontró un seed duplicado; el script funcional está en **src/scripts/seed_roles.py**, mientras que **scripts/seed_roles.py** no es un archivo Python ejecutable. Conviene mover el modelo de noticias a su módulo, actualizar referencias y retirar duplicados solo después de revisar quién los usa. Ese trabajo está pendiente.

### Frontend actual

El frontend está en **src/frontend/** y se separa en módulos funcionales, como manejo de sesión, perfiles, inscripción, calendario y noticias. El router conecta las direcciones web con páginas. **shared** contiene elementos que se reutilizan entre módulos. El layout de perfil agrupa elementos compartidos como la barra lateral, la cabecera y el botón de cerrar sesión.

## 3. PostgreSQL, SQLAlchemy y cuentas

SQLAlchemy permite representar tablas como clases Python. **UsuarioORM** representa la tabla de usuarios y **RolORM** la tabla de roles. El usuario guarda un identificador del rol mediante una clave foránea. Así se puede conocer el rol de una cuenta consultando su relación con la tabla de roles.

El usuario tiene campos como nombre, apellido, DNI, correo electrónico, hash de contraseña, rol y estado activo. El DNI y el correo son únicos para impedir duplicados; la clave foránea impide asignar un rol que no exista.

Archivos centrales:

- **src/backend/src/autenticacion/infraestructura/orm_modelos.py**
- **src/backend/src/compartido/conexion.py**

### Por qué se cambió el nombre de la columna de contraseña

El script construía el modelo con **contrasena_hash**, pero una versión de **UsuarioORM** había definido el atributo con una **ñ**. SQLAlchemy exige que los argumentos del constructor coincidan exactamente con los atributos del modelo, por eso indicó que **contrasena_hash** era un argumento inválido.

Se acordó usar **contrasena_hash** sin tilde en el modelo y en el código. Los nombres técnicos ASCII son más sencillos de compartir entre Python, SQL, terminales y herramientas, y evitan diferencias de escritura.

La contraseña original no se almacena. Antes de insertar la cuenta se calcula un hash Argon2. Al iniciar sesión, se compara la contraseña recibida con ese hash. No se puede recuperar la contraseña original desde PostgreSQL; esa es una propiedad deseable para proteger las credenciales.

### Catálogo de roles y script de alta

Un rol no es un usuario: el seed inserta opciones en **roles**, y el script de creación agrega una persona a **usuarios** con referencia a uno de esos roles.

Desde **src/backend/** se invocan los módulos así:

~~~bash
python -m src.scripts.seed_roles
python -m src.scripts.crear_usuario
~~~

La opción **-m** le pide a Python que ejecute un módulo del paquete. Así los imports **src...** funcionan al correr desde la raíz del backend. Escribir el nombre del archivo sin Python intenta encontrar un comando del shell, y ejecutar una ruta equivocada produce “file not found”. El script de alta solicita la contraseña con **getpass**; no muestra los caracteres mientras se escribe para que no queden expuestos en pantalla.

Los roles que aparecieron durante el trabajo fueron **ASPIRANTE**, **DOCENTE**, **COORDINADOR**, **ADMIN** y **CPR** / “Equipo de Producción”. Existe una diferencia pendiente entre el seed, la base y tipos del frontend. Recomendación: mantener un identificador técnico único y estable, por ejemplo **CPR**, y traducirlo en la interfaz a “Equipo de Producción”. Los roles se usan como identificadores; el texto presentado puede cambiar sin renombrar datos internos.

El script de consola es útil para desarrollo. En el producto final no debería permitirse que cualquier visitante se asigne **ADMIN** desde un formulario público. Los roles privilegiados requieren autorización administrativa.

## 4. Login: flujo completo y razón de cada paso

El endpoint es **POST /api/v1/autenticacion/login**, definido en **src/backend/src/autenticacion/presentacion/rutas.py**.

1. **React recoge correo y contraseña.** La página **src/frontend/src/modulos/manejo-sesion/paginas/LoginPage.tsx** valida que se completen los campos. El CAPTCHA reduce envíos automatizados desde el formulario. Hoy el navegador comprueba que exista un token; aún falta enviar el token a FastAPI y validarlo del lado del servidor. La validación solo en el cliente no es una barrera de seguridad suficiente.
2. **AuthProvider llama a la API.** **AuthProvider.tsx** manda el correo y la contraseña como JSON usando el cliente HTTP compartido. El proveedor centraliza el estado de sesión para que las distintas páginas puedan consultar al mismo usuario.
3. **FastAPI valida y busca.** El esquema de entrada comprueba la forma de los datos. El servicio **iniciar_sesion** normaliza el correo, consulta PostgreSQL y carga también el rol relacionado.
4. **El servicio verifica la cuenta.** Si no existe, está desactivada o la contraseña no coincide, responde HTTP 401. Se usa un mensaje genérico para no revelar si un correo está registrado.
5. **Se verifica el hash.** La contraseña se compara con el hash Argon2 almacenado; nunca se “descifra” el hash.
6. **Se crea el JWT.** Si las credenciales son correctas, el backend firma un token con HS256. Incluye el identificador de usuario (**sub**), el rol y el vencimiento. La clave de firma viene de **SECRET_KEY** en el entorno y no debe publicarse ni pegarse en documentación.
7. **React recibe la sesión.** La respuesta incluye id, nombre, apellido, correo, tipo de usuario y token. El proveedor adapta esos campos al formato que usa la aplicación.

### Límite de seguridad actual

El token existe, pero el cliente HTTP todavía no lo adjunta en las solicitudes como **Authorization: Bearer ...**. La ruta protegida del frontend comprueba que haya un usuario en el contexto, lo cual sirve para navegación visual, pero no reemplaza autorización en el servidor. Cada endpoint privado debe verificar el JWT y comprobar permisos/rol. La sesión se mantiene en memoria React, así que al recargar se pierde. Persistencia, renovación y validación de token son trabajo pendiente.

## 5. Rol, redirección y dashboards

Después de login, el frontend usa el rol para elegir el destino:

| Rol | Ruta actual |
|---|---|
| **ASPIRANTE** | **/dashboard** |
| **DOCENTE** | **/dashboard/docente** |
| Otros roles | **/dashboard/general** |

El panel general es una vista de preparación para **ADMIN** y otros perfiles. Por eso puede iniciar sesión como administrador y todavía no disponer de todas las asignaciones administrativas. Las tarjetas de clases, métricas y notificaciones que aparecen en algunos dashboards son actualmente valores de demostración, no datos consultados desde FastAPI.

El nombre visible se conectó al usuario de la sesión; antes había nombres fijos como Juan o Margarita. El menú para alternar entre vistas de prueba ayuda durante el desarrollo visual, pero no impone permisos. Debe quitarse o quedar restringido al finalizar la autorización por roles.

## 6. Inscripción

La inscripción es otro caso de uso, separado del login. **POST /api/v1/inscripcion/** recibe los datos, detecta duplicados y crea un legajo en estado **PENDIENTE**. Usa HTTP 201 cuando crea el registro y HTTP 409 ante un conflicto, como un correo o documento ya usado.

Un legajo de inscripción y una cuenta para iniciar sesión son entidades distintas. El proceso de vincular el legajo aprobado con un usuario y asignarle **ASPIRANTE** debe decidirse e implementarse expresamente. El endpoint observado cubre la creación; consultar, actualizar o borrar inscripciones sigue pendiente y debe respetar reglas de negocio y permisos.

## 7. Errores que aparecieron y su explicación

| Mensaje o síntoma | Qué significaba | Aprendizaje / resolución |
|---|---|---|
| Error de SQLAlchemy con **Column(unique=...)** | **unique** recibió un valor que no era booleano. | Para unicidad simple se usa verdadero/falso; restricciones con nombre se definen con **UniqueConstraint**. |
| **ModuleNotFoundError** con imports **src** o **backend** | Python se inició desde una carpeta que no era la raíz esperada. | Ejecutar desde **src/backend/** y usar imports consistentes **src...**. |
| No se encontraba el script o Bash decía “command not found” | La ruta o la forma de ejecución era incorrecta. | Ejecutar **python -m src.scripts.seed_roles** desde el backend. |
| La contraseña no aparecía al escribir | **getpass** oculta deliberadamente la entrada. | Escribirla y pulsar Enter; la falta de caracteres en pantalla es normal. |
| **No module named jose** | Faltaba instalar la distribución Python que expone ese módulo. | Se agregó **python-jose[cryptography]**; **python-jose** es el paquete y **jose** el nombre importado. |
| **contrasena_hash** no era argumento válido | El nombre usado por el script no coincidía con el atributo del ORM. | Uniformar el modelo y el script con **contrasena_hash**. |
| Faltaba **dni** al crear usuario | El campo obligatorio del modelo no se pedía o no se pasaba al constructor. | Agregar la entrada DNI y asignarla al modelo. |
| Login no aparecía en Swagger | Se estaba mirando una instancia o un puerto distintos, o el router no estaba en esa app. | Se inspeccionó **app.routes** y apareció el endpoint; después Swagger lo mostró. |
| Swagger “Failed to fetch” | Puede deberse a CORS, host o puerto distinto, o backend apagado. | Alinear origen permitido, URL, puerto y servidor. |
| No se podía ver la contraseña en PostgreSQL | La base conserva hash, no texto original. | Es lo correcto; al login se escribe la contraseña elegida originalmente. |
| Los compañeros no encontraban las cuentas | Sus computadoras conectaban a bases locales diferentes. | Usar una instancia compartida del backend y una base común accesible por esa instancia. |

## 8. Arranque local y datos de entorno

La sesión SQLAlchemy y la conexión se configuran en **src/backend/src/compartido/conexion.py**. La URL de PostgreSQL se obtiene desde el entorno. **.env** puede contener claves y contraseñas; por eso esta documentación no las incluye.

Desde **src/backend/** se inicia con:

~~~bash
uvicorn main:app --reload
~~~

**--reload** reinicia el servidor de desarrollo cuando cambian archivos. En una ejecución reportada, Uvicorn se conectó a PostgreSQL y mostró “Application startup complete”.

El arranque usa **Base.metadata.create_all** para crear tablas faltantes de los modelos registrados. El repositorio también tiene Alembic. Para cambios de esquema que deban conservar datos y repetirse en distintos entornos, se deben preparar migraciones Alembic en vez de borrar la base de datos.

## 9. Por qué las cuentas no aparecen automáticamente en las computadoras del equipo

Una base PostgreSQL instalada en una computadora almacena datos para esa instalación. Crear allí una cuenta no la copia a la base del compañero. Todos deben usar un backend compartido, conectado a una base común.

Para una demo en una red local se necesita que el backend escuche en una dirección accesible desde otros equipos, configurar **VITE_API_URL** con la IP del equipo anfitrión y puerto correcto, permitir el origen del frontend en CORS y habilitar el puerto del backend en el firewall. PostgreSQL debería aceptar conexiones del backend, no exponerse directamente a Internet.

**localhost** siempre significa “esta misma computadora”. Compartir una dirección de Swagger con **localhost** no comparte el servidor. La puesta en común de red se conversó, pero no está confirmada como realizada.

## 10. Avances observados y pruebas

Durante el trabajo se reportó que la importación de modelos mostró **Modelos OK**, Uvicorn terminó el arranque con conexión a PostgreSQL, el seed cargó roles, la creación de usuario guardó un hash Argon2, Swagger respondió HTTP 200 con credenciales válidas y el frontend llegó a mostrar el usuario Aspirante y Docente con su rol. El rol ADMIN se dirigió al panel general de preparación.

Son comprobaciones manuales informadas durante el avance. **No se ejecutaron pruebas automatizadas**, conforme a la instrucción del equipo. La fila de testing de la plantilla queda pendiente.

## 11. Pendientes para continuar

1. Alinear los valores de rol del seed, PostgreSQL y frontend; decidir etiqueta visible de Equipo de Producción.
2. Implementar las asignaciones reales de ADMIN, COORDINADOR y Equipo de Producción.
3. Añadir validación JWT y autorización de rol en rutas privadas del backend.
4. Definir persistencia y renovación de la sesión en React.
5. Validar el token CAPTCHA desde FastAPI.
6. Ordenar los módulos de backend y consolidar scripts duplicados.
7. Definir el vínculo entre inscripción, legajo y cuenta de usuario.
8. Completar consulta, modificación y eliminación de inscripciones con autorización.
9. Cambiar datos ficticios de los dashboards por datos de la API.
10. Preparar un backend y base compartidos para las pruebas de los compañeros.
11. Incorporar pruebas automatizadas cuando el equipo indique que corresponde.

## 12. Guion

> “Primero cargamos los roles disponibles en PostgreSQL y creamos cuentas de desarrollo con un script. Guardamos contraseñas como hashes Argon2 para no almacenarlas en texto legible. Al iniciar sesión, React envía las credenciales a FastAPI; el backend consulta la cuenta, revisa que esté activa y verifica el hash. Si coincide, responde con los datos, el rol y un JWT. React usa esa respuesta para mostrar el nombre y abrir el dashboard asociado. El flujo fue observado con cuentas de aspirante, docente y administrador. Los dashboards generales y parte de sus datos siguen en desarrollo. Como próximos pasos quedan autorización del JWT en las rutas privadas, permisos por rol, unión de la inscripción con las cuentas y pruebas automatizadas.”

## 13. Referencias del código

- [Aplicación FastAPI](../src/backend/main.py)
- [Conexión y sesiones SQLAlchemy](../src/backend/src/compartido/conexion.py)
- [Modelos de autenticación](../src/backend/src/autenticacion/infraestructura/orm_modelos.py)
- [Servicio de autenticación y JWT](../src/backend/src/autenticacion/aplicacion/servicio.py)
- [Rutas de autenticación](../src/backend/src/autenticacion/presentacion/rutas.py)
- [Proveedor de sesión React](../src/frontend/src/modulos/manejo-sesion/AuthProvider.tsx)
- [Cliente HTTP frontend](../src/frontend/src/shared/api/client.ts)
- [Router del frontend](../src/frontend/src/shared/router/index.tsx)
