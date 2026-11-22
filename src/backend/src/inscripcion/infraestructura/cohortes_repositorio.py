
from datetime import date
from uuid import UUID

from sqlalchemy import select
from fastapi import HTTPException
from src.inscripcion.infraestructura.orm_modelos import LegajoORM
from src.conduccion.modelos import NumeracionCohorteORM
from sqlalchemy.ext.asyncio import AsyncSession

from src.carreras.modelos import CarreraORM
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

    async def obtener_carrera_activa(
        self,
        carrera_id: UUID,
    ) -> CarreraORM | None:
        consulta = select(CarreraORM).where(
            CarreraORM.id == carrera_id,
            CarreraORM.activo.is_(True),
        )

        resultado = await self.session.execute(consulta)

        return resultado.scalars().first()

    async def crear_cohorte(
        self,
        anio: int,
        nombre: str,
        carrera_id: UUID,
        fecha_inicio: date | None,
    ) -> CohorteORM:
        cohorte = CohorteORM(
            anio=anio,
            nombre=nombre,
            carrera_id=carrera_id,
            fecha_inicio=fecha_inicio,
            abierta=False,
        )

        self.session.add(cohorte)

        await self.session.commit()
        await self.session.refresh(cohorte)

        return cohorte

    async def bloquear_cohorte(self, cohorte_id):
        return await self.session.scalar(
            select(CohorteORM).where(CohorteORM.id == cohorte_id)
            .with_for_update().execution_options(populate_existing=True)
        )

    async def editar_cohorte(self, cohorte_id, datos):
        cohorte = await self.bloquear_cohorte(cohorte_id)
        if cohorte is None:
            raise HTTPException(404, "No se encontró la cohorte.")
        anterior = datos.anterior.model_dump()
        if any(getattr(cohorte, campo) != valor for campo, valor in anterior.items()):
            raise HTTPException(409, "La cohorte cambió. Volvé al listado y consultá los datos actualizados.")
        nombre = datos.nombre.strip()
        if not nombre:
            raise HTTPException(422, "El nombre de la cohorte es obligatorio.")
        cambia_identidad = cohorte.carrera_id != datos.carrera_id or cohorte.anio != datos.anio
        if cambia_identidad:
            legajo = await self.session.scalar(select(LegajoORM.id).where(LegajoORM.cohorte_id == cohorte_id).limit(1))
            numeracion = await self.session.scalar(select(NumeracionCohorteORM.id).where(NumeracionCohorteORM.cohorte_id == cohorte_id).limit(1))
            if legajo is not None or numeracion is not None:
                raise HTTPException(409, "No se puede cambiar la carrera ni el año de una cohorte con historial académico.")
        if cohorte.carrera_id != datos.carrera_id:
            if await self.obtener_carrera_activa(datos.carrera_id) is None:
                raise HTTPException(422, "La carrera seleccionada no existe o está inactiva.")
            if cohorte.abierta:
                raise HTTPException(409, "Cerrá las inscripciones antes de cambiar la carrera.")
        cohorte.nombre = nombre
        cohorte.anio = datos.anio
        cohorte.carrera_id = datos.carrera_id
        cohorte.fecha_inicio = datos.fecha_inicio
        await self.session.commit()
        await self.session.refresh(cohorte)
        return cohorte

    async def modificar_inscripcion(self, cohorte_id: UUID, abierta: bool):
        cohorte = await self.bloquear_cohorte(cohorte_id)
        if cohorte is None:
            await self.session.rollback()
            return None
        if abierta and (cohorte.carrera_id is None or await self.obtener_carrera_activa(cohorte.carrera_id) is None):
            await self.session.rollback()
            raise HTTPException(409, "No se puede abrir una cohorte sin una carrera activa.")
        cohorte.abierta = abierta
        await self.session.commit()
        await self.session.refresh(cohorte)
        return cohorte
