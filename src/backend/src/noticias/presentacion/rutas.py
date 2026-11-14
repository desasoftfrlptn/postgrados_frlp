# Define las rutas públicas y administrativas de Noticias.

import os
import uuid

from datetime import date
from pathlib import Path
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy.ext.asyncio import AsyncSession

from src.usuarios.servicio import (
    obtener_administrador_actual,
)
from src.compartido.conexion import get_db
from src.noticias.aplicacion.servicio import (
    cambiar_estado_noticia,
    crear_noticia,
    listar_noticias_admin,
    listar_noticias_publicas,
    modificar_noticia,
)
from src.noticias.presentacion.esquema import (
    NoticiaEstadoModificar,
    NoticiaRespuesta,
)


enrutador = APIRouter(
    prefix="/api/v1/noticias",
    tags=["Noticias"],
)


seguridad_bearer = HTTPBearer()


CARPETA_IMAGENES = Path(
    "uploads/noticias"
)

TIPOS_IMAGEN_PERMITIDOS = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

TAMANIO_MAXIMO = 5 * 1024 * 1024


async def obtener_admin(
    credenciales: HTTPAuthorizationCredentials = Depends(
        seguridad_bearer
    ),
    db: AsyncSession = Depends(get_db),
):
    return await obtener_administrador_actual(
        credenciales.credentials,
        db,
    )


async def guardar_imagen(
    imagen: UploadFile | None,
) -> str | None:
    if imagen is None:
        return None

    if (
        imagen.content_type
        not in TIPOS_IMAGEN_PERMITIDOS
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "La imagen debe ser JPG, PNG o WEBP"
            ),
        )

    contenido = await imagen.read()

    if len(contenido) > TAMANIO_MAXIMO:
        raise HTTPException(
            status_code=400,
            detail=(
                "La imagen no puede superar los 5 MB"
            ),
        )

    extension = os.path.splitext(
        imagen.filename or ""
    )[1].lower()

    if extension not in {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
    }:
        raise HTTPException(
            status_code=400,
            detail="Extensión de imagen no válida",
        )

    CARPETA_IMAGENES.mkdir(
        parents=True,
        exist_ok=True,
    )

    nombre_archivo = (
        f"{uuid.uuid4()}{extension}"
    )

    ruta_archivo = (
        CARPETA_IMAGENES
        / nombre_archivo
    )

    ruta_archivo.write_bytes(
        contenido
    )

    return (
        f"/uploads/noticias/"
        f"{nombre_archivo}"
    )


@enrutador.get(
    "/publicas",
    response_model=list[NoticiaRespuesta],
)
async def obtener_noticias_publicas(
    db: AsyncSession = Depends(get_db),
):
    return await listar_noticias_publicas(
        db
    )


@enrutador.get(
    "",
    response_model=list[NoticiaRespuesta],
)
async def obtener_noticias_administracion(
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await listar_noticias_admin(
        db
    )


@enrutador.post(
    "",
    response_model=NoticiaRespuesta,
    status_code=201,
)
async def registrar_noticia(
    titulo: str = Form(...),
    categoria: str = Form(...),
    resumen: str = Form(...),
    contenido: str = Form(...),
    fecha: date = Form(...),
    imagen: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    imagen_url = await guardar_imagen(
        imagen
    )

    return await crear_noticia(
        titulo=titulo,
        categoria=categoria,
        resumen=resumen,
        contenido=contenido,
        fecha=fecha,
        imagen_url=imagen_url,
        db=db,
    )


@enrutador.put(
    "/{noticia_id}",
    response_model=NoticiaRespuesta,
)
async def actualizar_noticia(
    noticia_id: UUID,
    titulo: str = Form(...),
    categoria: str = Form(...),
    resumen: str = Form(...),
    contenido: str = Form(...),
    fecha: date = Form(...),
    imagen: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    imagen_url = await guardar_imagen(
        imagen
    )

    return await modificar_noticia(
        noticia_id=noticia_id,
        titulo=titulo,
        categoria=categoria,
        resumen=resumen,
        contenido=contenido,
        fecha=fecha,
        imagen_url=imagen_url,
        db=db,
    )


@enrutador.patch(
    "/{noticia_id}/estado",
    response_model=NoticiaRespuesta,
)
async def actualizar_estado(
    noticia_id: UUID,
    datos: NoticiaEstadoModificar,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await cambiar_estado_noticia(
        noticia_id,
        datos.activo,
        db,
    )