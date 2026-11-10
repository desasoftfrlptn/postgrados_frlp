"""Composition root: conecta implementaciones concretas mediante Depends."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.inscripcion.application.service import LegajoService
from src.inscripcion.infrastructure.pg_repository import PostgresLegajoRepository
from src.shared.database.session import get_db
from src.inscripcion.domain.repository_periodos import PeriodoRepository
from src.inscripcion.application.service_periodos import PeriodoService


async def get_periodo_service(db: AsyncSession = Depends(get_db)) -> PeriodoService:
    return PeriodoService(PeriodoRepository(db))


async def get_legajo_service(
    db: AsyncSession = Depends(get_db),
) -> LegajoService:
    repository = PostgresLegajoRepository(db)
    return LegajoService(repository)
