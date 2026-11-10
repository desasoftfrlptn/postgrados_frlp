"""Consultas para el vencimiento automático de reservas (US-CORE-010).

Archivo propio (no toca pg_repository.py): solo lo usa la tarea diaria.
"""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.inscripcion.infrastructure.orm_models import AuditoriaLegajo, Legajo
from src.shared.auth.orm_models import Usuario


class VencimientoRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def legajos_completados(self) -> list[tuple[Legajo, datetime]]:
        """Los legajos que siguen en COMPLETADO, con la fecha en que pasaron a ese estado.

        La fecha sale de la auditoría: el último registro con estado_nuevo = COMPLETADO.
        Un legajo en COMPLETADO sin ese registro (cargado a mano) no aparece.
        """
        # Subconsulta: por cada legajo, cuándo fue la última vez que pasó a COMPLETADO
        cuando_se_completo = (
            select(
                AuditoriaLegajo.legajo_id,
                func.max(AuditoriaLegajo.created_at).label("fecha_completado"),
            )
            .where(AuditoriaLegajo.estado_nuevo == "COMPLETADO")
            .group_by(AuditoriaLegajo.legajo_id)
            .subquery()
        )
        consulta = (
            select(Legajo, cuando_se_completo.c.fecha_completado)
            .join(cuando_se_completo, cuando_se_completo.c.legajo_id == Legajo.id)
            .where(Legajo.estado == "COMPLETADO")
        )
        filas = await self.db.execute(consulta)
        return [(legajo, fecha) for legajo, fecha in filas]

    async def vencer(self, legajo: Legajo) -> None:
        """Pasa el legajo a VENCIDO y deja la auditoría (usuario_email = None: lo hizo el sistema)."""
        legajo.estado = "VENCIDO"
        self.db.add(AuditoriaLegajo(
            legajo_id=legajo.id,
            estado_anterior="COMPLETADO",
            estado_nuevo="VENCIDO",
            comentario="Vencimiento automático: 30 días sin pasar a ACTIVO",
            usuario_email=None,
        ))
        await self.db.commit()

    async def coordinadores(self) -> list[tuple[str, str]]:
        """(nombre, email) de los coordinadores activos: a ellos va el aviso."""
        consulta = select(Usuario.nombre, Usuario.email).where(
            Usuario.rol == "coordinador",
            Usuario.activo.is_(True),
        )
        filas = await self.db.execute(consulta)
        return [(nombre, email) for nombre, email in filas]