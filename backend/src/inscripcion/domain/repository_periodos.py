from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.inscripcion.infrastructure.orm_models import Cohorte, PeriodoInscripcion


class PeriodoRepository:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def obtener_cohorte(self, cohorte_id: UUID) -> Cohorte | None:
        return await self._db.get(Cohorte, cohorte_id)

    async def listar_por_cohorte(self, cohorte_id: UUID) -> list[PeriodoInscripcion]:
        result = await self._db.scalars(
            select(PeriodoInscripcion)
            .where(PeriodoInscripcion.cohorte_id == cohorte_id)
            .order_by(PeriodoInscripcion.fecha_abre, PeriodoInscripcion.created_at)
        )
        return list(result.all())

    async def crear(self, periodo: PeriodoInscripcion) -> PeriodoInscripcion:
        self._db.add(periodo)
        await self._db.commit()
        await self._db.refresh(periodo)
        return periodo

    async def obtener(self, periodo_id: UUID) -> PeriodoInscripcion | None:
        return await self._db.get(PeriodoInscripcion, periodo_id)

    async def guardar(self, periodo: PeriodoInscripcion) -> PeriodoInscripcion:
        await self._db.commit()
        await self._db.refresh(periodo)
        return periodo

    async def obtener_vigente(self, hoy: date):
        """Devuelve el período en fecha cuya cohorte tiene la inscripción habilitada."""
        result = await self._db.execute(
            select(PeriodoInscripcion, Cohorte.id)
            .join(Cohorte, Cohorte.id == PeriodoInscripcion.cohorte_id)
            .where(
                Cohorte.inscripcion_abierta.is_(True),
                PeriodoInscripcion.fecha_abre <= hoy,
                (PeriodoInscripcion.fecha_cierra.is_(None) | (PeriodoInscripcion.fecha_cierra >= hoy)),
            )
            .order_by(PeriodoInscripcion.fecha_abre.desc(), PeriodoInscripcion.created_at.desc())
            .limit(1)
        )
        return result.first()
