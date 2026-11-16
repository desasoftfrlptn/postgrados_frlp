# ADR-007: Registro de auditoria de operaciones

- **Estado:** Propuesto; requiere aprobacion del equipo
- **Fecha:** 2026-11-16
- **Autor:** Equipo de desarrollo (por completar)
- **Revisores:** Pendiente

## Contexto

Las operaciones administrativas y los cambios de estado requieren trazabilidad
de actor, accion, recurso y momento. El repositorio incluye un modelo de eventos
de auditoria en PostgreSQL y un servicio que agrega eventos a la sesion
SQLAlchemy del modulo. El servicio no confirma la transaccion y aun debe ser
invocado por cada operacion que requiera auditoria.

## Opciones evaluadas

### Opcion A: Tabla de auditoria transaccional en PostgreSQL

- **Ventajas:** se consulta junto con los datos del sistema y el evento puede
  confirmarse en la misma transaccion que el cambio.
- **Desventajas:** agrega escrituras a la base y depende de los permisos y
  respaldos de esa misma base.

### Opcion B: Logs de aplicacion

- **Ventajas:** simple para diagnostico operacional.
- **Desventajas:** dificil relacionar de forma transaccional los eventos con los
  cambios de negocio; la retencion y consulta requieren otro sistema.

### Opcion C: Servicio externo de auditoria

- **Ventajas:** puede ofrecer retencion y controles independientes.
- **Desventajas:** agrega infraestructura, costo e integracion.

## Decision propuesta

Proponemos registrar en una tabla relacional los eventos de las operaciones
administrativas y de seguridad que deban auditarse. El evento debe agregarse a
la misma sesion y confirmarse en la misma transaccion que el cambio de negocio.
El servicio compartido no debe confirmar por cuenta propia.

Los campos de detalle deben limitarse a una lista permitida y no deben contener
contrasenas, tokens ni documentos o datos personales innecesarios. Los logs
operacionales siguen siendo complementarios y no sustituyen este registro.

## Consecuencias

### Positivas

- El cambio y su evento pueden persistir o revertirse de forma atomica.
- Los eventos tienen un esquema consultable y pueden vincularse a actor y
  recurso.

### Negativas y trade-offs

- Cada modulo debe invocar el servicio en las operaciones pertinentes.
- La tabla reside en la misma base que los datos de negocio y requiere una
  politica propia de acceso y retencion.
- La tabla de aplicacion no ofrece por si sola inmutabilidad frente a un
  administrador de la base.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| Operacion sensible sin evento | Incorporar una prueba que verifique el evento en cada flujo que requiera auditoria |
| Datos sensibles en `detalles` | Usar campos permitidos y revisar los eventos antes de produccion |
| Alteracion o eliminacion de eventos | Restringir permisos de base, respaldar la tabla y definir retencion |

## Pendientes de implementacion

Conectar el servicio a las transiciones de estado y a las operaciones de
documentos y autorizacion que requieran trazabilidad. La existencia del modelo
compartido no implica que todos esos eventos ya se registren.

## Revision

Revisar al definir retencion legal, almacenamiento externo o requisitos de
inmutabilidad.
