"""Tareas programadas: corren solas, todos los días, sin que nadie llame a un endpoint.

- US-CORE-010: vencer reservas de vacante (03:00).
- US-B-005: recordatorio de carga de notas a los docentes (09:00).
"""

import logging
import os
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from src.carga_academica.application.recordatorio_service import RecordatorioNotasService
from src.carga_academica.infrastructure.recordatorio_repository import RecordatorioRepository
from src.inscripcion.application.vencimiento_service import VencimientoService
from src.inscripcion.infrastructure.vencimiento_repository import VencimientoRepository
from src.shared.database.connection import SessionLocal
from src.shared.email.cliente import enviar_email

logger = logging.getLogger(__name__)

ZONA_HORARIA = "America/Argentina/Buenos_Aires"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


async def tarea_vencer_reservas() -> None:
    """US-CORE-010: arma el service con una sesión propia y lo ejecuta."""
    # No hay request: la sesión de la base se abre acá y se cierra al terminar el bloque
    async with SessionLocal() as db:
        service = VencimientoService(VencimientoRepository(db), enviar_email)
        vencidos = await service.vencer_reservas(datetime.now(timezone.utc))
    logger.info("Vencimiento de reservas: %s legajo(s) vencido(s)", vencidos)


async def tarea_recordar_notas() -> None:
    """US-B-005: recuerda a los docentes con notas sin cargar y fecha límite en 48 hs o menos."""
    async with SessionLocal() as db:
        service = RecordatorioNotasService(RecordatorioRepository(db), enviar_email, FRONTEND_URL)
        enviados = await service.enviar_recordatorios(datetime.now(timezone.utc))
    logger.info("Recordatorio de notas: %s mail(s) enviado(s)", enviados)


def crear_programador() -> AsyncIOScheduler:
    """El programador con todas las tareas diarias. main.py lo arranca y lo apaga."""
    programador = AsyncIOScheduler(timezone=ZONA_HORARIA)
    programador.add_job(
        tarea_vencer_reservas,
        CronTrigger(hour=3, minute=0, timezone=ZONA_HORARIA),  # 03:00: nadie usa el sistema
        id="vencer_reservas",
        replace_existing=True,
    )
    programador.add_job(
        tarea_recordar_notas,
        CronTrigger(hour=9, minute=0, timezone=ZONA_HORARIA),  # 09:00: horario de trabajo del docente
        id="recordar_notas",
        replace_existing=True,
    )
    return programador
