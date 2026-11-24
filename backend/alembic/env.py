import asyncio
from logging.config import fileConfig

from sqlalchemy import pool, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Nuestra conexión y TODAS las tablas: cada orm_models se importa para que Alembic las vea
import src.carga_academica.infrastructure.orm_models  # noqa: F401
import src.gestion_documental.infrastructure.orm_models  # noqa: F401
import src.inscripcion.infrastructure.orm_models  # noqa: F401
import src.seguimiento_graduacion.infrastructure.orm_models  # noqa: F401
import src.acceso.models
import src.shared.auth.orm_models
from src.shared.database.connection import DATABASE_URL, DB_SCHEMA, Base

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# La URL sale del .env (la misma que usa el backend), no del alembic.ini
config.set_main_option("sqlalchemy.url", DATABASE_URL.replace("%", "%%"))

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from mysrc import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    # Alembic no crea el esquema solo: lo creamos antes de las tablas
    connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {DB_SCHEMA}"))
    connection.commit()
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_schemas=True,  # compara también los esquemas que no son public
        include_name=lambda name, type_, parents: type_ != "schema" or name in (DB_SCHEMA, None), # fix para que no detecte tablas existentes como nuevas
        version_table_schema=DB_SCHEMA,  # alembic_version también va en postgrados
    )
    with context.begin_transaction():
        connection.execute(
            text("SELECT set_config('search_path', quote_ident(:schema) || ', public', true)"),
            {"schema": DB_SCHEMA},
        )
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
