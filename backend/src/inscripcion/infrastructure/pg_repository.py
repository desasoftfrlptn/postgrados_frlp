from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.inscripcion.domain.entities import Cohorte
from src.inscripcion.domain.repo import CohorteRepository
from src.inscripcion.infrastructure.orm_models import Cohorte as CohorteModel

class PostgresCohorteRepository(CohorteRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_domain(self, model: CohorteModel) -> Cohorte:
        return Cohorte(
            id=model.id,
            anio=model.anio,
            nombre=model.nombre,
            abierta=model.inscripcion_abierta,
            fecha_inicio=model.fecha_inicio
        )

    async def get_all(self) -> List[Cohorte]:
        result = await self.session.execute(select(CohorteModel))
        models = result.scalars().all()
        return [self._to_domain(m) for m in models]

    async def get_by_id(self, cohorte_id: UUID) -> Optional[Cohorte]:
        result = await self.session.execute(
            select(CohorteModel).where(CohorteModel.id == cohorte_id)
        )
        model = result.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def create(self, cohorte: Cohorte) -> Cohorte:
        db_model = CohorteModel(
            anio=cohorte.anio,
            nombre=cohorte.nombre,
            inscripcion_abierta=cohorte.abierta,
            fecha_inicio=cohorte.fecha_inicio
        )
        self.session.add(db_model)
        await self.session.commit()
        await self.session.refresh(db_model)
        return self._to_domain(db_model)

    async def update(self, cohorte: Cohorte) -> Cohorte:
        result = await self.session.execute(
            select(CohorteModel).where(CohorteModel.id == cohorte.id)
        )
        db_model = result.scalar_one_or_none()
        if db_model:
            db_model.anio = cohorte.anio
            db_model.nombre = cohorte.nombre
            db_model.inscripcion_abierta = cohorte.abierta
            db_model.fecha_inicio = cohorte.fecha_inicio
            await self.session.commit()
            await self.session.refresh(db_model)
            return self._to_domain(db_model)
        raise ValueError("Cohorte no encontrada")