# Contiene la lógica necesaria para administrar carreras.

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.carreras.modelos import CarreraORM
from src.carreras.esquemas import (
    CarreraCrear,
    CarreraModificar,
)


TIPOS_CARRERA = {
    "Especializacion",
    "Maestria",
    "Doctorado",
}


def validar_tipo_carrera(tipo: str) -> str:
    tipo_normalizado = tipo.strip()

    if tipo_normalizado not in TIPOS_CARRERA:
        raise HTTPException(
            status_code=400,
            detail="El tipo de carrera no es válido",
        )

    return tipo_normalizado


async def listar_carreras(
    db: AsyncSession,
) -> list[CarreraORM]:
    consulta = (
        select(CarreraORM)
        .order_by(CarreraORM.nombre)
    )

    resultado = await db.execute(consulta)

    return list(
        resultado.scalars().all()
    )


async def crear_carrera(
    datos: CarreraCrear,
    db: AsyncSession,
) -> CarreraORM:
    nombre = datos.nombre.strip()
    duracion = datos.duracion.strip()
    descripcion = datos.descripcion.strip()

    if not nombre:
        raise HTTPException(
            status_code=400,
            detail="El nombre es obligatorio",
        )

    if not duracion:
        raise HTTPException(
            status_code=400,
            detail="La duración es obligatoria",
        )

    if not descripcion:
        raise HTTPException(
            status_code=400,
            detail="La descripción es obligatoria",
        )

    tipo = validar_tipo_carrera(
        datos.tipo
    )

    consulta_existente = select(
        CarreraORM
    ).where(
        CarreraORM.nombre == nombre
    )

    existente = await db.scalar(
        consulta_existente
    )

    if existente is not None:
        raise HTTPException(
            status_code=409,
            detail="Ya existe una carrera con ese nombre",
        )

    carrera = CarreraORM(
        nombre=nombre,
        tipo=tipo,
        duracion=duracion,
        descripcion=descripcion,
        activo=True,
    )

    db.add(carrera)

    await db.commit()
    await db.refresh(carrera)

    return carrera


async def modificar_carrera(
    carrera_id: UUID,
    datos: CarreraModificar,
    db: AsyncSession,
) -> CarreraORM:
    carrera = await db.get(
        CarreraORM,
        carrera_id,
    )

    if carrera is None:
        raise HTTPException(
            status_code=404,
            detail="Carrera no encontrada",
        )

    nombre = datos.nombre.strip()
    duracion = datos.duracion.strip()
    descripcion = datos.descripcion.strip()

    if not nombre:
        raise HTTPException(
            status_code=400,
            detail="El nombre es obligatorio",
        )

    if not duracion:
        raise HTTPException(
            status_code=400,
            detail="La duración es obligatoria",
        )

    if not descripcion:
        raise HTTPException(
            status_code=400,
            detail="La descripción es obligatoria",
        )

    tipo = validar_tipo_carrera(
        datos.tipo
    )

    consulta_existente = select(
        CarreraORM
    ).where(
        CarreraORM.nombre == nombre,
        CarreraORM.id != carrera_id,
    )

    existente = await db.scalar(
        consulta_existente
    )

    if existente is not None:
        raise HTTPException(
            status_code=409,
            detail="Ya existe otra carrera con ese nombre",
        )

    carrera.nombre = nombre
    carrera.tipo = tipo
    carrera.duracion = duracion
    carrera.descripcion = descripcion

    await db.commit()
    await db.refresh(carrera)

    return carrera


async def cambiar_estado_carrera(
    carrera_id: UUID,
    activo: bool,
    db: AsyncSession,
) -> CarreraORM:
    carrera = await db.get(
        CarreraORM,
        carrera_id,
    )

    if carrera is None:
        raise HTTPException(
            status_code=404,
            detail="Carrera no encontrada",
        )

    carrera.activo = activo

    await db.commit()
    await db.refresh(carrera)

    return carrera