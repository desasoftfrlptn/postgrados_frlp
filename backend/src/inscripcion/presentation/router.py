from http import HTTPStatus
import json
from json import JSONDecodeError
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from pydantic import ValidationError
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, load_only, selectinload

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
from src.inscripcion.infrastructure.models import DocumentoInscripcion, Legajo
from src.inscripcion.presentation.schemas import (
    Carrera,
    DocumentoBecaResumen,
    InscripcionCreate,
    InscripcionResponse,
    LegajoCoordinacionResponse,
)
from src.shared.autorizacion.permisos import requerir_roles

router = APIRouter(prefix="/api/v1/inscripciones", tags=["inscripciones"])
legajos_router = APIRouter(prefix="/api/v1/legajos", tags=["legajos"])


@legajos_router.get("", response_model=list[LegajoCoordinacionResponse])
def listar_legajos(
    estado: str | None = Query(default=None),
    cohorte_id: UUID | None = Query(default=None),
    carrera: Carrera | None = Query(default=None),
    tiene_beca: bool | None = Query(default=None),
    session: Session = Depends(get_db),
    _usuario: User = Depends(requerir_roles("COORDINADOR")),
) -> list[LegajoCoordinacionResponse]:
    consulta = select(Legajo).options(
        load_only(
            Legajo.id,
            Legajo.numero_legajo,
            Legajo.apellido,
            Legajo.nombre,
            Legajo.dni,
            Legajo.estado,
            Legajo.carreras,
            Legajo.solicita_beca,
            Legajo.tipo_beca,
        ),
        selectinload(
            Legajo.documentos.and_(DocumentoInscripcion.tipo == "FORM_BECA")
        ).load_only(DocumentoInscripcion.tipo),
    )
    if estado is not None:
        consulta = consulta.where(Legajo.estado == estado)
    if cohorte_id is not None:
        consulta = consulta.where(Legajo.cohorte_id == cohorte_id)
    if carrera is not None:
        consulta = consulta.where(
            or_(
                Legajo.carreras[0].as_string() == carrera,
                Legajo.carreras[1].as_string() == carrera,
            )
        )
    if tiene_beca is not None:
        consulta = consulta.where(Legajo.solicita_beca.is_(tiene_beca))

    legajos = session.scalars(
        consulta
        .order_by(Legajo.apellido, Legajo.nombre, Legajo.id)
    ).all()

    return [
        LegajoCoordinacionResponse(
            id=legajo.id,
            numero_legajo=legajo.numero_legajo,
            apellido=legajo.apellido,
            nombre=legajo.nombre,
            dni=legajo.dni,
            estado=legajo.estado,
            carreras=legajo.carreras,
            solicita_beca=legajo.solicita_beca,
            tipo_beca=legajo.tipo_beca,
            documento_beca=(
                DocumentoBecaResumen(tipo="FORM_BECA")
                if any(documento.tipo == "FORM_BECA" for documento in legajo.documentos)
                else None
            ),
        )
        for legajo in legajos
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
    background_tasks: BackgroundTasks,
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

    background_tasks.add_task(
        enviar_confirmacion_inscripcion,
        str(legajo.email),
        legajo.nombre,
        str(legajo.id),
    )

    return InscripcionResponse(
        codigo_seguimiento=str(legajo.id),
        estado=legajo.estado,
        mensaje="La inscripción fue recibida correctamente. Enviamos una confirmación a tu email",
    )
