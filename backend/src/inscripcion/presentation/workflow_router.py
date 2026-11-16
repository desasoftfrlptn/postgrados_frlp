from http import HTTPStatus
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.authentication.infrastructure.models import User
from src.db.session import get_db
from src.inscripcion.application.workflow_estados import (
    LegajoNoEncontrado,
    TokenCorreccionInvalido,
    TransicionNoPermitida,
    corregir_legajo,
    transicionar_legajo,
)
from src.inscripcion.infrastructure.email import enviar_email_observacion
from src.inscripcion.presentation.schemas import (
    CorreccionLegajoRequest,
    LegajoEstadoResponse,
    TransicionLegajoRequest,
)
from src.shared.autorizacion.permisos import requerir_roles

router = APIRouter(prefix="/api/v1/legajos", tags=["legajos-workflow"])


@router.post("/{legajo_id}/transiciones", response_model=LegajoEstadoResponse)
def cambiar_estado_legajo(
    legajo_id: UUID,
    solicitud: TransicionLegajoRequest,
    tareas_fondo: BackgroundTasks,
    session: Session = Depends(get_db),
    usuario: User = Depends(requerir_roles("COORDINADOR")),
) -> LegajoEstadoResponse:
    try:
        resultado = transicionar_legajo(
            session,
            legajo_id=legajo_id,
            usuario=usuario,
            accion=solicitud.accion,
            comentario=solicitud.comentario,
        )
    except LegajoNoEncontrado as error:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="No se encontró el legajo solicitado",
        ) from error
    except TransicionNoPermitida as error:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="La transición no está permitida para el estado actual del legajo",
        ) from error

    legajo = resultado.legajo
    if resultado.token_correccion is not None:
        tareas_fondo.add_task(
            enviar_email_observacion,
            legajo.email,
            legajo.nombre,
            solicitud.comentario or "",
            str(legajo.id),
            resultado.token_correccion,
        )

    mensajes = {
        "REVISAR": "El legajo pasó a En Revisión",
        "OBSERVAR": "El legajo fue observado",
        "APROBAR": "El legajo fue aprobado",
        "RECHAZAR": "El legajo fue rechazado",
        "MATRICULAR": "El legajo fue matriculado",
        "DAR_DE_BAJA": "El legajo fue dado de baja",
    }
    return LegajoEstadoResponse(
        id=str(legajo.id),
        estado=legajo.estado,
        numero_legajo=legajo.numero_legajo,
        mensaje=mensajes[solicitud.accion],
    )


@router.post(
    "/{legajo_id}/correccion",
    response_model=LegajoEstadoResponse,
)
def corregir_estado_legajo(
    legajo_id: UUID,
    solicitud: CorreccionLegajoRequest,
    session: Session = Depends(get_db),
) -> LegajoEstadoResponse:
    try:
        legajo = corregir_legajo(
            session,
            legajo_id=legajo_id,
            token=solicitud.token,
        )
    except LegajoNoEncontrado as error:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="No se encontró el legajo solicitado",
        ) from error
    except (TokenCorreccionInvalido, UnicodeEncodeError) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de corrección es inválido o venció",
        ) from error

    return LegajoEstadoResponse(
        id=str(legajo.id),
        estado=legajo.estado,
        numero_legajo=legajo.numero_legajo,
        mensaje="El legajo volvió a Pendiente",
    )