"""Rutas HTTP para la gestión documental."""

import uuid

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
    listar_documentos,
    revisar_documento,
    obtener_documento_para_descarga,
)
from src.gestion_documental.infrastructure.orm_models import Documento
from src.gestion_documental.presentation.schemas import DocumentoResponse, RevisarDocumentoRequest
from src.inscripcion.infrastructure.orm_models import Legajo
from src.shared.auth.dependencies import get_current_user, require_role
from src.shared.auth.orm_models import Usuario
from src.shared.database.session import get_db


router = APIRouter(tags=["Documentos"])
bearer = HTTPBearer(auto_error=False)


@router.post(
    "/legajos/{legajo_id}/documentos",
    status_code=status.HTTP_201_CREATED,
    response_model=DocumentoResponse,
)
async def subir_documento(
    legajo_id: uuid.UUID,
    request: Request,
    tipo: str = Form(...),
    archivo: UploadFile = File(..., alias="file"),
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


async def identidad_lectora(request: Request, credentials, db):
    if credentials is not None:
        return await get_current_user(credentials, db), None
    return None, await get_acceso_actual(request, db)


async def legajo_autorizado(db, legajo_id, usuario, contexto):
    legajo = await db.get(Legajo, legajo_id)
    if legajo is None:
        raise HTTPException(404, "No se encontró el legajo")
    autorizado = usuario is not None and (
        usuario.rol == "coordinador" or (usuario.rol == "estudiante" and legajo.usuario_id == usuario.id))
    if contexto is not None:
        autorizado = contexto["tipo"] == "SEGUIMIENTO" and contexto["legajo_id"] == legajo.id
    if not autorizado:
        raise HTTPException(403, "No tenés permiso para consultar documentos de este legajo")
    return legajo


@router.get("/legajos/{legajo_id}/documentos", response_model=list[DocumentoResponse])
async def consultar_documentos(
    legajo_id: uuid.UUID, request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
):
    usuario, contexto = await identidad_lectora(request, credentials, db)
    await legajo_autorizado(db, legajo_id, usuario, contexto)
    return await listar_documentos(db, legajo_id)


@router.patch("/legajos/{legajo_id}/documentos/{documento_id}", response_model=DocumentoResponse)
async def revisar(
    legajo_id: uuid.UUID, documento_id: uuid.UUID, datos: RevisarDocumentoRequest,
    usuario: Usuario = Depends(require_role("coordinador")),
    db: AsyncSession = Depends(get_db),
):
    return await revisar_documento(db, legajo_id, documento_id, datos.accion, datos.motivo, usuario.email)


@router.get("/documentos/{documento_id}/download")
async def descargar_documento(
    documento_id: uuid.UUID, request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
):
    usuario, contexto = await identidad_lectora(request, credentials, db)
    documento = await db.get(Documento, documento_id)
    if documento is None:
        raise HTTPException(404, "No se encontró el documento")
    await legajo_autorizado(db, documento.legajo_id, usuario, contexto)
    documento, ruta_archivo = await obtener_documento_para_descarga(db, documento_id)
    return FileResponse(path=ruta_archivo, media_type="application/pdf", filename=documento.nombre_original)
