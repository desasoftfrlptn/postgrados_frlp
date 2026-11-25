"""Modificación parcial con transacción y registro provisional de eventos."""

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from src.seguimiento_graduacion.domain.exceptions import (
    AccesoDenegado, ActualizacionInvalida, TrabajoFinalNoEncontrado,
)
from src.seguimiento_graduacion.domain.repository import TrabajoFinalRepository

logger = logging.getLogger("seguimiento_graduacion.auditoria")
CAMPOS_EDITABLES = frozenset({"tipo", "titulo", "director", "codirector", "fecha_cpr", "numero_resolucion"})


class ModificarTrabajoFinal:
    """Coordina PATCH sin depender de HTTP ni SQLAlchemy."""

    def __init__(self, repository: TrabajoFinalRepository) -> None:
        self._repository = repository

    async def ejecutar(
        self, trabajo_id: UUID, cambios: dict[str, Any], *, usuario_id: UUID, usuario_rol: str,
    ):
        """Conserva el creador original y registra solo identificadores y nombres de campos.

        El logger es provisional: no sustituye el historial persistente pendiente.
        """
        resultado = "error"
        try:
            if usuario_rol != "cpr":
                resultado = "denegado"
                raise AccesoDenegado("Solo la CPR puede modificar trabajos finales")
            if set(cambios) - CAMPOS_EDITABLES or any(
                valor is None and campo != "codirector" for campo, valor in cambios.items()
            ):
                raise ActualizacionInvalida("Campos no autorizados o valores null no permitidos")
            trabajo = await self._repository.obtener_por_id(trabajo_id)
            if trabajo is None:
                resultado = "no_encontrado"
                raise TrabajoFinalNoEncontrado("El trabajo final indicado no existe")
            if cambios:
                trabajo = await self._repository.actualizar(trabajo, cambios)
                await self._repository.confirmar()
            resultado = "modificado" if cambios else "sin_cambios"
            return trabajo
        except Exception:
            await self._repository.revertir()
            raise
        finally:
            logger.info(
                "Evento provisional de modificación de trabajo final",
                extra={"usuario_id": str(usuario_id), "trabajo_final_id": str(trabajo_id),
                       "operacion": "modificar_trabajo_final", "resultado": resultado,
                       "campos": sorted(set(cambios) & CAMPOS_EDITABLES),
                       "fecha_evento": datetime.now(timezone.utc).isoformat()},
            )
