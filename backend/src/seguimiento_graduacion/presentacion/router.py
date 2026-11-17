from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.autenticacion.aplicacion.seguridad import bearer_scheme, get_current_user
from src.autenticacion.infraestructura.modelos import User
from src.carga_academica.aplicacion.acceso import obtener_acceso_vigente
from src.db.session import get_db
from src.inscripcion.application.acceso_propietario import obtener_legajo_por_token
from src.inscripcion.infrastructure.models import Legajo
from src.seguimiento_graduacion.infraestructura.modelos import TrabajoFinal
from src.seguimiento_graduacion.presentacion.esquemas import (
    ActualizarTrabajoFinal,
    DatosTrabajoFinal,
    TrabajoFinalRespuesta,
)
from src.shared.auditoria.servicio import registrar_evento_auditoria
from src.shared.autorizacion.permisos import requerir_roles
from src.shared.http.ruta_api import ErrorRespuesta, RutaAPI

router = APIRouter(
    prefix="/api/v1",
    tags=["seguimiento-graduacion"],
    route_class=RutaAPI,
    responses={
        401: {"model": ErrorRespuesta, "description": "Autenticación inválida o ausente"},
        403: {"model": ErrorRespuesta, "description": "Permiso denegado"},
        404: {"model": ErrorRespuesta, "description": "Recurso inexistente"},
        422: {"model": ErrorRespuesta, "description": "Datos inválidos"},
    },
)


def exigir_cpr(
    solicitud: Request,
    credenciales: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_db),
) -> User:
    legajo_actor = None
    acceso_docente = None
    try:
        usuario = get_current_user(credenciales, session)
    except HTTPException as error:
        if error.status_code != status.HTTP_401_UNAUTHORIZED or credenciales is None:
            raise
        legajo_actor = obtener_legajo_por_token(session, credenciales.credentials)
        if legajo_actor is None:
            acceso_docente = obtener_acceso_vigente(session, credenciales.credentials)
            if acceso_docente is None:
                raise
        usuario = None

    if usuario is None or usuario.role != "CPR":
        try:
            id_recurso = str(UUID(solicitud.path_params["id"]))
        except ValueError:
            id_recurso = None
        registrar_evento_auditoria(
            session,
            accion="trabajo_final_acceso_denegado",
            tipo_recurso="trabajo_final",
            id_actor=usuario.id if usuario is not None else None,
            rol_actor=(
                usuario.role if usuario is not None
                else "DOCENTE" if acceso_docente is not None else "ASPIRANTE"
            ),
            id_recurso=id_recurso if solicitud.method == "PATCH" else None,
            detalles={
                "metodo": solicitud.method,
                "legajo_id": id_recurso if solicitud.method == "POST" else None,
                "legajo_actor_id": str(legajo_actor.id) if legajo_actor is not None else None,
                "seminario_actor_id": (
                    str(acceso_docente.seminario_id) if acceso_docente is not None else None
                ),
            },
        )
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo CPR puede crear o modificar trabajos finales",
        )
    return usuario


@router.post(
    "/legajos/{id}/trabajo-final",
    response_model=TrabajoFinalRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def crear_trabajo_final(
    id: UUID,
    datos: DatosTrabajoFinal,
    session: Session = Depends(get_db),
    usuario: User = Depends(exigir_cpr),
) -> TrabajoFinal:
    if session.get(Legajo, id) is None:
        raise HTTPException(status_code=404, detail="No se encontró el legajo solicitado")

    trabajo = TrabajoFinal(legajo_id=id, **datos.model_dump())
    session.add(trabajo)
    session.flush()
    registrar_evento_auditoria(
        session,
        accion="trabajo_final_creado",
        tipo_recurso="trabajo_final",
        id_actor=usuario.id,
        rol_actor=usuario.role,
        id_recurso=trabajo.id,
        detalles={"legajo_id": str(id)},
    )
    session.commit()
    session.refresh(trabajo)
    return trabajo


@router.patch("/trabajos-finales/{id}", response_model=TrabajoFinalRespuesta)
def modificar_trabajo_final(
    id: UUID,
    datos: ActualizarTrabajoFinal,
    session: Session = Depends(get_db),
    usuario: User = Depends(exigir_cpr),
) -> TrabajoFinal:
    trabajo = session.get(TrabajoFinal, id)
    if trabajo is None:
        raise HTTPException(status_code=404, detail="No se encontró el trabajo final solicitado")

    cambios = datos.model_dump(exclude_unset=True)
    for campo, valor in cambios.items():
        setattr(trabajo, campo, valor)
    registrar_evento_auditoria(
        session,
        accion="trabajo_final_modificado",
        tipo_recurso="trabajo_final",
        id_actor=usuario.id,
        rol_actor=usuario.role,
        id_recurso=trabajo.id,
        detalles={"legajo_id": str(trabajo.legajo_id), "campos": sorted(cambios)},
    )
    session.commit()
    session.refresh(trabajo)
    return trabajo


@router.get("/legajos/{id}/trabajo-final", response_model=list[TrabajoFinalRespuesta])
def listar_trabajos_finales(
    id: UUID,
    session: Session = Depends(get_db),
    usuario: User = Depends(requerir_roles("CPR", "COORDINADOR")),
) -> list[TrabajoFinal]:
    if session.get(Legajo, id) is None:
        raise HTTPException(status_code=404, detail="No se encontró el legajo solicitado")
    return list(
        session.scalars(
            select(TrabajoFinal)
            .where(TrabajoFinal.legajo_id == id)
            .order_by(TrabajoFinal.fecha_aprobacion_cpr, TrabajoFinal.id)
        )
    )
