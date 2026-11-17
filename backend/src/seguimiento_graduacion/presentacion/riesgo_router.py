from datetime import date, datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.autenticacion.infraestructura.modelos import User
from src.db.session import get_db
from src.inscripcion.infrastructure.models import Cohorte, Legajo
from src.seguimiento_graduacion.aplicacion.alertas import enviar_alertas_pendientes
from src.seguimiento_graduacion.aplicacion.semaforos import fecha_local, recalcular_semaforos
from src.seguimiento_graduacion.infraestructura.modelos import (
    AsignacionCoordinador,
    AlertaRiesgo,
    AvanceTesis,
    EntregaAlerta,
    PlanGraduacion,
    SemaforoGraduacion,
)
from src.seguimiento_graduacion.presentacion.esquemas import (
    AsignacionRespuesta,
    AvanceRespuesta,
    ConfirmarPlan,
    CrearAsignacion,
    CrearAvance,
    MarcarVerde,
    PlanRespuesta,
    RecalculoRespuesta,
    RiesgoRespuesta,
    SemaforoRespuesta,
)
from src.seguimiento_graduacion.presentacion.router import exigir_cpr
from src.shared.auditoria.servicio import registrar_evento_auditoria
from src.shared.autorizacion.permisos import requerir_roles
from src.shared.http.excel import generar_excel
from src.shared.http.ruta_api import ErrorRespuesta, RutaAPI

router = APIRouter(
    prefix="/api/v1",
    tags=["seguimiento-graduacion"],
    route_class=RutaAPI,
    responses={
        401: {"model": ErrorRespuesta, "description": "Autenticación inválida o ausente"},
        403: {"model": ErrorRespuesta, "description": "Permiso denegado"},
        404: {"model": ErrorRespuesta, "description": "Recurso inexistente"},
        409: {"model": ErrorRespuesta, "description": "Conflicto"},
        422: {"model": ErrorRespuesta, "description": "Datos inválidos"},
    },
)


@router.post("/graduacion/planes/confirmar", response_model=PlanRespuesta)
def confirmar_plan(
    datos: ConfirmarPlan,
    session: Session = Depends(get_db),
    usuario: User = Depends(requerir_roles("COORDINADOR")),
) -> PlanGraduacion:
    cohorte = session.scalar(select(Cohorte).where(Cohorte.id == datos.cohorte_id).with_for_update())
    if cohorte is None:
        raise HTTPException(status_code=404, detail="No se encontró la cohorte")
    plan = session.scalar(select(PlanGraduacion).where(
        PlanGraduacion.cohorte_id == datos.cohorte_id,
        PlanGraduacion.carrera == datos.carrera,
    ).with_for_update())
    if plan is None:
        plan = PlanGraduacion(
            cohorte_id=datos.cohorte_id, carrera=datos.carrera,
            confirmado=True, requiere_recalculo=True,
        )
        session.add(plan)
    else:
        if not plan.confirmado:
            plan.requiere_recalculo = True
        plan.confirmado = True
    registrar_evento_auditoria(
        session, accion="confirmar_plan_graduacion", tipo_recurso="cohorte",
        id_recurso=datos.cohorte_id, id_actor=usuario.id, rol_actor=usuario.role,
        detalles={"carrera": datos.carrera},
    )
    session.commit()
    session.refresh(plan)
    return plan


@router.get("/graduacion/planes", response_model=list[PlanRespuesta])
def consultar_planes(
    cohorte_id: UUID | None = None,
    session: Session = Depends(get_db),
    _: User = Depends(requerir_roles("COORDINADOR")),
) -> list[PlanGraduacion]:
    consulta = select(PlanGraduacion).order_by(PlanGraduacion.carrera)
    if cohorte_id is not None:
        consulta = consulta.where(PlanGraduacion.cohorte_id == cohorte_id)
    return list(session.scalars(consulta))


