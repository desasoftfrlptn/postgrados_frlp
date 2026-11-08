"""Rutas HTTP para la gestión documental."""

import uuid

import jwt
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.acceso.controllers.dependencies import get_acceso_actual
from src.gestion_documental.application.services import (
    guardar_documento,
    obtener_documento_para_descarga,
)
from src.inscripcion.infrastructure.orm_models import Legajo
from src.shared.auth.jwt import obtener_id_usuario
from src.shared.auth.orm_models import Usuario
from src.shared.database.session import get_db


router = APIRouter(tags=["Documentos"])
bearer = HTTPBearer(auto_error=False)


@router.post(
    "/legajos/{legajo_id}/documentos",
    status_code=status.HTTP_201_CREATED,
)
async def subir_documento(
    legajo_id: uuid.UUID,
    request: Request,
    tipo: str = Form(...),
    archivo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Carga un PDF si la sesión de aspirante está autorizada."""

    contexto = await get_acceso_actual(request, db)

    legajo = await db.get(Legajo, legajo_id)

    if legajo is None:
        raise HTTPException(404, "No se encontró el legajo")

    if contexto["tipo"] == "INSCRIPCION":
        autorizado = contexto["cohorte_id"] == legajo.cohorte_id
    elif contexto["tipo"] == "SEGUIMIENTO":
        autorizado = contexto["legajo_id"] == legajo.id
    else:
        autorizado = False

    if not autorizado:
        raise HTTPException(403, "No tenés permiso para cargar documentos en este legajo")

    documento = await guardar_documento(db, legajo_id, tipo, archivo)

    return {
        "id": str(documento.id),
        "legajo_id": str(documento.legajo_id),
        "tipo": documento.tipo,
        "nombre_original": documento.nombre_original,
        "tamanio_bytes": documento.tamanio_bytes,
        "estado": documento.estado,
        "fecha_subida": documento.fecha_subida,
    }


@router.get("/documentos/{documento_id}/download")
async def descargar_documento(
    documento_id: uuid.UUID,
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
):
    """Descarga un PDF si el usuario es coordinador o dueño del legajo."""

    contexto = None
    autorizado = False

    if credentials is not None:
        try:
            usuario_id = obtener_id_usuario(credentials.credentials)
        except jwt.InvalidTokenError as exc:
            raise HTTPException(401, "Sesión inválida o vencida") from exc

        usuario = await db.get(Usuario, usuario_id)

        if usuario is None or not usuario.activo:
            raise HTTPException(401, "Sesión inválida o vencida")

        autorizado = usuario.rol == "coordinador"
    else:
        contexto = await get_acceso_actual(request, db)

    documento, ruta_archivo = await obtener_documento_para_descarga(
        db, documento_id
    )

    if contexto is not None and contexto["tipo"] == "SEGUIMIENTO":
        autorizado = contexto["legajo_id"] == documento.legajo_id

    if not autorizado:
        raise HTTPException(403, "No tenés permiso para descargar este documento")

    return FileResponse(
        path=ruta_archivo,
        media_type="application/pdf",
        filename=documento.nombre_original,
    )