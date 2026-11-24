# Reconciliación de la base de desarrollo

Se verificó el 16 de noviembre de 2026 que la base de trabajo es PostgreSQL
en Docker, publicada en `127.0.0.1:5433`. La instancia del puerto 5432 tiene
un esquema antiguo y no es la base elegida para este proyecto.

El archivo local `src/backend/.env` se alineó con las credenciales del backend
Docker. No debe versionarse ni copiarse a esta documentación.

## Situación encontrada

La base Docker tenía tablas creadas fuera de Alembic, incluidas las de conducción,
pero no tenía `alembic_version`. La tabla `legajos` estaba vacía y le faltaban
cuatro columnas, dos restricciones únicas y la tabla del contador anual.

Las revisiones históricas no forman un arranque reproducible desde una base
vacía: el baseline no crea tablas y algunas revisiones esperan versiones
incompatibles de `legajos`. No se cambiaron esas revisiones ni se ejecutaron
sobre los datos existentes.

## Procedimiento realizado

1. Diagnóstico de solo lectura con `python diagnosticar_base.py`.
2. Prueba transaccional con `python reconciliar_base_docker.py`; se revirtieron
   todos los cambios al terminar.
3. Respaldo PostgreSQL en formato personalizado con `pg_dump -Fc`.
4. Aplicación con `python reconciliar_base_docker.py --aplicar`.
5. Verificación con `python -m alembic current`: `b7120ad84e31 (head)`.

La reconciliación agrega `forma_conocio_ofertas`, `motivos_cursar`,
`solicitud_beca` y `numero_seguimiento`; crea las restricciones únicas de
cohorte/DNI y seguimiento, y crea `contadores_inscripcion`.

Antes de registrar la revisión, compara las tablas administradas con el metadata
de SQLAlchemy mediante Alembic, incluyendo tipos, nulabilidad, índices y
restricciones. Preserva tablas adicionales. La comparación no certifica datos
de negocio ni todos los defaults del servidor.

La revisión registrada representa la adopción del esquema existente verificado,
no la ejecución secuencial de todas las revisiones históricas.

## Límites y próximos cambios

- El script rechaza bases sin las tablas esperadas, historiales distintos y
  legajos con registros antes de la adopción. No es una migración genérica.
- Las futuras modificaciones deben tener nuevas revisiones de Alembic.
- Queda pendiente preparar y probar un baseline reproducible para instalaciones
  desde cero. No usar el historial antiguo como procedimiento de restauración
  ni ejecutar sus downgrades sobre esta base adoptada.
- Para restaurar esta intervención se dispone del respaldo previo, conservado
  en la carpeta temporal del usuario. Restaurarlo requiere evaluar primero los
  datos incorporados después de la intervención.

El modelo ahora declara el contador y la restricción de DNI por cohorte para
evitar que una creación mediante metadata omita esos elementos.
