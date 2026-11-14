from datetime import date
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.inscripcion.infraestructura.cohortes_modelos import (
    CohorteORM,
)


class CohorteRepositorioPostgres:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def listar_cohortes(self) -> list[CohorteORM]:
        consulta = (
            select(CohorteORM)
            .order_by(
                CohorteORM.anio.desc(),
                CohorteORM.nombre,
            )
        )

        resultado = await self.session.execute(consulta)

        return list(resultado.scalars().all())

    async def obtener_por_id(
        self,
        cohorte_id: UUID,
    ) -> CohorteORM | None:
        consulta = select(CohorteORM).where(
            CohorteORM.id == cohorte_id
        )

        resultado = await self.session.execute(consulta)

        return resultado.scalars().first()

    async def crear_cohorte(
        self,
        anio: int,
        nombre: str,
        fecha_inicio: date | None,
    ) -> CohorteORM:
        cohorte = CohorteORM(
            anio=anio,
            nombre=nombre,
            fecha_inicio=fecha_inicio,
            abierta=False,
        )

        self.session.add(cohorte)

        await self.session.commit()
        await self.session.refresh(cohorte)

        return cohorte

    async def modificar_inscripcion(
        self,
        cohorte_id: UUID,
        abierta: bool,
    ) -> CohorteORM | None:
        consulta = (
            update(CohorteORM)
            .where(CohorteORM.id == cohorte_id)
            .values(abierta=abierta)
            .returning(CohorteORM.id)
        )

        resultado = await self.session.execute(consulta)
        identificador = resultado.scalar_one_or_none()

        if identificador is None:
            await self.session.rollback()
            return None

        await self.session.commit()

        return await self.obtener_por_id(identificador)
