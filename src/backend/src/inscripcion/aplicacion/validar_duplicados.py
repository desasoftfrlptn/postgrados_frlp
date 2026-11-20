
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.inscripcion.infraestructura.orm_modelos import LegajoORM


async def validar_inscripcion_no_duplicada(
    db: AsyncSession,
    correo_electronico: str,
    dni_pasaporte: str,
    cohorte_id: UUID,
) -> None:

    correo_existente = await db.scalar(
        select(LegajoORM.id).where(
            LegajoORM.correo_electronico == correo_electronico
        )
    )

    if correo_existente is not None:
        raise HTTPException(
            status_code=409,
            detail="Ya existe una inscripción con ese correo electrónico.",
        )

    dni_existente = await db.scalar(
        select(LegajoORM.id).where(
            LegajoORM.dni_pasaporte == dni_pasaporte,
            LegajoORM.cohorte_id == cohorte_id,
        )
    )

    if dni_existente is not None:
        raise HTTPException(
            status_code=409,
            detail="El documento ya está registrado en esta cohorte.",
        )
