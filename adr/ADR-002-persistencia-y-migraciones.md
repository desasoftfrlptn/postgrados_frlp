# ADR-002: Persistencia relacional y migraciones

- **Estado:** Propuesto; requiere aprobacion del equipo
- **Fecha:** 2026-11-16
- **Autor:** Equipo de desarrollo (por completar)
- **Revisores:** Pendiente

## Contexto

El sistema administra cohortes, legajos, usuarios, sesiones de autenticacion y
documentos con relaciones y restricciones de unicidad. El esquema debe poder
evolucionar de forma reproducible entre desarrollo, pruebas y despliegues. El
repositorio utiliza PostgreSQL, SQLAlchemy y Alembic; SQLite se usa en algunas
pruebas locales.

## Opciones evaluadas

### Opcion A: PostgreSQL, SQLAlchemy y Alembic

- **Ventajas:** base relacional con transacciones y restricciones; ORM integrado
  al backend; migraciones versionadas en Git.
- **Desventajas:** requiere un servidor PostgreSQL para los entornos
  compartidos; las pruebas con SQLite no cubren todas las diferencias del motor.

### Opcion B: SQLite y creacion de esquema desde el ORM

- **Ventajas:** configuracion local sencilla.
- **Desventajas:** no representa el motor de produccion previsto y no ofrece
  una historia de migraciones adecuada para cambios de esquema compartidos.

### Opcion C: PostgreSQL con cambios manuales de esquema

- **Ventajas:** control directo del SQL.
- **Desventajas:** mayor riesgo de divergencia entre entornos y cambios no
  reproducibles.

## Decision propuesta

Proponemos usar **PostgreSQL como base de datos de la aplicacion**,
**SQLAlchemy 2 como ORM** y **Alembic para todas las migraciones de esquema**.
Los cambios estructurales deben agregarse como migraciones versionadas; no se
debe depender de `create_all` para actualizar bases de datos existentes.

SQLite puede utilizarse en pruebas aisladas cuando la funcionalidad sea
compatible. Las restricciones, consultas y migraciones que dependan de
PostgreSQL deben verificarse tambien con ese motor.

## Consecuencias

### Positivas

- El esquema y su historial quedan reproducibles desde el repositorio.
- Las restricciones de integridad se aplican en la base de datos.
- El motor de produccion coincide con el configurado en Docker Compose.

### Negativas y trade-offs

- El equipo debe revisar las migraciones y su orden antes de integrarlas.
- Las pruebas SQLite no sustituyen las pruebas de integracion con PostgreSQL.
- Una migracion aplicada en un entorno compartido no debe editarse; los cambios
  posteriores requieren una nueva migracion.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| Diferencias entre SQLite y PostgreSQL | Ejecutar pruebas de integracion y migracion contra PostgreSQL |
| Perdida o incompatibilidad de datos durante un cambio | Revisar `upgrade` y `downgrade`, probar con una copia representativa y respaldar antes de produccion |

## Revision

Revisar al cambiar de motor, ORM o herramienta de migraciones, y antes de
establecer el procedimiento de despliegue de produccion.
