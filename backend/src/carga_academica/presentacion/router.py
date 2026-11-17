from datetime import datetime, time, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from src.authentication.application.security import bearer_scheme, get_current_user
from src.authentication.infrastructure.models import User
from src.carga_academica.aplicacion.acceso import (
    crear_acceso,
    enlace_planilla,
    obtener_acceso_vigente,
)
from src.carga_academica.infraestructura.modelos import (
    AccesoDocente,
    InscripcionSeminario,
    Seminario,
)
from src.carga_academica.presentacion.esquemas import (
    CrearEnlace,
    CrearSeminario,
    EnlaceRespuesta,
    EstudianteRespuesta,
    InscribirEstudiantes,
    PlanillaRespuesta,
    SeminarioRespuesta,
)
from src.db.session import get_db
from src.inscripcion.application.acceso_propietario import obtener_legajo_por_token
from src.inscripcion.infrastructure.models import Cohorte, Legajo
from src.shared.auditoria.servicio import registrar_evento_auditoria
from src.shared.autorizacion.permisos import requerir_roles
from src.shared.http.ruta_api import ErrorRespuesta, RutaAPI

router = APIRouter(
    prefix="/api/v1/seminarios",
    tags=["seminarios"],
    route_class=RutaAPI,
    responses={
        401: {"model": ErrorRespuesta, "description": "Autenticación inválida o ausente"},
        403: {"model": ErrorRespuesta, "description": "Permiso denegado"},
        404: {"model": ErrorRespuesta, "description": "Recurso inexistente"},
        409: {"model": ErrorRespuesta, "description": "Conflicto"},
        422: {"model": ErrorRespuesta, "description": "Datos inválidos"},
    },
)
_ZONA_ARGENTINA = timezone(timedelta(hours=-3))


def _seminario(session: Session, id: UUID, *, bloquear: bool = False) -> Seminario:
    consulta = select(Seminario).where(Seminario.id == id)
    if bloquear:
        consulta = consulta.with_for_update()
    seminario = session.scalar(consulta)
    if seminario is None:
        raise HTTPException(status_code=404, detail="No se encontró el seminario")
    return seminario


