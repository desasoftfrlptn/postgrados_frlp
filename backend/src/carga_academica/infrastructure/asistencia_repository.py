"""Consultas a la base para crear clases y cargar asistencia (US-B-002).

Capa INFRASTRUCTURE: el único lugar de este caso de uso que habla con la base.
"""

import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.carga_academica.infrastructure.orm_models import (
    Asistencia,
    Clase,
    InscripcionSeminario,
    Seminario,
)


class AsistenciaRepository:
    def __init__(self, db: AsyncSession):
        # La sesión llega desde afuera (inyección de dependencias), igual que en la planilla.
        self.db = db

    # ---------- Seminario y clases ----------

    async def obtener_seminario(self, seminario_id: uuid.UUID) -> Seminario | None:
        """El seminario, o None si no existe (el router lo convierte en 404)."""
        return await self.db.get(Seminario, seminario_id)

    async def existe_clase_en_fecha(self, seminario_id: uuid.UUID, fecha: date) -> bool:
        """¿Ya hay una clase de este seminario en esa fecha? Evita columnas duplicadas."""
        consulta = select(Clase.id).where(
            Clase.seminario_id == seminario_id,
            Clase.fecha == fecha,
        )
        return await self.db.scalar(consulta) is not None

    async def crear_clase(self, seminario_id: uuid.UUID, fecha: date) -> Clase:
        """Crea la clase y la devuelve con el id que generó la base."""
        clase = Clase(seminario_id=seminario_id, fecha=fecha)
        self.db.add(clase)
        await self.db.commit()
        # refresh trae de la base lo que se generó solo (id, created_at)
        await self.db.refresh(clase)
        return clase

    async def obtener_clase(self, clase_id: uuid.UUID) -> Clase | None:
        return await self.db.get(Clase, clase_id)

    async def contar_clases(self, seminario_id: uuid.UUID) -> int:
        """Total de clases dictadas: es el divisor de la fórmula BR-002."""
        consulta = select(func.count()).where(Clase.seminario_id == seminario_id)
        return await self.db.scalar(consulta)

    # ---------- Alumnos y asistencias ----------

    async def legajos_inscriptos(
        self, seminario_id: uuid.UUID, legajo_ids: list[uuid.UUID]
    ) -> set[uuid.UUID]:
        """De los legajos pedidos, cuáles están inscriptos a este seminario.

        El service compara: si falta alguno, ese alumno no es del seminario.
        """
        consulta = select(InscripcionSeminario.legajo_id).where(
            InscripcionSeminario.seminario_id == seminario_id,
            InscripcionSeminario.legajo_id.in_(legajo_ids),
        )
        return set(await self.db.scalars(consulta))

    async def guardar_asistencias(
        self, clase_id: uuid.UUID, celdas: list[tuple[uuid.UUID, bool]]
    ) -> None:
        """Crea o actualiza la asistencia de cada celda (legajo_id, presente).

        Usa INSERT ... ON CONFLICT DO UPDATE de PostgreSQL ("upsert"):
        - si esa celda no existía, la crea;
        - si ya existía (mismo clase_id y legajo_id), le cambia el presente.
        Así el docente puede tildar y destildar cuantas veces quiera.
        """
        filas = [
            {"clase_id": clase_id, "legajo_id": legajo_id, "presente": presente}
            for legajo_id, presente in celdas
        ]
        consulta = pg_insert(Asistencia).values(filas)
        consulta = consulta.on_conflict_do_update(
            # La tabla tiene UNIQUE(clase_id, legajo_id): ese es el "conflicto"
            index_elements=["clase_id", "legajo_id"],
            # excluded = los valores que intentamos insertar
            set_={"presente": consulta.excluded.presente},
        )
        await self.db.execute(consulta)
        await self.db.commit()

    async def contar_presentes(
        self, seminario_id: uuid.UUID, legajo_ids: list[uuid.UUID]
    ) -> dict[uuid.UUID, int]:
        """Cuántas clases estuvo presente cada alumno pedido.

        Devuelve {legajo_id: presentes}. El que no tiene ninguna, no aparece
        (el service lo toma como 0).
        """
        consulta = (
            select(Asistencia.legajo_id, func.count())
            .join(Clase, Clase.id == Asistencia.clase_id)
            .where(
                Clase.seminario_id == seminario_id,
                Asistencia.legajo_id.in_(legajo_ids),
                Asistencia.presente.is_(True),
            )
            .group_by(Asistencia.legajo_id)
        )
        filas = await self.db.execute(consulta)
        return {legajo_id: cantidad for legajo_id, cantidad in filas}