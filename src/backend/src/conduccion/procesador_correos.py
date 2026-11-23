"""Procesamiento periódico de notificaciones pendientes."""

import asyncio
import logging

from src.conduccion.tareas import procesar_notificaciones


logger = logging.getLogger(__name__)

INTERVALO_SEGUNDOS = 30


async def procesar_correos_periodicamente(
    detener: asyncio.Event,
) -> None:
    logger.info("Procesador de correos iniciado.")

    while not detener.is_set():
        try:
            resultado = await procesar_notificaciones()

            if resultado["enviados"] or resultado["fallidos"]:
                logger.info(
                    "Notificaciones procesadas: %s",
                    resultado,
                )

        except Exception:
            logger.exception("Error procesando notificaciones")

        try:
            await asyncio.wait_for(
                detener.wait(),
                timeout=INTERVALO_SEGUNDOS,
            )
        except TimeoutError:
            continue

    logger.info("Procesador de correos detenido.")