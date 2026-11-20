
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.eventos.modelos import EventoORM
from src.eventos.esquemas import EventoCrear, EventoModificar


TIPOS_EVENTO = {
    "clases",
    "inscripcion",
    "examen",
    "feriado",
    "receso",
    "fin_clases",
    "entrega",
    "actividad",
    "otros",
}

PREFIJO_OTRO = "otros:"
LONGITUD_MAXIMA_TIPO = 30


def validar_datos(datos: EventoCrear):
    titulo = datos.titulo.strip()
    descripcion = datos.descripcion.strip()
    tipo = datos.tipo.strip()

    if not titulo or not descripcion:
        raise HTTPException(
            status_code=400,
            detail="El título y la descripción son obligatorios",
        )

    if tipo.startswith(PREFIJO_OTRO):
        nombre_personalizado = tipo[len(PREFIJO_OTRO):].strip()

        if not nombre_personalizado:
            raise HTTPException(
                status_code=400,
                detail="Debés especificar el tipo de evento",
            )

        tipo = PREFIJO_OTRO + nombre_personalizado

        if len(tipo) > LONGITUD_MAXIMA_TIPO:
            raise HTTPException(
                status_code=400,
                detail="El tipo de evento personalizado es demasiado largo",
            )

    elif tipo not in TIPOS_EVENTO:
        raise HTTPException(
            status_code=400,
            detail="El tipo de evento no es válido",
        )

    return titulo, descripcion, tipo


async def listar_eventos_publicos(db: AsyncSession):
    resultado = await db.execute(
        select(EventoORM)
        .where(EventoORM.activo.is_(True))
        .order_by(EventoORM.fecha)
    )
    return list(resultado.scalars().all())


async def listar_eventos_admin(db: AsyncSession):
    resultado = await db.execute(
        select(EventoORM).order_by(EventoORM.fecha)
    )
    return list(resultado.scalars().all())


async def crear_evento(datos: EventoCrear, db: AsyncSession):
    titulo, descripcion, tipo = validar_datos(datos)

    evento = EventoORM(
        titulo=titulo,
        descripcion=descripcion,
        fecha=datos.fecha,
        tipo=tipo,
        activo=True,
    )

    db.add(evento)
    await db.commit()
    await db.refresh(evento)

    return evento


async def modificar_evento(
    evento_id: UUID,
    datos: EventoModificar,
    db: AsyncSession,
):
    evento = await db.get(EventoORM, evento_id)

    if evento is None:
        raise HTTPException(
            status_code=404,
            detail="Evento no encontrado",
        )

    titulo, descripcion, tipo = validar_datos(datos)

    evento.titulo = titulo
    evento.descripcion = descripcion
    evento.fecha = datos.fecha
    evento.tipo = tipo

    await db.commit()
    await db.refresh(evento)

    return evento


async def cambiar_estado_evento(
    evento_id: UUID,
    activo: bool,
    db: AsyncSession,
):
    evento = await db.get(EventoORM, evento_id)

    if evento is None:
        raise HTTPException(
            status_code=404,
            detail="Evento no encontrado",
        )

    evento.activo = activo

    await db.commit()
    await db.refresh(evento)

    return evento
