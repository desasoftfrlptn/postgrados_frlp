"""Conexión a PostgreSQL con SQLAlchemy 2.0 async (ARQUITECTURA.md §6.1)."""

import os

from dotenv import load_dotenv
from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

load_dotenv()  # busca el .env subiendo de carpeta: encuentra el de la raíz del repo

# El .env usa postgresql:// porque lo comparte con docker compose.
# SQLAlchemy async necesita el driver explícito: postgresql+asyncpg://
DATABASE_URL = os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+asyncpg://", 1)
DB_SCHEMA = os.getenv("DB_SCHEMA", "fenix_postgrado")  # esquema de todas las tablas

engine = create_async_engine(DATABASE_URL)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    """Todas las tablas heredan de acá. Alembic la usa para saber qué tablas hay."""

    metadata = MetaData(schema=DB_SCHEMA)
