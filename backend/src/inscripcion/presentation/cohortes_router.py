from datetime import date
from http import HTTPStatus
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.authentication.infrastructure.models import User
from src.db.session import get_db
from src.inscripcion.infrastructure.models import Cohorte
from src.inscripcion.presentation.schemas import (
    CohorteCreate,
    CohorteInscripcionUpdate,
    CohortePublicaResponse,
    CohorteResponse,
    ProximaAperturaResponse,
)
from src.shared.autorizacion.permisos import requerir_roles

router = APIRouter(prefix="/api/v1/cohortes", tags=["cohortes"])


@router.get("", response_model=list[CohortePublicaResponse])
def listar_cohortes_abiertas(
    session: Session = Depends(get_db),
) -> list[Cohorte]:
    return list(
        session.scalars(
            select(Cohorte)
            .where(Cohorte.inscripcion_abierta.is_(True))
            .order_by(Cohorte.anio.desc())
        )
    )


@router.get("/proxima-apertura", response_model=ProximaAperturaResponse)
def consultar_proxima_apertura(
    session: Session = Depends(get_db),
) -> dict[str, date]:
    fecha = session.scalar(
        select(Cohorte.fecha_proxima_apertura)
        .where(
            Cohorte.inscripcion_abierta.is_(False),
            Cohorte.fecha_proxima_apertura >= date.today(),
        )
        .order_by(Cohorte.fecha_proxima_apertura)
        .limit(1)
    )
    if fecha is None:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="No hay una próxima fecha de apertura informada",
        )
    return {"fecha_proxima_apertura": fecha}


@router.get("/gestion", response_model=list[CohorteResponse])
def listar_cohortes_para_gestion(
    session: Session = Depends(get_db),
    _: User = Depends(requerir_roles("COORDINADOR")),
) -> list[Cohorte]:
    return list(session.scalars(select(Cohorte).order_by(Cohorte.anio.desc())))


@router.post(
    "",
    response_model=CohorteResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_cohorte(
    solicitud: CohorteCreate,
    session: Session = Depends(get_db),
    _: User = Depends(requerir_roles("COORDINADOR")),
) -> Cohorte:
    cohorte = Cohorte(
        anio=solicitud.anio,
        nombre=solicitud.nombre,
        fecha_inicio=solicitud.fecha_inicio,
        fecha_proxima_apertura=(
            None if solicitud.inscripcion_abierta else solicitud.fecha_proxima_apertura
        ),
        inscripcion_abierta=solicitud.inscripcion_abierta,
    )
    session.add(cohorte)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail="Ya existe una cohorte con ese año o nombre",
        ) from error
    session.refresh(cohorte)
    return cohorte


@router.patch("/{cohorte_id}/inscripcion", response_model=CohorteResponse)
def actualizar_inscripcion_cohorte(
    cohorte_id: UUID,
    solicitud: CohorteInscripcionUpdate,
    session: Session = Depends(get_db),
    _: User = Depends(requerir_roles("COORDINADOR")),
) -> Cohorte:
    cohorte = session.get(Cohorte, cohorte_id)
    if cohorte is None:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail="No se encontró la cohorte solicitada",
        )

    fecha_informada = "fecha_proxima_apertura" in solicitud.model_fields_set
    if solicitud.inscripcion_abierta:
        cohorte.fecha_proxima_apertura = None
    else:
        fecha_proxima = (
            solicitud.fecha_proxima_apertura
            if fecha_informada
            else cohorte.fecha_proxima_apertura
        )
        if cohorte.inscripcion_abierta and fecha_proxima is None:
            raise HTTPException(
                status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
                detail="Al cerrar la inscripción se debe informar la próxima fecha de apertura",
            )
        if fecha_informada:
            cohorte.fecha_proxima_apertura = solicitud.fecha_proxima_apertura

    cohorte.inscripcion_abierta = solicitud.inscripcion_abierta
    session.commit()
    session.refresh(cohorte)
    return cohorte