@router.post("/graduacion/asignaciones", response_model=AsignacionRespuesta, status_code=201)
def asignar_coordinador(
    datos: CrearAsignacion,
    session: Session = Depends(get_db),
    usuario: User = Depends(requerir_roles("ADMIN", "COORDINADOR")),
) -> AsignacionCoordinador:
    coordinador = session.scalar(select(User).where(User.id == datos.usuario_id).with_for_update())
    if coordinador is None or coordinador.role != "COORDINADOR" or not coordinador.is_active:
        raise HTTPException(status_code=422, detail="Debe indicar un coordinador activo")
    existente = session.scalar(select(AsignacionCoordinador.id).where(
        AsignacionCoordinador.usuario_id == datos.usuario_id,
        AsignacionCoordinador.carrera == datos.carrera,
    ))
    if existente is not None:
        raise HTTPException(status_code=409, detail="El coordinador ya está asignado a esa carrera")
    asignacion = AsignacionCoordinador(carrera=datos.carrera, usuario_id=datos.usuario_id)
    session.add(asignacion)
    registrar_evento_auditoria(
        session, accion="asignar_coordinador_carrera", tipo_recurso="usuario",
        id_recurso=datos.usuario_id, id_actor=usuario.id, rol_actor=usuario.role,
        detalles={"carrera": datos.carrera},
    )
    session.commit()
    session.refresh(asignacion)
    return asignacion


@router.get("/graduacion/asignaciones", response_model=list[AsignacionRespuesta])
def listar_asignaciones(
    session: Session = Depends(get_db),
    _: User = Depends(requerir_roles("ADMIN", "COORDINADOR")),
) -> list[AsignacionCoordinador]:
    return list(session.scalars(
        select(AsignacionCoordinador).order_by(AsignacionCoordinador.carrera, AsignacionCoordinador.usuario_id)
    ))


@router.delete("/graduacion/asignaciones/{id}", status_code=204)
def quitar_asignacion(
    id: UUID,
    session: Session = Depends(get_db),
    usuario: User = Depends(requerir_roles("ADMIN", "COORDINADOR")),
) -> Response:
    asignacion = session.get(AsignacionCoordinador, id)
    if asignacion is None:
        raise HTTPException(status_code=404, detail="No se encontró la asignación")
    registrar_evento_auditoria(
        session, accion="quitar_coordinador_carrera", tipo_recurso="usuario",
        id_recurso=asignacion.usuario_id, id_actor=usuario.id, rol_actor=usuario.role,
        detalles={"carrera": asignacion.carrera},
    )
    session.delete(asignacion)
    session.commit()
    return Response(status_code=204)


@router.post("/legajos/{id}/avances-tesis", response_model=AvanceRespuesta, status_code=201)
def registrar_avance_tesis(
    id: UUID,
    datos: CrearAvance,
    session: Session = Depends(get_db),
    usuario: User = Depends(exigir_cpr),
) -> AvanceTesis:
    legajo = session.get(Legajo, id)
    if legajo is None:
        raise HTTPException(status_code=404, detail="No se encontró el legajo")
    if datos.carrera not in legajo.carreras or datos.fecha < fecha_local(legajo.fecha_inscripcion):
        raise HTTPException(status_code=422, detail="La carrera o fecha no corresponde al legajo")
    avance = AvanceTesis(legajo_id=id, **datos.model_dump())
    session.add(avance)
    session.flush()
    registrar_evento_auditoria(
        session, accion="registrar_avance_tesis", tipo_recurso="legajo", id_recurso=id,
        id_actor=usuario.id, rol_actor=usuario.role,
        detalles={"avance_id": str(avance.id), "carrera": datos.carrera, "fecha": datos.fecha.isoformat()},
    )
    session.commit()
    session.refresh(avance)
    return avance


