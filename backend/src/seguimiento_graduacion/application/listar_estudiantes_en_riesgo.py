"""Listado del riesgo almacenado, sin cálculo ni modificación del semáforo."""

from uuid import UUID

from src.seguimiento_graduacion.domain.exceptions import AccesoDenegado
from src.seguimiento_graduacion.domain.repository import TrabajoFinalRepository


class ListarEstudiantesEnRiesgo:
    """Coordina filtros y paginación usando el repositorio existente."""

    def __init__(self, repository: TrabajoFinalRepository) -> None:
        self._repository = repository

    async def ejecutar(
        self, *, usuario_rol: str, page: int = 1, limit: int = 20,
        cohorte_id: UUID | None = None, tipo_carrera: str | None = None,
    ):
        """Devuelve una página de legajos rojos y su total con los mismos filtros."""
        if usuario_rol != "coordinador":
            raise AccesoDenegado("Solo el coordinador puede listar estudiantes en riesgo")
        if page < 1 or not 1 <= limit <= 100:
            raise ValueError("La página debe ser positiva y el límite debe estar entre 1 y 100")
        legajos, total = await self._repository.listar_en_riesgo(
            offset=(page - 1) * limit, limit=limit,
            cohorte_id=cohorte_id, tipo_carrera=tipo_carrera,
        )
        return {"data": legajos, "page": page, "limit": limit,
                "total": total, "pages": (total + limit - 1) // limit}
