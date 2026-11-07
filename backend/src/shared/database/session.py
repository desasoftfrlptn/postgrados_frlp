"""Dependency de FastAPI que da una sesión de base de datos por request."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.shared.database.connection import SessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Abre una sesión al empezar el request y la cierra al terminar.

    Uso en un router:  db: AsyncSession = Depends(get_db)
    """
    async with SessionLocal() as session:
        yield session