def _respuesta_semaforo(
    legajo: Legajo, carrera: str, plan: PlanGraduacion | None, semaforo: SemaforoGraduacion | None,
) -> SemaforoRespuesta:
    if plan is None or not plan.confirmado:
        return SemaforoRespuesta(
            legajo_id=legajo.id, carrera=carrera, estado="SIN_DATOS",
            motivo="El plan de seminarios no está confirmado",
        )
    if semaforo is None or plan.requiere_recalculo:
        return SemaforoRespuesta(
            legajo_id=legajo.id, carrera=carrera, estado="SIN_EVALUAR",
            motivo="El semáforo todavía no fue recalculado",
        )
    hoy = date.today()
    return SemaforoRespuesta(
        legajo_id=legajo.id, carrera=carrera, estado=semaforo.estado,
        motivo=semaforo.motivo, seminarios_adeudados=semaforo.seminarios_adeudados,
        fecha_ultimo_avance=semaforo.fecha_ultimo_avance,
        dias_sin_avance=max(0, (hoy - semaforo.fecha_ultimo_avance).days),
        fecha_cambio=semaforo.fecha_cambio,
        dias_en_rojo=max(0, (hoy - fecha_local(semaforo.fecha_cambio)).days) if semaforo.estado == "ROJO" else None,
        recalculado_en=semaforo.recalculado_en,
    )


@router.get("/legajos/{id}/semaforo", response_model=list[SemaforoRespuesta])
def consultar_semaforo(
    id: UUID,
    session: Session = Depends(get_db),
    _: User = Depends(requerir_roles("COORDINADOR")),
) -> list[SemaforoRespuesta]:
    legajo = session.get(Legajo, id)
    if legajo is None:
        raise HTTPException(status_code=404, detail="No se encontró el legajo")
    planes = {plan.carrera: plan for plan in session.scalars(
        select(PlanGraduacion).where(PlanGraduacion.cohorte_id == legajo.cohorte_id)
    )}
    semaforos = {semaforo.carrera: semaforo for semaforo in session.scalars(
        select(SemaforoGraduacion).where(SemaforoGraduacion.legajo_id == id)
    )}
    return [_respuesta_semaforo(legajo, carrera, planes.get(carrera), semaforos.get(carrera)) for carrera in legajo.carreras]


@router.patch("/legajos/{id}/semaforo", response_model=SemaforoRespuesta)
def marcar_semaforo_verde(
    id: UUID,
    datos: MarcarVerde,
    session: Session = Depends(get_db),
    usuario: User = Depends(requerir_roles("COORDINADOR")),
) -> SemaforoRespuesta:
    legajo = session.scalar(select(Legajo).where(Legajo.id == id).with_for_update())
    if legajo is None:
        raise HTTPException(status_code=404, detail="No se encontró el legajo")
    if datos.carrera not in legajo.carreras:
        raise HTTPException(status_code=422, detail="La carrera no corresponde al legajo")
    plan = session.scalar(select(PlanGraduacion).where(
        PlanGraduacion.cohorte_id == legajo.cohorte_id, PlanGraduacion.carrera == datos.carrera,
    ))
    semaforo = session.scalar(select(SemaforoGraduacion).where(
        SemaforoGraduacion.legajo_id == id, SemaforoGraduacion.carrera == datos.carrera,
    ))
    if plan is None or not plan.confirmado or plan.requiere_recalculo or semaforo is None:
        raise HTTPException(status_code=409, detail="Se requiere un plan confirmado y un semáforo calculado")
    anterior = semaforo.estado
    if anterior != "VERDE":
        semaforo.estado = "VERDE"
        semaforo.motivo = "Asignado manualmente por coordinación"
        semaforo.fecha_cambio = datetime.now(timezone.utc)
        registrar_evento_auditoria(
            session, accion="semaforo_cambiado", tipo_recurso="legajo", id_recurso=id,
            id_actor=usuario.id, rol_actor=usuario.role,
            detalles={"carrera": datos.carrera, "estado_anterior": anterior, "estado_nuevo": "VERDE"},
        )
        session.commit()
    return _respuesta_semaforo(legajo, datos.carrera, plan, semaforo)


