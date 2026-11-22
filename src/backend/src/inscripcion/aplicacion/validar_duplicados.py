from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.inscripcion.infraestructura.cohortes_modelos import (
    CohorteORM,
)
from src.inscripcion.infraestructura.orm_modelos import (
    LegajoORM,
)


MAXIMO_CARRERAS_POR_ANIO = 2

ESTADOS_NO_VIGENTES = (
    "RECHAZADO",
    "BAJA",
    "VENCIDO",
    "GRADUADO",
)


async def validar_inscripcion_no_duplicada(
    db: AsyncSession,
    correo_electronico: str,
    dni_pasaporte: str,
    cohorte_id: UUID,
) -> None:
    dni = dni_pasaporte.strip()
    correo = correo_electronico.strip().lower()

    # Serializar las inscripciones de un mismo documento.
    await db.execute(
        text(
            "SELECT pg_advisory_xact_lock("
            "hashtextextended(:clave, 0))"
        ),
        {"clave": f"inscripcion:dni:{dni}"},
    )

    # Evitar asociaciones simultaneas de un mismo
    # correo con documentos diferentes.
    await db.execute(
        text(
            "SELECT pg_advisory_xact_lock("
            "hashtextextended(:clave, 0))"
        ),
        {"clave": f"inscripcion:correo:{correo}"},
    )

    cohorte = await db.get(CohorteORM, cohorte_id)

    if cohorte is None:
        raise HTTPException(
            status_code=404,
            detail="La cohorte seleccionada no existe.",
        )

    correo_de_otro_aspirante = await db.scalar(
        select(LegajoORM.id)
        .where(
            func.lower(
                LegajoORM.correo_electronico
            ) == correo,
            LegajoORM.dni_pasaporte != dni,
        )
        .limit(1)
    )

    if correo_de_otro_aspirante is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "El correo electronico ya esta asociado "
                "a otro documento."
            ),
        )

    inscripcion_misma_cohorte = await db.scalar(
        select(LegajoORM.id)
        .where(
            LegajoORM.dni_pasaporte == dni,
            LegajoORM.cohorte_id == cohorte_id,
        )
        .limit(1)
    )

    if inscripcion_misma_cohorte is not None:
        raise HTTPException(
            status_code=409,
            detail="Ya existe una inscripcion en esta cohorte.",
        )

    inscripciones_misma_carrera = await db.scalar(
        select(LegajoORM.id)
        .join(
            CohorteORM,
            LegajoORM.cohorte_id == CohorteORM.id,
        )
        .where(
            LegajoORM.dni_pasaporte == dni,
            CohorteORM.anio == cohorte.anio,
            CohorteORM.carrera_id == cohorte.carrera_id,
            LegajoORM.estado.notin_(ESTADOS_NO_VIGENTES),
        )
        .limit(1)
    )

    if inscripciones_misma_carrera is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe una inscripcion vigente "
                "para esta carrera."
            ),
        )

    cantidad = await db.scalar(
        select(func.count(LegajoORM.id))
        .join(
            CohorteORM,
            LegajoORM.cohorte_id == CohorteORM.id,
        )
        .where(
            LegajoORM.dni_pasaporte == dni,
            CohorteORM.anio == cohorte.anio,
            LegajoORM.estado.notin_(ESTADOS_NO_VIGENTES),
        )
    )

    if cantidad >= MAXIMO_CARRERAS_POR_ANIO:
        raise HTTPException(
            status_code=409,
            detail=(
                "Alcanzaste el maximo de dos carreras "
                "por periodo de inscripcion."
            ),
        )
