"""Caso de uso: recordar a los docentes que tienen notas sin cargar (US-B-005).

Lo ejecuta la tarea diaria. Mientras falten 48 hs o menos y queden notas sin cargar,
cada día manda un recordatorio (por eso se "repite cada 24 hs").
"""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from src.carga_academica.domain.recordatorio import requiere_recordatorio

logger = logging.getLogger(__name__)

# La fecha límite se guarda en UTC; en el mail se muestra en hora argentina
HORA_ARGENTINA = ZoneInfo("America/Argentina/Buenos_Aires")


class RecordatorioNotasService:
    def __init__(self, repo, enviar, url_frontend: str):
        self.repo = repo
        self._enviar = enviar
        self._url_frontend = url_frontend.rstrip("/")

    async def enviar_recordatorios(self, ahora: datetime) -> int:
        """Manda el recordatorio a cada docente que lo necesita. Devuelve cuántos mandó."""
        enviados = 0
        for seminario, sin_nota in await self.repo.seminarios_con_notas_pendientes():
            if not requiere_recordatorio(seminario.fecha_limite_notas, ahora):
                continue

            datos = {
                "nombre_docente": seminario.docente,
                "nombre_seminario": seminario.nombre,
                "alumnos_sin_nota": sin_nota,
                "fecha_limite": seminario.fecha_limite_notas.astimezone(HORA_ARGENTINA).strftime("%d/%m/%Y %H:%M"),
                "link_planilla": f"{self._url_frontend}/seminarios/{seminario.id}/planilla",
            }
            try:
                await self._enviar(
                    seminario.email_docente,
                    f"Recordatorio: notas pendientes en {seminario.nombre}",
                    "recordatorio-notas.html",
                    datos,
                )
                enviados += 1
            except Exception:
                logger.exception("No se pudo mandar el recordatorio de %s", seminario.nombre)
        return enviados
    