def _listado_riesgo(
    session: Session, *, desplazamiento: int = 0, limite: int | None = None,
) -> list[RiesgoRespuesta]:
    consulta = (
        select(SemaforoGraduacion, Legajo)
        .join(Legajo, Legajo.id == SemaforoGraduacion.legajo_id)
        .join(PlanGraduacion, (PlanGraduacion.cohorte_id == Legajo.cohorte_id) & (PlanGraduacion.carrera == SemaforoGraduacion.carrera))
        .where(
            SemaforoGraduacion.estado == "ROJO",
            Legajo.estado == "Activo",
            PlanGraduacion.confirmado.is_(True),
            PlanGraduacion.requiere_recalculo.is_(False),
        )
        .order_by(SemaforoGraduacion.fecha_cambio, SemaforoGraduacion.id)
    )
    if limite is not None:
        consulta = consulta.offset(desplazamiento).limit(limite)
    registros = session.execute(consulta)
    hoy = date.today()
    return [
        RiesgoRespuesta(
            legajo_id=legajo.id, nombre=legajo.nombre, apellido=legajo.apellido,
            carrera=semaforo.carrera, fecha_inscripcion=legajo.fecha_inscripcion,
            seminarios_adeudados=semaforo.seminarios_adeudados,
            dias_sin_avance=max(0, (hoy - semaforo.fecha_ultimo_avance).days),
            dias_en_rojo=max(0, (hoy - fecha_local(semaforo.fecha_cambio)).days),
            motivo=semaforo.motivo,
        )
        for semaforo, legajo in registros
    ]


@router.get("/graduacion/en-riesgo", response_model=list[RiesgoRespuesta])
def listar_en_riesgo(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=500),
    session: Session = Depends(get_db),
    _: User = Depends(requerir_roles("COORDINADOR")),
) -> list[RiesgoRespuesta]:
    return _listado_riesgo(session, desplazamiento=(page - 1) * limit, limite=limit)


@router.get("/graduacion/en-riesgo/exportar")
def exportar_en_riesgo(
    session: Session = Depends(get_db),
    _: User = Depends(requerir_roles("COORDINADOR")),
) -> StreamingResponse:
    registros = _listado_riesgo(session)
    filas = [["Nombre", "Apellido", "Carrera", "Fecha inscripción", "Seminarios adeudados", "Días sin avance", "Días en rojo", "Motivo"]]
    filas.extend([
        registro.nombre, registro.apellido, registro.carrera, registro.fecha_inscripcion.date().isoformat(),
        str(registro.seminarios_adeudados), str(registro.dias_sin_avance), str(registro.dias_en_rojo), registro.motivo,
    ] for registro in registros)
    return StreamingResponse(
        generar_excel(filas, "En riesgo"),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="estudiantes-en-riesgo.xlsx"', "Cache-Control": "private, no-store"},
    )


@router.post("/graduacion/recalcular", response_model=RecalculoRespuesta)
def ejecutar_recalculo(
    session: Session = Depends(get_db),
    _: User = Depends(requerir_roles("COORDINADOR")),
) -> RecalculoRespuesta:
    cambios = recalcular_semaforos(session)
    enviados = enviar_alertas_pendientes(session)
    pendientes_sin_destinatario = session.scalar(
        select(func.count()).select_from(AlertaRiesgo).where(
            AlertaRiesgo.destinatarios_definidos.is_(False)
        )
    )
    entregas_pendientes = session.scalar(
        select(func.count()).select_from(EntregaAlerta).where(EntregaAlerta.enviado_en.is_(None))
    )
    if pendientes_sin_destinatario is None or entregas_pendientes is None:
        raise RuntimeError("No se pudo contar las alertas pendientes")
    return RecalculoRespuesta(
        cambios=cambios,
        alertas_enviadas=enviados,
        alertas_pendientes=pendientes_sin_destinatario + entregas_pendientes,
    )
