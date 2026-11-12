# Contiene la lógica necesaria para administrar seminarios.

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.usuarios.modelos import (
    UsuarioORM,
)
from src.carreras.modelos import (
    CarreraORM,
)
from src.seminarios.infraestructura.orm_modelos import (
    SeminarioORM,
)
from src.seminarios.presentacion.esquema import (
    SeminarioCrear,
    SeminarioModificar,
    SeminarioRespuesta,
)


async def obtener_carrera(
    carrera_id: UUID,
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

    return carrera


async def obtener_docente(
    docente_id: UUID,
    db: AsyncSession,
) -> UsuarioORM:
    consulta = (
        select(UsuarioORM)
        .where(
            UsuarioORM.id == docente_id
        )
    )

    docente = await db.scalar(
        consulta
    )

    if docente is None:
        raise HTTPException(
            status_code=404,
            detail="Docente no encontrado",
        )

    await db.refresh(
        docente,
        ["rol"],
    )

    if docente.rol.nombre != "DOCENTE":
        raise HTTPException(
            status_code=400,
            detail=(
                "El usuario seleccionado "
                "no tiene rol DOCENTE"
            ),
        )

    return docente


def validar_fechas(
    fecha_inicio,
    fecha_fin,
):
    if fecha_fin < fecha_inicio:
        raise HTTPException(
            status_code=400,
            detail=(
                "La fecha de finalización "
                "no puede ser anterior "
                "a la fecha de inicio"
            ),
        )


async def convertir_respuesta(
    seminario: SeminarioORM,
    db: AsyncSession,
) -> SeminarioRespuesta:
    carrera = await obtener_carrera(
        seminario.carrera_id,
        db,
    )

    docente = await obtener_docente(
        seminario.docente_id,
        db,
    )

    return SeminarioRespuesta(
        id=seminario.id,
        nombre=seminario.nombre,
        carrera_id=seminario.carrera_id,
        carrera_nombre=carrera.nombre,
        docente_id=seminario.docente_id,
        docente_nombre=(
            f"{docente.nombre} "
            f"{docente.apellido}"
        ),
        fecha_inicio=seminario.fecha_inicio,
        fecha_fin=seminario.fecha_fin,
        activo=seminario.activo,
    )


async def listar_seminarios(
    db: AsyncSession,
) -> list[SeminarioRespuesta]:
    consulta = (
        select(SeminarioORM)
        .order_by(
            SeminarioORM.nombre
        )
    )

    resultado = await db.execute(
        consulta
    )

    seminarios = list(
        resultado.scalars().all()
    )

    respuestas: list[
        SeminarioRespuesta
    ] = []

    for seminario in seminarios:
        respuesta = await convertir_respuesta(
            seminario,
            db,
        )

        respuestas.append(
            respuesta
        )

    return respuestas


async def crear_seminario(
    datos: SeminarioCrear,
    db: AsyncSession,
) -> SeminarioRespuesta:
    nombre = datos.nombre.strip()

    if not nombre:
        raise HTTPException(
            status_code=400,
            detail=(
                "El nombre del seminario "
                "es obligatorio"
            ),
        )

    validar_fechas(
        datos.fecha_inicio,
        datos.fecha_fin,
    )

    await obtener_carrera(
        datos.carrera_id,
        db,
    )

    await obtener_docente(
        datos.docente_id,
        db,
    )

    seminario = SeminarioORM(
        nombre=nombre,
        carrera_id=datos.carrera_id,
        docente_id=datos.docente_id,
        fecha_inicio=datos.fecha_inicio,
        fecha_fin=datos.fecha_fin,
        activo=True,
    )

    db.add(seminario)

    await db.commit()
    await db.refresh(seminario)

    return await convertir_respuesta(
        seminario,
        db,
    )


async def modificar_seminario(
    seminario_id: UUID,
    datos: SeminarioModificar,
    db: AsyncSession,
) -> SeminarioRespuesta:
    seminario = await db.get(
        SeminarioORM,
        seminario_id,
    )

    if seminario is None:
        raise HTTPException(
            status_code=404,
            detail="Seminario no encontrado",
        )

    nombre = datos.nombre.strip()

    if not nombre:
        raise HTTPException(
            status_code=400,
            detail=(
                "El nombre del seminario "
                "es obligatorio"
            ),
        )

    validar_fechas(
        datos.fecha_inicio,
        datos.fecha_fin,
    )

    await obtener_carrera(
        datos.carrera_id,
        db,
    )

    await obtener_docente(
        datos.docente_id,
        db,
    )

    seminario.nombre = nombre
    seminario.carrera_id = (
        datos.carrera_id
    )
    seminario.docente_id = (
        datos.docente_id
    )
    seminario.fecha_inicio = (
        datos.fecha_inicio
    )
    seminario.fecha_fin = (
        datos.fecha_fin
    )

    await db.commit()
    await db.refresh(seminario)

    return await convertir_respuesta(
        seminario,
        db,
    )


async def cambiar_estado_seminario(
    seminario_id: UUID,
    activo: bool,
    db: AsyncSession,
) -> SeminarioRespuesta:
    seminario = await db.get(
        SeminarioORM,
        seminario_id,
    )

    if seminario is None:
        raise HTTPException(
            status_code=404,
            detail="Seminario no encontrado",
        )

    seminario.activo = activo

    await db.commit()
    await db.refresh(seminario)

    return await convertir_respuesta(
        seminario,
        db,
    )