def _exigir_docente(
    id: UUID,
    credencial: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_db),
) -> Seminario:
    if credencial is None:
        raise HTTPException(
            status_code=401,
            detail="Token docente ausente, inválido o vencido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    acceso = obtener_acceso_vigente(session, credencial.credentials)
    if acceso is None:
        try:
            get_current_user(credencial, session)
        except HTTPException as error:
            if error.status_code != 401:
                raise
            if obtener_legajo_por_token(session, credencial.credentials) is None:
                raise HTTPException(
                    status_code=401,
                    detail="Token docente ausente, inválido o vencido",
                    headers={"WWW-Authenticate": "Bearer"},
                ) from error
        raise HTTPException(status_code=403, detail="Este recurso requiere acceso docente")
    if acceso.seminario_id != id:
        raise HTTPException(status_code=403, detail="No tenés permisos para este seminario")
    return _seminario(session, id)


def _auditar(
    session: Session,
    usuario: User,
    seminario_id: UUID,
    accion: str,
    detalles: dict[str, object] | None = None,
) -> None:
    registrar_evento_auditoria(
        session,
        accion=accion,
        tipo_recurso="seminario",
        id_recurso=seminario_id,
        id_actor=usuario.id,
        rol_actor=usuario.role,
        detalles=detalles,
    )


@router.post("", response_model=SeminarioRespuesta, status_code=status.HTTP_201_CREATED)
def crear_seminario(
    datos: CrearSeminario,
    session: Session = Depends(get_db),
    usuario: User = Depends(requerir_roles("COORDINADOR")),
) -> Seminario:
    if session.get(Cohorte, datos.cohorte_id) is None:
        raise HTTPException(status_code=404, detail="No se encontró la cohorte")
    seminario = Seminario(**datos.model_dump())
    session.add(seminario)
    session.flush()
    _auditar(session, usuario, seminario.id, "crear_seminario")
    session.commit()
    return seminario


@router.get("", response_model=list[SeminarioRespuesta])
def listar_seminarios(
    cohorte_id: UUID | None = None,
    session: Session = Depends(get_db),
    _: User = Depends(requerir_roles("COORDINADOR")),
) -> list[Seminario]:
    consulta = select(Seminario).order_by(Seminario.nombre, Seminario.id)
    if cohorte_id is not None:
        consulta = consulta.where(Seminario.cohorte_id == cohorte_id)
    return list(session.scalars(consulta))


@router.post("/{id}/inscripciones", status_code=status.HTTP_204_NO_CONTENT)
def inscribir_estudiantes(
    id: UUID,
    datos: InscribirEstudiantes,
    session: Session = Depends(get_db),
    usuario: User = Depends(requerir_roles("COORDINADOR")),
) -> Response:
    seminario = _seminario(session, id, bloquear=True)
    ids = set(datos.legajo_ids)
    if len(ids) != len(datos.legajo_ids):
        raise HTTPException(status_code=422, detail="Hay legajos duplicados en el lote")
    legajos = list(session.scalars(select(Legajo).where(Legajo.id.in_(ids))))
    if len(legajos) != len(ids) or any(
        legajo.cohorte_id != seminario.cohorte_id or legajo.estado != "Activo"
        for legajo in legajos
    ):
        raise HTTPException(
            status_code=422,
            detail="Todos los legajos deben estar activos y pertenecer a la cohorte del seminario",
        )
    existentes = session.scalar(
        select(InscripcionSeminario.id).where(
            InscripcionSeminario.seminario_id == id,
            InscripcionSeminario.legajo_id.in_(ids),
        ).limit(1)
    )
    if existentes is not None:
        raise HTTPException(status_code=409, detail="Ya hay estudiantes inscriptos en el seminario")
    session.add_all(
        InscripcionSeminario(seminario_id=id, legajo_id=legajo_id) for legajo_id in ids
    )
    _auditar(
        session, usuario, id, "inscribir_estudiantes",
        {"legajo_ids": [str(legajo_id) for legajo_id in sorted(ids)]},
    )
    session.commit()
    return Response(status_code=204)


@router.post("/{id}/enlace", response_model=EnlaceRespuesta)
def generar_enlace(
    id: UUID,
    datos: CrearEnlace,
    response: Response,
    session: Session = Depends(get_db),
    usuario: User = Depends(requerir_roles("COORDINADOR")),
) -> EnlaceRespuesta:
    seminario = _seminario(session, id, bloquear=True)
    expira = datos.expira_en or datetime.combine(
        seminario.fecha_fin_cuatrimestre, time.max, tzinfo=_ZONA_ARGENTINA
    )
    expira = expira.astimezone(timezone.utc)
    if expira <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="La expiración debe ser futura")
    session.execute(delete(AccesoDocente).where(AccesoDocente.seminario_id == id))
    token = crear_acceso(session, id, expira)
    _auditar(session, usuario, id, "generar_enlace_docente", {"expira_en": expira.isoformat()})
    session.commit()
    response.headers["Cache-Control"] = "no-store"
    return EnlaceRespuesta(token=token, expira_en=expira, enlace=enlace_planilla(id, token))


@router.get("/{id}/estudiantes", response_model=PlanillaRespuesta)
def listar_estudiantes(
    response: Response,
    seminario: Seminario = Depends(_exigir_docente),
    session: Session = Depends(get_db),
) -> PlanillaRespuesta:
    legajos = session.scalars(
        select(Legajo)
        .join(InscripcionSeminario, InscripcionSeminario.legajo_id == Legajo.id)
        .where(InscripcionSeminario.seminario_id == seminario.id, Legajo.estado != "Baja")
        .order_by(Legajo.apellido, Legajo.nombre, Legajo.id)
    )
    response.headers["Cache-Control"] = "private, no-store"
    return PlanillaRespuesta(
        seminario=SeminarioRespuesta.model_validate(seminario),
        estudiantes=[
            EstudianteRespuesta(
                legajo_id=legajo.id,
                numero_legajo=legajo.numero_legajo,
                apellido=legajo.apellido,
                nombre=legajo.nombre,
                email=legajo.email,
                titulo_grado=legajo.titulo_grado,
            )
            for legajo in legajos
        ],
    )