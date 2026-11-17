# ADR-003: Autenticacion y autorizacion de API

- **Estado:** Propuesto; requiere aprobacion del equipo
- **Fecha:** 2026-11-16
- **Autor:** Equipo de desarrollo (por completar)
- **Revisores:** Pendiente

## Contexto

La API contiene operaciones privadas y una inscripcion publica. Los usuarios
internos tienen roles distintos y las credenciales no deben almacenarse en
texto plano. El backend actual implementa JWT de acceso y renovacion, sesiones
de refresh persistidas y dependencias reutilizables de autorizacion.

## Opciones evaluadas

### Opcion A: JWT de acceso con sesiones de refresh revocables

- **Ventajas:** el token de acceso es verificable por la API y las sesiones de
  renovacion pueden rotarse o revocarse.
- **Desventajas:** la revocacion y validacion de la sesion requieren consultar
  el almacenamiento; gestionar JWT no elimina la necesidad de proteger claves.

### Opcion B: Sesiones de servidor con cookie

- **Ventajas:** revocacion directa y menor exposicion de credenciales en el
  cliente.
- **Desventajas:** requiere definir almacenamiento, cookies, proteccion CSRF y
  estrategia de escalado de sesiones.

### Opcion C: JWT de larga duracion sin estado de sesion

- **Ventajas:** menor acoplamiento a la base de datos por solicitud.
- **Desventajas:** revocacion dificil antes del vencimiento y mayor impacto si
  un token se filtra.

## Decision propuesta

Proponemos autenticar usuarios internos con JWT firmado con HS256, contrasenas
con bcrypt y factor de costo 12, tokens de acceso de duracion configurable y
tokens de renovacion de duracion configurable, rotados al usarse. El backend
almacena el hash SHA-256 del token de renovacion y permite revocar la familia
de sesiones al cerrar sesion.

La autorizacion se valida en el backend mediante roles y, cuando corresponda,
propiedad del recurso. La interfaz frontend no reemplaza los controles de la
API. La inscripcion publica se mantiene como excepcion; las operaciones
administrativas requieren identidad y permisos explicitamente definidos.

En el repositorio, los valores predeterminados son 8 horas para el token de
acceso y 7 dias para el de renovacion. Estos valores son configurables y deben
revisarse antes de produccion. No se considera implementado el acceso docente
mediante enlace hasta que exista su flujo propio.

## Consecuencias

### Positivas

- Se pueden invalidar sesiones y detectar el reuso de un token rotado.
- Las contrasenas y los tokens de renovacion no se almacenan en texto plano.
- Los permisos se pueden reutilizar entre modulos.

### Negativas y trade-offs

- La validacion de sesiones agrega consultas a la base de datos.
- HS256 requiere proteger y rotar un secreto compartido.
- Las rutas nuevas deben declarar autenticacion y autorizacion; no quedan
  protegidas automaticamente por existir helpers compartidos.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| Secreto JWT debil o expuesto | Usar un secreto aleatorio fuera del repositorio y validar su longitud en produccion |
| Endpoint de negocio sin control de acceso | Revisar cada ruta y probar acceso permitido y denegado por rol y propiedad |
| Token de renovacion expuesto | No registrarlo en logs, almacenarlo como hash y rotarlo en cada uso |

## Pendientes de implementacion y revision

- Aplicar y probar permisos en cada endpoint privado de los modulos.
- Definir el almacenamiento del token en el navegador y las medidas contra
  XSS/CSRF que correspondan.
- Revisar expiraciones, rotacion del secreto y requisitos de segundo factor
  antes de produccion.

Revisar al agregar un mecanismo de identidad externo, cambiar el formato de
token o introducir nuevas categorias de usuarios.
