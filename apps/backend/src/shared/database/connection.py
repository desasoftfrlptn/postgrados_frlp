from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os

# Configuración de base de datos
# En producción: DATABASE_URL=postgresql+asyncpg://usuario:password@host:puerto/db
# Desarrollo: PostgreSQL en Docker (postgrado-postgres:5432)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/posgrado",
)

engine = create_async_engine(DATABASE_URL, echo=False, future=True)

# Session maker
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Base para modelos SQLAlchemy
Base = declarative_base()


async def get_db() -> AsyncSession:
    """Dependency que provee una sesión de base de datos."""
    async with AsyncSessionLocal() as session:
        yield session


async def crear_todas_las_tablas():
    """Crear todas las tablas definidas en los modelos Base."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def borrar_todas_las_tablas():
    """Eliminar todas las tablas (útil para testing)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
