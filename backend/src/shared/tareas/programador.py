"""Tareas programadas: corren solas, todos los días, sin que nadie llame a un endpoint.

- US-CORE-010: vencer reservas de vacante (03:00).
- US-B-005: recordatorio de carga de notas (se suma después).
"""

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from src.inscripcion.application.vencimiento_service import VencimientoService
from src.inscripcion.infrastructure.vencimiento_repository import VencimientoRepository
from src.shared.database.connection import SessionLocal
from src.shared.email.cliente import enviar_email

logger = logging.getLogger(__name__)

ZONA_HORARIA = "America/Argentina/Buenos_Aires"


async def tarea_vencer_reservas() -> None:
    """US-CORE-010: arma el service con una sesión propia y lo ejecuta."""
    # No hay request: la sesión de la base se abre acá y se cierra al terminar el bloque
    async with SessionLocal() as db:
        service = VencimientoService(VencimientoRepository(db), enviar_email)
        vencidos = await service.vencer_reservas(datetime.now(timezone.utc))
    logger.info("Vencimiento de reservas: %s legajo(s) vencido(s)", vencidos)


def crear_programador() -> AsyncIOScheduler:
    """El programador con todas las tareas diarias. main.py lo arranca y lo apaga."""
    programador = AsyncIOScheduler(timezone=ZONA_HORARIA)
    programador.add_job(
        tarea_vencer_reservas,
        CronTrigger(hour=3, minute=0, timezone=ZONA_HORARIA),  # todos los días a las 03:00
        id="vencer_reservas",
        replace_existing=True,
    )
    return programador