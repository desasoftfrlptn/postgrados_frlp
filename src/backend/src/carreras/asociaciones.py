"""Consulta las relaciones académicas existentes sin duplicar su persistencia."""
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.carreras.modelos import CarreraORM
from src.inscripcion.infraestructura.cohortes_modelos import CohorteORM
from src.inscripcion.infraestructura.orm_modelos import LegajoORM
from src.seminarios.infraestructura.orm_modelos import SeminarioORM
from src.usuarios.modelos import UsuarioORM


async def consultar_asociaciones(carrera_id: UUID, db: AsyncSession):
    if await db.get(CarreraORM, carrera_id) is None:
        raise HTTPException(404, "Carrera no encontrada.")
    alumnos = (await db.execute(
        select(LegajoORM, CohorteORM)
        .join(CohorteORM, CohorteORM.id == LegajoORM.cohorte_id)
        .where(CohorteORM.carrera_id == carrera_id,
               LegajoORM.estado.in_(("ACTIVO", "EN_RIESGO", "GRADUADO", "BAJA")))
        .order_by(LegajoORM.apellido, LegajoORM.nombre, CohorteORM.anio)
    )).all()
    docentes = (await db.execute(
        select(SeminarioORM, UsuarioORM)
        .join(UsuarioORM, UsuarioORM.id == SeminarioORM.docente_id)
        .where(SeminarioORM.carrera_id == carrera_id)
        .order_by(UsuarioORM.apellido, UsuarioORM.nombre, SeminarioORM.nombre)
    )).all()
    return {
        "alumnos": [{"id": str(l.id), "alumno": f"{l.apellido}, {l.nombre}",
                     "legajo": l.numero_seguimiento, "cohorte": c.nombre, "estado": l.estado}
                    for l, c in alumnos],
        "docentes": [{"id": str(s.id), "docente": f"{u.apellido}, {u.nombre}",
                      "seminario": s.nombre, "activo": bool(s.activo and u.activo)}
                     for s, u in docentes],
    }
