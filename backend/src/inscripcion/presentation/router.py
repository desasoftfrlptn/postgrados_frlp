from http import HTTPStatus
import json
import logging
from json import JSONDecodeError
from pathlib import Path
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.authentication.infrastructure.models import User
from src.core.config import settings
from src.db.session import get_db
from src.inscripcion.application.inscribir_aspirante import (
    DocumentoValidado,
    InscripcionDuplicada,
    InscripcionNoDisponible,
    inscribir_aspirante,
)
from src.inscripcion.infrastructure.email import enviar_confirmacion_inscripcion
from src.inscripcion.infrastructure.models import DocumentoInscripcion
from src.inscripcion.presentation.schemas import InscripcionCreate, InscripcionResponse
from src.shared.autorizacion.permisos import requerir_roles
from src.shared.limite_solicitudes.servicio import dependencia_limite_solicitudes

router = APIRouter(prefix="/api/v1/inscripciones", tags=["inscripciones"])
documentos_router = APIRouter(prefix="/api/v1/documentos", tags=["documentos"])
_LOGGER = logging.getLogger(__name__)
_limite_inscripciones = dependencia_limite_solicitudes(
    limite=10,
    segundos_ventana=3600,
    alcance="inscripcion",
)


@documentos_router.get("/{documento_id}/download")
def descargar_documento(
    documento_id: UUID,
    sesion: Session = Depends(get_db),
    usuario: User = Depends(requerir_roles("COORDINADOR")),
) -> FileResponse:
    documento = sesion.scalar(
        select(DocumentoInscripcion).where(DocumentoInscripcion.id == documento_id)
    )
    if documento is None:
        _LOGGER.warning("Documento no disponible documento_id=%s", documento_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontro el documento solicitado",
        )

    try:
        raiz_almacenamiento = settings.storage_path.resolve()
        ruta_documento = (
            raiz_almacenamiento / Path(documento.path_storage)
        ).resolve()
        ruta_documento.relative_to(raiz_almacenamiento)
    except (OSError, RuntimeError, ValueError):
        _LOGGER.warning("Ruta privada invalida documento_id=%s", documento_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontro el documento solicitado",
        ) from None

    if not ruta_documento.is_file():
        _LOGGER.warning("Archivo privado ausente documento_id=%s", documento_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontro el documento solicitado",
        )

    _LOGGER.info(
        "Acceso a documento permitido documento_id=%s usuario_id=%s",
        documento_id,
        usuario.id,
    )
    return FileResponse(
        ruta_documento,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{documento.id}.pdf"',
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )

TIPOS_DOCUMENTO = {
    "archivo_preinscripcion": ("FORM_INSCRIPCION", True),
    "archivo_dni": ("DNI", True),
    "archivo_titulo": ("TITULO", True),
    "archivo_partida": ("PARTIDA", True),
    "archivo_cuit": ("CUIT", True),
    "archivo_posgrado": ("TITULO_POSGRADO", False),
    "archivo_beca": ("FORM_BECA", False),
}


async def _validar_documento(
    archivo: UploadFile | None,
    tipo: str,
    requerido: bool,
) -> DocumentoValidado | None:
    if archivo is None:
        if requerido:
            raise HTTPException(
                status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
                detail=f"Falta adjuntar el documento obligatorio: {tipo}",
            )
        return None

    max_bytes = settings.max_file_size_mb * 1024 * 1024
    contenido = await archivo.read(max_bytes + 1)
    if len(contenido) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El documento {tipo} supera el máximo de {settings.max_file_size_mb} MB",
        )
    if (archivo.content_type or "").split(";", maxsplit=1)[0].strip().lower() != "application/pdf":
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail=f"El documento {tipo} debe tener formato PDF",
        )
    if not contenido.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail=f"El contenido del documento {tipo} no es un PDF válido",
        )
    return DocumentoValidado(tipo=tipo, contenido=contenido)


