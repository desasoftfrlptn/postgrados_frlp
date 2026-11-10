"""Composition root: conecta implementaciones concretas mediante Depends."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.inscripcion.application.notificaciones import NotificadorLegajo
from src.inscripcion.application.service import LegajoService
from src.inscripcion.infrastructure.pg_repository import PostgresLegajoRepository
from src.shared.database.session import get_db
from src.shared.email.cliente import enviar_email


async def get_legajo_service(
    db: AsyncSession = Depends(get_db),
) -> LegajoService:
    repository = PostgresLegajoRepository(db)
    # US-CORE-006: el notificador usa el cliente de mail real
    notificador = NotificadorLegajo(enviar_email)
    return LegajoService(repository, notificador=notificador)