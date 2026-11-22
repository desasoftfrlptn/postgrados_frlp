import asyncio
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from dotenv import load_dotenv
from sqlalchemy.engine import Connection


DIRECTORIO_BACKEND = Path(__file__).resolve().parents[1]

load_dotenv(DIRECTORIO_BACKEND / ".env")

from src.compartido.conexion import (
    Base,
    DATABASE_URL,
    engine,
)

from src.usuarios import modelos as _usuarios
from src.carreras import modelos as _carreras

from src.seminarios.infraestructura import (
    orm_modelos as _seminarios,
)
from src.configuracion_publica.infraestructura import (
    orm_modelos as _configuracion,
)
from src.noticias.infraestructura import (
    orm_modelos as _noticias,
)
from src.infraestructura import (
    orm_modelos as _generales,
)
from src.inscripcion.infraestructura import (
    orm_modelos as _legajos,
    documentos_modelos as _documentos,
    cohortes_modelos as _cohortes,
)
from src.conduccion import modelos as _conduccion
from src.tesis import modelos as _tesis
from src.alertas import modelos as _alertas


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    try:
        async with engine.connect() as connection:
            await connection.run_sync(do_run_migrations)

    finally:
        await engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()