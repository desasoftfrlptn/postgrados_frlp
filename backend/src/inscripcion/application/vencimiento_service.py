"""Caso de uso: vencer las reservas de vacante (US-CORE-010).

Lo ejecuta la tarea diaria (APScheduler), no un endpoint: no hay usuario logueado,
el cambio lo hace el SISTEMA.
"""

import logging
from datetime import datetime

from src.inscripcion.domain.estados import transicion_permitida
from src.inscripcion.domain.vencimiento import debe_vencer, fecha_de_vencimiento

logger = logging.getLogger(__name__)


class VencimientoService:
    def __init__(self, repo, enviar):
        # repo: VencimientoRepository (en los tests, uno falso)
        # enviar: enviar_email (en los tests, una función falsa)
        self.repo = repo
        self._enviar = enviar

    async def vencer_reservas(self, ahora: datetime) -> int:
        """Pasa a VENCIDO los legajos con 30 días o más en COMPLETADO y avisa a los coordinadores.

        Devuelve cuántos venció (sirve para el log de la tarea diaria).
        """
        candidatos = await self.repo.legajos_completados()
        a_vencer = [(legajo, fecha) for legajo, fecha in candidatos if debe_vencer(fecha, ahora)]
        if not a_vencer:
            return 0

        coordinadores = await self.repo.coordinadores()
        vencidos = 0

        for legajo, fecha_completado in a_vencer:
            # La misma tabla de transiciones que usa el coordinador: SISTEMA puede COMPLETADO -> VENCIDO
            if not transicion_permitida("SISTEMA", legajo.estado, "VENCIDO"):
                continue

            await self.repo.vencer(legajo)
            vencidos += 1

            datos = {
                "nombre_aspirante": f"{legajo.nombre} {legajo.apellido}",
                "carrera": legajo.carrera_elegida,
                "numero_legajo": legajo.numero_legajo,
                "fecha_completado": fecha_completado.strftime("%d/%m/%Y"),
                "fecha_vencimiento": fecha_de_vencimiento(fecha_completado).strftime("%d/%m/%Y"),
            }
            for nombre, email in coordinadores:
                try:
                    await self._enviar(
                        email,
                        f"Reserva vencida: legajo {legajo.numero_legajo}",
                        "vencido.html",
                        {**datos, "nombre_coordinador": nombre},
                    )
                except Exception:
                    # Un mail que falla no frena el resto: el legajo ya quedó VENCIDO
                    logger.exception("No se pudo avisar a %s del vencimiento del legajo %s", email, legajo.id)

        return vencidos