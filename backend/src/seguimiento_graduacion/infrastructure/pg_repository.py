"""Persistencia de trabajos finales mediante SQLAlchemy asíncrono (US-C-001)."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.inscripcion.infrastructure.orm_models import Legajo
from src.seguimiento_graduacion.infrastructure.orm_models import TrabajoFinal


class TrabajoFinalRepository:
    """Reutiliza la sesión recibida; quien la entrega controla la transacción.

    No abre conexiones propias ni confirma o revierte transacciones.
    Los errores de persistencia se propagan al llamador.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def obtener_legajo(self, legajo_id: UUID) -> Legajo | None:
        """Busca un legajo por su clave primaria; devuelve None si no existe."""
        return await self.session.get(Legajo, legajo_id)

    async def obtener_por_legajo(self, legajo_id: UUID) -> TrabajoFinal | None:
        """Consulta el trabajo final asociado al legajo, si está registrado."""
        consulta = select(TrabajoFinal).where(TrabajoFinal.legajo_id == legajo_id)
        resultado = await self.session.execute(consulta)
        return resultado.scalar_one_or_none()

    async def existe_para_legajo(self, legajo_id: UUID) -> bool:
        """Indica si hay un trabajo final; no sustituye la restricción UNIQUE."""
        return await self.obtener_por_legajo(legajo_id) is not None

    async def guardar(self, trabajo_final: TrabajoFinal) -> TrabajoFinal:
        """Envía los cambios a la base dentro de la transacción pendiente.

        flush permite obtener los valores generados por PostgreSQL, como el id.
        Si falla, el llamador debe revertir la transacción con rollback.
        """
        self.session.add(trabajo_final)
        await self.session.flush()
        return trabajo_final
