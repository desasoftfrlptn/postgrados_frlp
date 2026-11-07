"""Composition root: conecta implementaciones concretas mediante Depends."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.inscripcion.application.service import LegajoService
from app.inscripcion.infrastructure.pg_repository import PostgresLegajoRepository
from app.shared.database.session import get_db


async def get_legajo_service(
    db: AsyncSession = Depends(get_db),
) -> LegajoService:
    repository = PostgresLegajoRepository(db)
    return LegajoService(repository)
