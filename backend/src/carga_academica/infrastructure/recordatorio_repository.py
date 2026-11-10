"""Consultas para el recordatorio de carga de notas (US-B-005)."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.carga_academica.infrastructure.orm_models import InscripcionSeminario, Seminario


class RecordatorioRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def seminarios_con_notas_pendientes(self) -> list[tuple[Seminario, int]]:
        """Seminarios con fecha límite cargada y cuántos alumnos todavía no tienen nota.

        Los que ya tienen todas las notas no aparecen: el JOIN con la condición
        nota_final IS NULL los deja afuera. Así el recordatorio se corta solo
        cuando el docente termina de cargar.
        """
        consulta = (
            select(Seminario, func.count(InscripcionSeminario.id))
            .join(InscripcionSeminario, InscripcionSeminario.seminario_id == Seminario.id)
            .where(
                Seminario.fecha_limite_notas.is_not(None),
                InscripcionSeminario.nota_final.is_(None),
            )
            .group_by(Seminario.id)
        )
        filas = await self.db.execute(consulta)
        return [(seminario, sin_nota) for seminario, sin_nota in filas]