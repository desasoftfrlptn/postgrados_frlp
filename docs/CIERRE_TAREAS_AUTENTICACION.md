# Cierre de tareas de autenticación y autorización

Responsable: Jony. Revisión: 17/11/2026.

El estado corresponde a la implementación y las pruebas automatizadas indicadas abajo. No implica que todas las funcionalidades del SRS estén terminadas ni reemplaza una prueba completa de la aplicación contra PostgreSQL desde el navegador.

| Tarea | Estado | Implementación / evidencia |
|---|---|---|
| API de inicio de sesión | Finalizada | `POST /api/v1/autenticacion/login`. |
| Validación de credenciales | Finalizada | Correo normalizado, cuenta activa, rol existente y contraseña verificada; error genérico 401. |
| Seguridad de contraseñas | Finalizada | Hash Argon2 con pwdlib; nunca se devuelve el hash en la API ni se registra en auditoría. |
| Generación de JWT | Finalizada | HS256, identidad `sub`, rol y vencimiento de 60 minutos. |
| Validación de JWT | Finalizada | Firma, algoritmo permitido, `sub` UUID y `exp` obligatorio y válido. |
| Consulta de usuario autenticado | Finalizada | `GET /api/v1/autenticacion/me`. |
| Gestión de roles | Finalizada | Rol consultado en la base; el seed usa ASPIRANTE, DOCENTE, COORDINADOR, CPR y ADMIN. |
| Autorización por rol | Finalizada | Administración exclusiva de ADMIN y conducción exclusiva de COORDINADOR; operaciones docentes verifican seminario asignado. |
| Protección de endpoints | Finalizada | Bearer obligatorio en rutas privadas. Los endpoints del sitio público conservan su acceso público. |
| Acceso a documentación | Finalizada | `GET /api/v1/documentos/{id}/download`: coordinador o aspirante propietario; validación de ruta física y respuesta sin caché. |
| Acceso a legajos | Finalizada | Listado/detalle/revisión para coordinador; consulta y edición propia con coincidencia de correo y DNI. |
| Control de operaciones | Finalizada | Acciones de conducción autorizadas, validación de transición y estado esperado; no se confía en botones ocultos. |
| Gestión de sesión expirada | Finalizada | Backend devuelve 401. Frontend cierra ante 401 de su token y al llegar al vencimiento; muestra aviso al volver al login. |
| Cierre de sesión | Finalizada | Se elimina el usuario/token en memoria y se cancela cualquier login pendiente que pudiera restaurarlo. Ver estrategia debajo. |
| Manejo de errores | Finalizada | 401 y `WWW-Authenticate: Bearer` ante autenticación inválida; 403 para rol no autorizado; 404 para documento inexistente o ajeno; validación/conflictos según operación. |
| Auditoría de acciones | Finalizada | Conducción registra acciones y verificaciones. Administración registra altas, ediciones (incluido rol), activaciones, desactivaciones y bajas de usuarios en la misma transacción. |
| Pruebas de autenticación | Finalizada | Login válido/inválido, cuenta desactivada, firma incorrecta, expiración ausente/inválida, identidad, cierre y vencimiento visual. |
| Pruebas de autorización | Finalizada | Restricción por rol, aislamiento de documentos, legajos y seminarios, y acceso administrativo a auditoría. |
| Alta de usuarios | Finalizada | ADMIN, hash seguro, rol existente, control de duplicados y auditoría. |
| Edición de usuarios | Finalizada | ADMIN, campos permitidos, rechazo de campos en blanco y duplicados, auditoría sin secretos. |
| Asignación de roles | Finalizada | Rol existente; se recarga la relación tras editar. Un administrador no puede quitarse su propio rol. |
| Activación y desactivación | Finalizada | ADMIN; no se permite autodesactivación. Una cuenta desactivada no puede entrar ni utilizar tokens emitidos previamente. |

## Estrategia de sesión

Se conserva JWT stateless y sesión React en memoria. Cerrar sesión borra las credenciales del cliente y desmonta las vistas privadas. No hay cookie de sesión ni almacenamiento del token en localStorage. Recargar requiere volver a ingresar.

