"""Adopta el esquema Docker existente. Por defecto prueba y revierte todo.

Uso: python reconciliar_base_docker.py [--aplicar]
No sirve para una base vacía ni para el esquema local antiguo.
"""

import argparse
import asyncio
from pathlib import Path

from dotenv import load_dotenv
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine
load_dotenv(Path(__file__).resolve().parent / ".env")
from src.compartido.conexion import Base, DATABASE_URL
from src.usuarios import modelos as _usuarios
from src.carreras import modelos as _carreras
from src.seminarios.infraestructura import orm_modelos as _seminarios
from src.configuracion_publica.infraestructura import orm_modelos as _configuracion
from src.noticias.infraestructura import orm_modelos as _noticias
from src.infraestructura import orm_modelos as _generales
from src.inscripcion.infraestructura import (
    orm_modelos as _legajos,
    cohortes_modelos as _cohortes,
    documentos_modelos as _documentos,
)
from src.conduccion import modelos as _conduccion

REVISION = "b7120ad84e31"


def verificar_modelos(connection):
    # Una base previa puede contener tablas ajenas al metadata (historial_accesos).
    # Se preservan; solo se comparan las tablas administradas por estos modelos.
    context = MigrationContext.configure(connection, opts={
        "compare_type": True,
        "include_object": lambda obj, name, kind, reflected, compare_to:
            not (kind == "table" and reflected and compare_to is None),
    })
    differences = compare_metadata(context, Base.metadata)
    if differences:
        raise RuntimeError(f"El esquema no coincide con los modelos: {differences!r}")


def reconciliar(connection):
    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    expected = set(Base.metadata.tables) - {"contadores_inscripcion"}
    if not expected.issubset(tables):
        raise RuntimeError(f"Base inesperada. Faltan tablas: {sorted(expected - tables)}")
    if "alembic_version" in tables:
        revisions = connection.execute(text("SELECT version_num FROM alembic_version")).scalars().all()
        if revisions == [REVISION]:
            verificar_modelos(connection)
            print("La base ya está reconciliada y verificada.")
            return
        if revisions:
            raise RuntimeError(f"La base tiene historial previo: {revisions}. No se modificó.")

    # Bloquear inscripciones durante la comprobación y los cambios de estructura.
    connection.execute(text("LOCK TABLE legajos IN ACCESS EXCLUSIVE MODE"))
    if connection.execute(text("SELECT COUNT(*) FROM legajos")).scalar_one() != 0:
        raise RuntimeError("Esta reconciliación exige legajos vacíos; no modifica datos existentes.")
    columns = {c["name"] for c in inspector.get_columns("legajos")}
    if not {"dni_pasaporte", "correo_electronico", "cohorte_id"}.issubset(columns):
        raise RuntimeError("Esquema antiguo no compatible con esta reconciliación.")

    additions = {
        "forma_conocio_ofertas": "VARCHAR(100) NOT NULL DEFAULT 'Sin especificar'",
        "motivos_cursar": "TEXT NOT NULL DEFAULT 'Sin especificar'",
        "solicitud_beca": "INTEGER",
        "numero_seguimiento": "VARCHAR(30) NOT NULL",
    }
    for name, definition in additions.items():
        if name not in columns:
            connection.execute(text(f"ALTER TABLE legajos ADD COLUMN {name} {definition}"))
            print(f"Agregada columna legajos.{name}")

    unique_columns = {tuple(c["column_names"]) for c in inspector.get_unique_constraints("legajos")}
    for name, fields in (
        ("uq_legajos_cohorte_dni", ("cohorte_id", "dni_pasaporte")),
        ("uq_legajos_numero_seguimiento", ("numero_seguimiento",)),
    ):
        if fields not in unique_columns:
            connection.execute(text(
                f"ALTER TABLE legajos ADD CONSTRAINT {name} UNIQUE ({', '.join(fields)})"
            ))
            print(f"Agregada restricción {name}")

    Base.metadata.tables["contadores_inscripcion"].create(connection, checkfirst=True)
    verificar_modelos(connection)

    # Registrar la adopción solo después de verificar el esquema equivalente.
    connection.execute(text(
        "CREATE TABLE IF NOT EXISTS alembic_version "
        "(version_num VARCHAR(32) PRIMARY KEY)"
    ))
    connection.execute(text("INSERT INTO alembic_version (version_num) VALUES (:revision)"),
                       {"revision": REVISION})
    print(f"Esquema verificado. Revisión adoptada: {REVISION}")


async def main(apply):
    engine = create_async_engine(DATABASE_URL, echo=False)
    try:
        async with engine.connect() as connection:
            transaction = await connection.begin()
            try:
                await connection.execute(text("SET LOCAL lock_timeout = '5s'"))
                await connection.execute(text("SET LOCAL statement_timeout = '30s'"))
                await connection.run_sync(reconciliar)
                if apply:
                    await transaction.commit()
                    print("Cambios confirmados.")
                else:
                    await transaction.rollback()
                    print("Prueba correcta. Todos los cambios fueron revertidos.")
            except BaseException:
                await transaction.rollback()
                raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--aplicar", action="store_true")
    asyncio.run(main(parser.parse_args().aplicar))
