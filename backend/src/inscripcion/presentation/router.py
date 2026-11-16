from http import HTTPStatus
import json
from json import JSONDecodeError
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.autenticacion.aplicacion.seguridad import requerir_roles
from src.autenticacion.infraestructura.modelos import Usuario
from src.core.config import settings
from src.db.session import get_db
from src.inscripcion.application.inscribir_aspirante import (
    DocumentoValidado,
    InscripcionDuplicada,
    InscripcionNoDisponible,
    inscribir_aspirante,
)
from src.inscripcion.infrastructure.models import DocumentoInscripcion, Legajo
from src.inscripcion.presentation.schemas import (
    DocumentoInscripcionRespuesta,
    InscripcionCreate,
    InscripcionResponse,
)

router = APIRouter(prefix="/api/v1/inscripciones", tags=["inscripciones"])
documentos_router = APIRouter(prefix="/api/v1/legajos", tags=["documentos"])


@documentos_router.get(
    "/{legajo_id}/documentos",
    response_model=list[DocumentoInscripcionRespuesta],
)
def listar_documentos_legajo(
    legajo_id: UUID,
    sesion: Session = Depends(get_db),
    _usuario: Usuario = Depends(requerir_roles("COORDINADOR")),
) -> list[DocumentoInscripcionRespuesta]:
    if sesion.get(Legajo, legajo_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontro el legajo solicitado",
        )

    documentos = sesion.scalars(
        select(DocumentoInscripcion)
        .where(DocumentoInscripcion.legajo_id == legajo_id)
        .order_by(DocumentoInscripcion.tipo, DocumentoInscripcion.id)
    ).all()
    return [
        DocumentoInscripcionRespuesta(
            id=documento.id,
            tipo=documento.tipo,
            fecha_subida=documento.fecha_subida,
        )
        for documento in documentos
    ]

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


@router.post("", response_model=InscripcionResponse, status_code=status.HTTP_201_CREATED)
async def crear_inscripcion(
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
            detail="No hay una cohorte con inscripción abierta",
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

    return InscripcionResponse(
        codigo_seguimiento=str(legajo.id),
        estado=legajo.estado,
        mensaje="La inscripción fue recibida correctamente",
    )