El cierre local **no revoca una copia del JWT en otro cliente**: esa copia puede ser válida hasta su vencimiento, mientras la cuenta continúe activa. No se agregó un endpoint de logout que aparente revocar tokens sin hacerlo. La autorización siempre usa el rol y el estado actuales de la base, no el rol histórico del token. El reloj del frontend mejora la experiencia; la validación del servidor sigue siendo la autoridad.

## Archivos privados

Solo `/uploads/noticias` se sirve públicamente. Los nuevos documentos se guardan en `STORAGE_PATH/legajos`, o en `storage_privado/legajos` si no se configura esa variable. Se mantiene descarga autenticada de documentos anteriores en `uploads/legajos`, sin volver a exponer esa carpeta por URL.

El coordinador descarga desde el detalle del legajo. El aspirante puede descargar su propio documento por API. ADMIN y DOCENTE no obtienen acceso a documentos privados por tener esos roles.

## Auditoría

Se reutiliza `auditoria_conduccion`, distinguiendo `recurso_tipo=LEGAJO` y `recurso_tipo=USUARIO`; no se necesita una nueva tabla ni migración. Para usuarios se guarda actor, acción, fecha e información anterior/nueva, sin contraseñas ni tokens. Los cambios de rol se identifican por `rol_id` anterior y nuevo.

Un administrador puede consultar los últimos 100 eventos del usuario mediante `GET /api/v1/autenticacion/usuarios/{id}/auditoria`. Las operaciones fallidas por permisos o validación no se registran como operaciones exitosas. Si falla la transacción, también se revierte su auditoría.

## Verificación reproducible

Resultado local: **287 pruebas de backend y 39 de frontend aprobadas; lint y build del frontend aprobados**. El build conserva un aviso de tamaño de bundle. La instalación de dependencias también informó 19 alertas de npm (10 moderadas y 9 altas); no se aplicaron actualizaciones automáticas de versiones en esta tarea.

Desde la raíz del repositorio, con los servicios iniciados:

```powershell
docker compose exec -T backend python -m pytest -q
docker compose exec -T frontend npm run test:run
docker compose exec -T frontend npm run lint
docker compose exec -T frontend npm run build
```

El Dockerfile de desarrollo del backend instala `requirements-test.txt`. Para un contenedor creado antes de ese cambio:

```powershell
docker compose exec -T backend pip install -r requirements-test.txt
docker compose exec -T frontend npm ci
```

El workflow de GitHub Actions ahora ejecuta ambas suites además de las verificaciones existentes. Su ejecución remota debe comprobarse después del push; no se publicó ningún cambio en esta intervención.

Las pruebas de servicios y endpoints sustituyen la sesión de base por dobles de prueba, y las de frontend simulan la API. Las pruebas de documentos sí crean y leen archivos temporales. No se midió cobertura ni se ejecutó un E2E completo contra la base real.

## Comprobación manual para la defensa

1. Iniciar sesión como ADMIN y crear una cuenta de prueba.
2. Editar nombre, apellido y rol; consultar `/me` con esa cuenta para verificar el rol actual.
3. Intentar una operación administrativa como ASPIRANTE: debe responder 403.
4. Desactivar la cuenta y repetir `/me` con su token anterior: debe responder 401. React debe volver al login si recibe ese rechazo.
5. Reactivar la cuenta y volver a ingresar.
6. Como coordinador, iniciar revisión, guardar verificación, aprobar y consultar el historial del legajo.
7. Descargar un PDF desde el detalle; sin token debe responder 401 y con otro aspirante debe responder 404.
8. Consultar la auditoría del usuario como ADMIN y comprobar actor y cambios.
9. Cerrar sesión y utilizar Atrás: las vistas privadas deben quedar inaccesibles.

En bases antiguas, ejecutar el seed para agregar CPR si falta. Las cuentas que aún tengan el rol histórico `EQUIPO PRODUCCION` pueden reasignarse a CPR desde administración; no se modifican cuentas existentes automáticamente.
