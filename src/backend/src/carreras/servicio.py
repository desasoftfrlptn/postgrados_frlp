# Contiene la lógica necesaria para administrar carreras.

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
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

async def borrar_carrera(carrera_id: UUID, db: AsyncSession) -> None:
    registro = await db.scalar(select(CarreraORM).where(CarreraORM.id == carrera_id).with_for_update())
    if registro is None:
        raise HTTPException(404, "Carrera no encontrada.")
    # Bloquear las entidades dependientes antes de eliminar. Todas las operaciones
    # se ejecutan dentro de la misma transacción; no se eliminan cuentas de usuario.
    parametros = {"carrera": carrera_id, "nombre": registro.nombre.strip()}
    cohortes = "SELECT id FROM cohortes WHERE carrera_id = :carrera"
    legajos = f"SELECT id FROM legajos WHERE cohorte_id IN ({cohortes}) OR (cohorte_id IS NULL AND lower(trim(carrera_elegida)) = lower(:nombre))"
    seminarios = "SELECT id FROM seminarios WHERE carrera_id = :carrera"
    tutorias = f"SELECT id FROM tutorias WHERE legajo_id IN ({legajos})"
    documentos = f"SELECT id FROM documentos_legajo WHERE legajo_id IN ({legajos})"
    try:
        for consulta in (cohortes, legajos, seminarios, tutorias, documentos):
            await db.execute(text(consulta + " FOR UPDATE"), parametros)
        for sentencia in (
            f"DELETE FROM encuentros_tutoria WHERE tutoria_id IN ({tutorias})",
            f"DELETE FROM tutorias WHERE legajo_id IN ({legajos})",
            f"DELETE FROM tesis WHERE legajo_id IN ({legajos})",
            f"DELETE FROM trabajos_practicos WHERE legajo_id IN ({legajos})",
            f"DELETE FROM inscripciones_seminario WHERE seminario_id IN ({seminarios}) OR legajo_id IN ({legajos})",
            f"DELETE FROM asistencias_clase WHERE seminario_id IN ({seminarios}) OR legajo_id IN ({legajos})",
            f"DELETE FROM notificaciones_conduccion WHERE documento_id IN ({documentos})",
            f"DELETE FROM documentos_legajo WHERE legajo_id IN ({legajos})",
            f"DELETE FROM gestion_legajos WHERE legajo_id IN ({legajos})",
            f"DELETE FROM legajos WHERE id IN ({legajos})",
            f"DELETE FROM numeracion_legajos_cohortes WHERE cohorte_id IN ({cohortes})",
            "DELETE FROM seminarios WHERE carrera_id = :carrera",
            "DELETE FROM cohortes WHERE carrera_id = :carrera",
        ):
            await db.execute(text(sentencia), parametros)
        await db.delete(registro)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(409, "No se pudo eliminar la carrera y sus asociaciones. No se realizaron cambios.") from exc
