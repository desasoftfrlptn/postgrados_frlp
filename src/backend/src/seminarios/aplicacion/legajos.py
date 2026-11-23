from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.compartido.documentos import normalizar_documento
from src.inscripcion.infraestructura.cohortes_modelos import CohorteORM
from src.inscripcion.infraestructura.orm_modelos import LegajoORM


ESTADOS_HABILITADOS_CURSADA = (
    "ACTIVO",
    "EN_RIESGO",
)


def consulta_legajos_academicos(
    dni: str,
    email: str | None = None,
    carrera_id: UUID | None = None,
):
    consulta = (
        select(LegajoORM)
        .join(
            CohorteORM,
            LegajoORM.cohorte_id == CohorteORM.id,
        )
        .where(
            LegajoORM.dni_pasaporte == normalizar_documento(dni),
            LegajoORM.estado.in_(ESTADOS_HABILITADOS_CURSADA),
        )
    )

    if email is not None:
        consulta = consulta.where(
            func.lower(LegajoORM.correo_electronico)
            == email.strip().lower()
        )

    if carrera_id is not None:
        consulta = consulta.where(
            CohorteORM.carrera_id == carrera_id
        )

    return consulta


async def obtener_legajo_academico(
    db: AsyncSession,
    dni: str,
    carrera_id: UUID,
    email: str | None = None,
) -> LegajoORM:
    consulta = consulta_legajos_academicos(
        dni=dni,
        email=email,
        carrera_id=carrera_id,
    ).limit(2)

    resultado = await db.execute(consulta)
    legajos = resultado.scalars().all()

    if not legajos:
        raise HTTPException(
            status_code=404,
            detail=(
                "No se encontró un legajo habilitado "
                "para esta carrera."
            ),
        )

    if len(legajos) > 1:
        raise HTTPException(
            status_code=409,
            detail=(
                "Existe más de un legajo habilitado "
                "para esta carrera. Se requiere identificar "
                "el legajo correspondiente."
            ),
        )

    return legajos[0]