@router.post(
    "",
    response_model=InscripcionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_limite_inscripciones)],
)
async def crear_inscripcion(
    tareas_fondo: BackgroundTasks,
    carreras: str = Form(...),
    dni: str = Form(...),
    nombre: str = Form(...),
    apellido: str = Form(...),
    nacionalidad: str = Form(...),
    email: str = Form(...),
    email_alternativo: str = Form(...),
    telefono_movil: str = Form(...),
    domicilio: str = Form(...),
    ciudad: str = Form(...),
    provincia: str = Form(...),
    pais: str = Form(...),
    titulo_grado: str = Form(...),
    como_conocio: str = Form(...),
    motivacion: str = Form(...),
    telefono_fijo: str | None = Form(default=None),
    titulo_posgrado: str | None = Form(default=None),
    solicita_beca: bool = Form(default=False),
    tipo_beca: str | None = Form(default=None),
    cohorte_id: str | None = Form(default=None),
    archivo_preinscripcion: UploadFile | None = File(default=None),
    archivo_dni: UploadFile | None = File(default=None),
    archivo_titulo: UploadFile | None = File(default=None),
    archivo_partida: UploadFile | None = File(default=None),
    archivo_cuit: UploadFile | None = File(default=None),
    archivo_posgrado: UploadFile | None = File(default=None),
    archivo_beca: UploadFile | None = File(default=None),
    session: Session = Depends(get_db),
) -> InscripcionResponse:
    try:
        carreras_data = json.loads(carreras)
        if not isinstance(carreras_data, list):
            raise ValueError("La selección de carreras debe ser una lista")
        data = InscripcionCreate.model_validate(
            {
                "carreras": carreras_data,
                "dni": dni,
                "nombre": nombre,
                "apellido": apellido,
                "nacionalidad": nacionalidad,
                "email": email,
                "email_alternativo": email_alternativo,
                "telefono_movil": telefono_movil,
                "telefono_fijo": telefono_fijo,
                "domicilio": domicilio,
                "ciudad": ciudad,
                "provincia": provincia,
                "pais": pais,
                "titulo_grado": titulo_grado,
                "titulo_posgrado": titulo_posgrado,
                "como_conocio": como_conocio,
                "motivacion": motivacion,
                "solicita_beca": solicita_beca,
                "tipo_beca": tipo_beca,
                "cohorte_id": cohorte_id,
            }
        )
    except JSONDecodeError as error:
        raise HTTPException(
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            detail="La selección de carreras no tiene un formato válido",
        ) from error
    except ValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error.errors(include_url=False, include_context=False),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    uploads = {
        "archivo_preinscripcion": archivo_preinscripcion,
        "archivo_dni": archivo_dni,
        "archivo_titulo": archivo_titulo,
        "archivo_partida": archivo_partida,
        "archivo_cuit": archivo_cuit,
        "archivo_posgrado": archivo_posgrado,
        "archivo_beca": archivo_beca,
    }
    documentos: list[DocumentoValidado] = []
    for field, (tipo, required) in TIPOS_DOCUMENTO.items():
        is_required = required or (
            field == "archivo_posgrado" and bool(data.titulo_posgrado)
        ) or (field == "archivo_beca" and data.solicita_beca)
        documento = await _validar_documento(uploads[field], tipo, is_required)
        if documento is not None:
            documentos.append(documento)

    try:
        legajo = inscribir_aspirante(session, data, documentos)
    except InscripcionNoDisponible as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "La cohorte indicada no existe o no tiene inscripción abierta"
                if data.cohorte_id is not None
                else "No hay una cohorte con inscripción abierta"
            ),
        ) from error
    except InscripcionDuplicada as error:
        messages = {
            "dni": "Ya existe una preinscripción con este DNI para la cohorte actual",
            "email": "Ya existe una preinscripción con este email para la cohorte actual",
            "dni o email": "Ya existe una preinscripción con este DNI o email para la cohorte actual",
        }
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=messages[error.field],
        ) from error

    tareas_fondo.add_task(
        enviar_confirmacion_inscripcion,
        str(data.email),
        data.nombre,
        str(legajo.id),
    )
    return InscripcionResponse(
        codigo_seguimiento=str(legajo.id),
        estado=legajo.estado,
        mensaje="La inscripción fue recibida correctamente. Enviaremos una confirmación a tu email.",
    )
