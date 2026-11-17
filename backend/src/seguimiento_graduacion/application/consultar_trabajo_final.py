"""Consulta de trabajo final independiente de HTTP y de la base de datos."""

from uuid import UUID

from src.seguimiento_graduacion.domain.exceptions import (
    AccesoDenegado, LegajoNoEncontrado, TrabajoFinalNoEncontrado,
)
from src.seguimiento_graduacion.domain.repository import TrabajoFinalRepository


class ConsultarTrabajoFinal:
    """Permite consultar a CPR y coordinación, sin modificar datos."""

    def __init__(self, repository: TrabajoFinalRepository) -> None:
        self._repository = repository

    async def ejecutar(self, legajo_id: UUID, *, usuario_rol: str):
        """Distingue la ausencia del legajo de la ausencia del trabajo final."""
        if usuario_rol not in ("cpr", "coordinador"):
            raise AccesoDenegado("Solo la CPR y el coordinador pueden consultar trabajos finales")
        if await self._repository.obtener_legajo(legajo_id) is None:
            raise LegajoNoEncontrado("El legajo indicado no existe")
        trabajo = await self._repository.obtener_por_legajo(legajo_id)
        if trabajo is None:
            raise TrabajoFinalNoEncontrado("El legajo no tiene un trabajo final registrado")
        return trabajo
