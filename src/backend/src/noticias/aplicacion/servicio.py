# Contiene la lógica necesaria para administrar noticias.

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.noticias.infraestructura.orm_modelos import (
    NoticiaORM,
)


def limpiar_texto(
    valor: str,
    nombre: str,
) -> str:
    valor_limpio = valor.strip()

    if not valor_limpio:
        raise HTTPException(
            status_code=400,
            detail=f"El campo {nombre} es obligatorio",
        )

    return valor_limpio


async def listar_noticias_publicas(
    db: AsyncSession,
) -> list[NoticiaORM]:
    consulta = (
        select(NoticiaORM)
        .where(
            NoticiaORM.activo.is_(True)
        )
        .order_by(
            NoticiaORM.fecha.desc()
        )
    )

    resultado = await db.execute(
        consulta
    )

    return list(
        resultado.scalars().all()
    )


async def listar_noticias_admin(
    db: AsyncSession,
) -> list[NoticiaORM]:
    consulta = (
        select(NoticiaORM)
        .order_by(
            NoticiaORM.fecha.desc()
        )
    )

    resultado = await db.execute(
        consulta
    )

    return list(
        resultado.scalars().all()
    )


async def crear_noticia(
    titulo: str,
    categoria: str,
    resumen: str,
    contenido: str,
    fecha,
    imagen_url: str | None,
    db: AsyncSession,
) -> NoticiaORM:
    noticia = NoticiaORM(
        titulo=limpiar_texto(
            titulo,
            "título",
        ),
        categoria=limpiar_texto(
            categoria,
            "categoría",
        ),
        resumen=limpiar_texto(
            resumen,
            "resumen",
        ),
        contenido=limpiar_texto(
            contenido,
            "contenido",
        ),
        fecha=fecha,
        imagen_url=imagen_url,
        activo=True,
    )

    db.add(noticia)

    await db.commit()
    await db.refresh(noticia)

    return noticia


async def modificar_noticia(
    noticia_id: UUID,
    titulo: str,
    categoria: str,
    resumen: str,
    contenido: str,
    fecha,
    imagen_url: str | None,
    db: AsyncSession,
) -> NoticiaORM:
    noticia = await db.get(
        NoticiaORM,
        noticia_id,
    )

    if noticia is None:
        raise HTTPException(
            status_code=404,
            detail="Noticia no encontrada",
        )

    noticia.titulo = limpiar_texto(
        titulo,
        "título",
    )

    noticia.categoria = limpiar_texto(
        categoria,
        "categoría",
    )

    noticia.resumen = limpiar_texto(
        resumen,
        "resumen",
    )

    noticia.contenido = limpiar_texto(
        contenido,
        "contenido",
    )

    noticia.fecha = fecha

    if imagen_url is not None:
        noticia.imagen_url = imagen_url

    await db.commit()
    await db.refresh(noticia)

    return noticia


async def cambiar_estado_noticia(
    noticia_id: UUID,
    activo: bool,
    db: AsyncSession,
) -> NoticiaORM:
    noticia = await db.get(
        NoticiaORM,
        noticia_id,
    )

    if noticia is None:
        raise HTTPException(
            status_code=404,
            detail="Noticia no encontrada",
        )

    noticia.activo = activo

    await db.commit()
    await db.refresh(noticia)

    return noticia