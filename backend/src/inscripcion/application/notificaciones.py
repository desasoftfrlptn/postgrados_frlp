"""Mails al aspirante cuando cambia el estado de su legajo (US-CORE-006).

- armar_mail: decide QUÉ mail corresponde (pura, se testea sin mandar nada).
- NotificadorLegajo: lo manda. Se inyecta en LegajoService desde dependencies.py,
  así el service no depende del cliente de mail.
"""

import logging
from collections.abc import Awaitable, Callable
from datetime import date

logger = logging.getLogger(__name__)

# Estado nuevo -> (plantilla, asunto). Los demás estados no mandan mail.
MAILS_POR_ESTADO = {
    "PENDIENTE": ("pendiente.html", "Recibimos tu inscripción"),
    "OBSERVADO": ("observacion.html", "Tu legajo tiene observaciones"),
    "COMPLETADO": ("aprobacion.html", "¡Tu inscripción fue aprobada!"),
}


def armar_mail(legajo, estado_nuevo: str, comentario: str | None, hoy: date) -> dict | None:
    """Arma el mail para ese cambio de estado, o None si ese estado no notifica.

    Recibe `hoy` por parámetro (y no llama a date.today() adentro) para que sea
    pura: con los mismos datos devuelve siempre lo mismo, y se testea fácil.
    """
    if estado_nuevo not in MAILS_POR_ESTADO:
        return None

    plantilla, asunto = MAILS_POR_ESTADO[estado_nuevo]
    datos = {
        "nombre_aspirante": f"{legajo.nombre} {legajo.apellido}",
        "carrera": legajo.carrera_elegida,
        "fecha_envio": hoy.strftime("%d/%m/%Y"),
    }
    if estado_nuevo == "OBSERVADO":
        datos["detalle_observacion"] = comentario or ""
    if estado_nuevo == "COMPLETADO":
        datos["numero_legajo"] = legajo.numero_legajo

    return {
        "destinatario": legajo.email,
        "asunto": asunto,
        "plantilla": plantilla,
        "datos": datos,
    }


# La forma de la función que manda mails: enviar_email(destinatario, asunto, plantilla, datos)
EnviarEmail = Callable[[str, str, str, dict], Awaitable[None]]


class NotificadorLegajo:
    def __init__(self, enviar: EnviarEmail):
        # En producción recibe enviar_email; en los tests, una función falsa.
        self._enviar = enviar

    async def cambio_de_estado(self, legajo, estado_nuevo: str, comentario: str | None = None) -> None:
        mail = armar_mail(legajo, estado_nuevo, comentario, date.today())
        if mail is None:
            return
        try:
            await self._enviar(mail["destinatario"], mail["asunto"], mail["plantilla"], mail["datos"])
        except Exception:
            # Si el mail falla, el cambio de estado YA quedó guardado y no se deshace:
            # que el servidor de correo esté caído no puede frenar la aprobación de un legajo.
            logger.exception("No se pudo enviar el mail de %s al legajo %s", estado_nuevo, legajo.id)