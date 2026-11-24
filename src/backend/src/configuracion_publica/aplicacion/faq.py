from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.configuracion_publica.infraestructura.orm_modelos import (
    PreguntaFrecuenteORM,
)


# Consulta pública y administrativa.
async def listar_preguntas(
    db: AsyncSession,
    solo_activas: bool = True,
):
    consulta = select(PreguntaFrecuenteORM)

    if solo_activas:
        consulta = consulta.where(
            PreguntaFrecuenteORM.activa.is_(True)
        )

    consulta = consulta.order_by(
        PreguntaFrecuenteORM.orden,
        PreguntaFrecuenteORM.categoria,
        PreguntaFrecuenteORM.id,
    )

    resultado = await db.execute(consulta)

    return resultado.scalars().all()


# Recupera una pregunta existente.
async def obtener_pregunta(
    pregunta_id: UUID,
    db: AsyncSession,
):
    pregunta = await db.get(
        PreguntaFrecuenteORM,
        pregunta_id,
    )

    if pregunta is None:
        raise HTTPException(
            status_code=404,
            detail="La pregunta frecuente no existe.",
        )

    return pregunta


# Persiste una operación y recupera sus datos.
async def guardar_pregunta(
    pregunta: PreguntaFrecuenteORM,
    db: AsyncSession,
):
    try:
        await db.commit()
        await db.refresh(pregunta)

    except Exception:
        await db.rollback()
        raise

    return pregunta


# Alta.
async def crear_pregunta(
    datos: dict,
    db: AsyncSession,
):
    pregunta = PreguntaFrecuenteORM(**datos)

    db.add(pregunta)

    return await guardar_pregunta(pregunta, db)


# Modificación.
async def modificar_pregunta(
    pregunta_id: UUID,
    datos: dict,
    db: AsyncSession,
):
    pregunta = await obtener_pregunta(
        pregunta_id,
        db,
    )

    for campo, valor in datos.items():
        setattr(pregunta, campo, valor)

    return await guardar_pregunta(pregunta, db)


# Baja lógica y reactivación.
async def cambiar_estado_pregunta(
    pregunta_id: UUID,
    activa: bool,
    db: AsyncSession,
):
    pregunta = await obtener_pregunta(
        pregunta_id,
        db,
    )

    pregunta.activa = activa

    return await guardar_pregunta(pregunta, db)
