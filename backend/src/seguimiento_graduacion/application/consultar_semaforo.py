"""Consulta del semáforo persistido, sin cálculo ni actualización de colores."""

from uuid import UUID

from src.seguimiento_graduacion.domain.exceptions import AccesoDenegado, LegajoNoEncontrado
from src.seguimiento_graduacion.domain.repository import TrabajoFinalRepository


class ConsultarSemaforo:
    """Reutiliza la consulta de legajos del repositorio existente."""

    def __init__(self, repository: TrabajoFinalRepository) -> None:
        self._repository = repository

    async def ejecutar(self, legajo_id: UUID, *, usuario_rol: str):
        """Devuelve solo el color guardado y el indicador de asignación manual."""
        if usuario_rol != "coordinador":
            raise AccesoDenegado("Solo el coordinador puede consultar el semáforo")
        legajo = await self._repository.obtener_legajo(legajo_id)
        if legajo is None:
            raise LegajoNoEncontrado("El legajo indicado no existe")
        return {"semaforo": legajo.semaforo, "semaforo_manual": legajo.semaforo_manual}
