from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from src.autenticacion.aplicacion.seguridad import bearer_scheme, get_current_user
from src.autenticacion.infraestructura.modelos import User
from src.carga_academica.aplicacion.acceso import (
    crear_acceso,
    enlace_planilla,
    obtener_acceso_vigente,
)
from src.carga_academica.dominio.reglas import calcular_condicion, calcular_porcentaje_asistencia
from src.carga_academica.infraestructura.modelos import (
    AccesoDocente,
    AsistenciaSeminario,
    ClaseSeminario,
    InscripcionSeminario,
    Seminario,
)
from src.carga_academica.presentacion.esquemas import (
    ActualizarPlanSeminario,
    ActualizarFechaLimite,
    CeldaAsistencia,
    CambiarFechaClase,
    ClaseRespuesta,
    CrearClase,
    CrearEnlace,
    CrearSeminario,
    EnlaceRespuesta,
    EstudianteRespuesta,
    InscribirEstudiantes,
    LoteAsistencias,
    LoteNotas,
    PlanillaRespuesta,
    ResultadoSeminario,
    SeminarioRespuesta,
)
from src.db.session import get_db
from src.inscripcion.application.acceso_propietario import obtener_legajo_por_token
from src.inscripcion.infrastructure.models import Cohorte, Legajo
from src.inscripcion.presentation.acceso_legajo import autorizar_dueno_o_coordinador, exigir_credencial
from src.seguimiento_graduacion.infraestructura.modelos import PlanGraduacion
from src.shared.auditoria.servicio import registrar_evento_auditoria
from src.shared.autorizacion.permisos import requerir_roles
from src.shared.http.ruta_api import ErrorRespuesta, RutaAPI
from src.carga_academica.infraestructura.excel import (
    ExcelInvalidoError,
    exportar_planilla_excel,
    importar_notas_excel,
)

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
router_legajos = APIRouter(prefix="/api/v1/legajos", tags=["carga-academica"], route_class=RutaAPI)
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
    seminario = _seminario(session, id, bloquear=True)
    if obtener_acceso_vigente(session, credencial.credentials) is None:
        raise HTTPException(
            status_code=401,
            detail="Token docente ausente, inválido o vencido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return seminario


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


def _invalidar_planes(session: Session, cohorte_id: UUID, carreras: set[str]) -> None:
    if carreras:
        session.execute(
            update(PlanGraduacion)
            .where(PlanGraduacion.cohorte_id == cohorte_id, PlanGraduacion.carrera.in_(carreras))
            .values(confirmado=False, requiere_recalculo=True)
        )


def _planilla(session: Session, seminario: Seminario) -> PlanillaRespuesta:
    clases = list(session.scalars(
        select(ClaseSeminario)
        .where(ClaseSeminario.seminario_id == seminario.id)
        .order_by(ClaseSeminario.fecha, ClaseSeminario.id)
    ))
    inscripciones = list(session.execute(
        select(InscripcionSeminario, Legajo)
        .join(Legajo, Legajo.id == InscripcionSeminario.legajo_id)
        .where(InscripcionSeminario.seminario_id == seminario.id, Legajo.estado != "Baja")
        .order_by(Legajo.apellido, Legajo.nombre, Legajo.id)
    ))
    asistencias = list(session.scalars(
        select(AsistenciaSeminario)
        .join(ClaseSeminario, ClaseSeminario.id == AsistenciaSeminario.clase_id)
        .where(ClaseSeminario.seminario_id == seminario.id)
    ))
    celdas = {(item.inscripcion_id, item.clase_id): item.presente for item in asistencias}
    estudiantes = []
    for inscripcion, legajo in inscripciones:
        presentes = {
            clase.fecha for clase in clases if celdas.get((inscripcion.id, clase.id), False)
        }
        porcentaje = calcular_porcentaje_asistencia(
            [clase.fecha for clase in clases], presentes, date.today()
        )
        estudiantes.append(EstudianteRespuesta(
            legajo_id=legajo.id,
            numero_legajo=legajo.numero_legajo,
            apellido=legajo.apellido,
            nombre=legajo.nombre,
            email=legajo.email,
            titulo_grado=legajo.titulo_grado,
            asistencias=[
                CeldaAsistencia(
                    clase_id=clase.id,
                    presente=celdas.get((inscripcion.id, clase.id), False),
                ) for clase in clases
            ],
            porcentaje_asistencia=porcentaje.quantize(Decimal("0.01")),
            nota=inscripcion.nota,
            condicion=calcular_condicion(inscripcion.nota, porcentaje),
        ))
    return PlanillaRespuesta(
        seminario=SeminarioRespuesta.model_validate(seminario),
        clases=[ClaseRespuesta.model_validate(clase) for clase in clases],
        estudiantes=estudiantes,
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
    if seminario.carrera is not None and seminario.es_obligatorio:
        _invalidar_planes(session, seminario.cohorte_id, {seminario.carrera})
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


@router.patch("/{id}/plan", response_model=SeminarioRespuesta)
def actualizar_plan_seminario(
    id: UUID,
    datos: ActualizarPlanSeminario,
    session: Session = Depends(get_db),
    usuario: User = Depends(requerir_roles("COORDINADOR")),
) -> Seminario:
    seminario = _seminario(session, id, bloquear=True)
    if seminario.carrera != datos.carrera or seminario.es_obligatorio != datos.es_obligatorio:
        carreras = {datos.carrera}
        if seminario.carrera is not None:
            carreras.add(seminario.carrera)
        _invalidar_planes(session, seminario.cohorte_id, carreras)
    seminario.carrera = datos.carrera
    seminario.es_obligatorio = datos.es_obligatorio
    _auditar(session, usuario, id, "actualizar_plan_seminario", datos.model_dump())
    session.commit()
    return seminario


@router.patch("/{id}/fecha-limite-notas", response_model=SeminarioRespuesta)
def actualizar_fecha_limite(
    id: UUID,
    datos: ActualizarFechaLimite,
    session: Session = Depends(get_db),
    usuario: User = Depends(requerir_roles("COORDINADOR")),
) -> Seminario:
    seminario = _seminario(session, id, bloquear=True)
    seminario.fecha_limite_notas = datos.fecha_limite_notas
    seminario.ultimo_recordatorio_en = None
    _auditar(
        session, usuario, id, "actualizar_fecha_limite_notas",
        {"fecha_limite_notas": datos.fecha_limite_notas.isoformat() if datos.fecha_limite_notas else None},
    )
    session.commit()
    return seminario


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
    response.headers["Cache-Control"] = "private, no-store"
    return _planilla(session, seminario)


@router.post("/{id}/clases", response_model=ClaseRespuesta, status_code=201)
def crear_clase(
    id: UUID,
    datos: CrearClase,
    _: Seminario = Depends(_exigir_docente),
    session: Session = Depends(get_db),
) -> ClaseSeminario:
    _seminario(session, id, bloquear=True)
    if session.scalar(select(ClaseSeminario.id).where(
        ClaseSeminario.seminario_id == id, ClaseSeminario.fecha == datos.fecha
    )):
        raise HTTPException(status_code=409, detail="Ya existe una clase para esa fecha")
    clase = ClaseSeminario(seminario_id=id, fecha=datos.fecha)
    session.add(clase)
    registrar_evento_auditoria(
        session, accion="crear_clase", tipo_recurso="seminario", id_recurso=id,
        rol_actor="DOCENTE", detalles={"fecha": datos.fecha.isoformat()},
    )
    session.commit()
    return clase


@router.patch("/{id}/clases/{clase_id}", response_model=ClaseRespuesta)
def cambiar_fecha_clase(
    id: UUID,
    clase_id: UUID,
    datos: CambiarFechaClase,
    _: Seminario = Depends(_exigir_docente),
    session: Session = Depends(get_db),
) -> ClaseSeminario:
    _seminario(session, id, bloquear=True)
    clase = session.scalar(select(ClaseSeminario).where(
        ClaseSeminario.id == clase_id, ClaseSeminario.seminario_id == id
    ))
    if clase is None:
        raise HTTPException(status_code=404, detail="No se encontró la clase del seminario")
    if session.scalar(select(ClaseSeminario.id).where(
        ClaseSeminario.seminario_id == id,
        ClaseSeminario.fecha == datos.fecha,
        ClaseSeminario.id != clase_id,
    )):
        raise HTTPException(status_code=409, detail="Ya existe una clase para esa fecha")
    anterior = clase.fecha
    clase.fecha = datos.fecha
    registrar_evento_auditoria(
        session, accion="cambiar_fecha_clase", tipo_recurso="seminario", id_recurso=id,
        rol_actor="DOCENTE", detalles={
            "clase_id": str(clase_id), "fecha_anterior": anterior.isoformat(),
            "fecha_nueva": datos.fecha.isoformat(),
        },
    )
    session.commit()
    return clase


@router.patch("/{id}/asistencias", response_model=PlanillaRespuesta)
def registrar_asistencias(
    id: UUID,
    datos: LoteAsistencias,
    _: Seminario = Depends(_exigir_docente),
    session: Session = Depends(get_db),
) -> PlanillaRespuesta:
    seminario = _seminario(session, id, bloquear=True)
    pares = {(item.clase_id, item.legajo_id) for item in datos.asistencias}
    if len(pares) != len(datos.asistencias):
        raise HTTPException(status_code=422, detail="Hay asistencias duplicadas en el lote")
    clases = {clase.id: clase for clase in session.scalars(select(ClaseSeminario).where(
        ClaseSeminario.seminario_id == id,
        ClaseSeminario.id.in_({item.clase_id for item in datos.asistencias}),
    ))}
    inscripciones = {
        inscripcion.legajo_id: inscripcion
        for inscripcion in session.scalars(
            select(InscripcionSeminario).join(Legajo, Legajo.id == InscripcionSeminario.legajo_id)
            .where(InscripcionSeminario.seminario_id == id, Legajo.estado != "Baja")
        )
    }
    if any(item.clase_id not in clases or item.legajo_id not in inscripciones for item in datos.asistencias):
        raise HTTPException(status_code=422, detail="Todas las clases y estudiantes deben pertenecer al seminario")
    existentes = {
        (item.clase_id, item.inscripcion_id): item
        for item in session.scalars(select(AsistenciaSeminario).where(
            AsistenciaSeminario.clase_id.in_(clases.keys()),
            AsistenciaSeminario.inscripcion_id.in_([item.id for item in inscripciones.values()]),
        ))
    }
    ahora = datetime.now(timezone.utc)
    for registro in datos.asistencias:
        inscripcion = inscripciones[registro.legajo_id]
        asistencia = existentes.get((registro.clase_id, inscripcion.id))
        anterior = asistencia.presente if asistencia is not None else False
        if asistencia is None:
            session.add(AsistenciaSeminario(
                clase_id=registro.clase_id, inscripcion_id=inscripcion.id,
                presente=registro.presente,
            ))
        else:
            asistencia.presente = registro.presente
        if registro.presente and not anterior and clases[registro.clase_id].fecha <= date.today():
            inscripcion.ultimo_avance_en = ahora
    registrar_evento_auditoria(
        session, accion="registrar_asistencias", tipo_recurso="seminario", id_recurso=id,
        rol_actor="DOCENTE", detalles={"cantidad": len(datos.asistencias)},
    )
    session.commit()
    return _planilla(session, seminario)


@router.patch("/{id}/notas", response_model=PlanillaRespuesta)
def registrar_notas(
    id: UUID,
    datos: LoteNotas,
    _: Seminario = Depends(_exigir_docente),
    session: Session = Depends(get_db),
) -> PlanillaRespuesta:
    seminario = _seminario(session, id, bloquear=True)
    ids = {item.legajo_id for item in datos.notas}
    if len(ids) != len(datos.notas):
        raise HTTPException(status_code=422, detail="Hay notas duplicadas en el lote")
    inscripciones = {
        item.legajo_id: item
        for item in session.scalars(select(InscripcionSeminario)
            .join(Legajo, Legajo.id == InscripcionSeminario.legajo_id)
            .where(InscripcionSeminario.seminario_id == id, Legajo.estado != "Baja"))
    }
    if not ids.issubset(inscripciones):
        raise HTTPException(status_code=422, detail="Todos los estudiantes deben pertenecer al seminario")
    ahora = datetime.now(timezone.utc)
    for registro in datos.notas:
        inscripcion = inscripciones[registro.legajo_id]
        if inscripcion.nota != registro.nota:
            inscripcion.nota = registro.nota
            inscripcion.ultimo_avance_en = ahora
    registrar_evento_auditoria(
        session, accion="registrar_notas", tipo_recurso="seminario", id_recurso=id,
        rol_actor="DOCENTE", detalles={"legajo_ids": [str(item) for item in sorted(ids)]},
    )
    session.commit()
    return _planilla(session, seminario)


@router.post("/{id}/importar-notas", response_model=PlanillaRespuesta)
async def importar_notas_desde_excel(
    id: UUID,
    archivo: UploadFile = File(...),
    _: Seminario = Depends(_exigir_docente),
    session: Session = Depends(get_db),
) -> PlanillaRespuesta:
    seminario = _seminario(session, id, bloquear=True)
    contenido = await archivo.read(5 * 1024 * 1024 + 1)
    try:
        notas_importadas = importar_notas_excel(contenido)
    except ExcelInvalidoError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    inscripciones = {
        legajo.email.strip().lower(): inscripcion
        for inscripcion, legajo in session.execute(
            select(InscripcionSeminario, Legajo)
            .join(Legajo, Legajo.id == InscripcionSeminario.legajo_id)
            .where(InscripcionSeminario.seminario_id == id, Legajo.estado != "Baja")
        )
    }
    faltantes = [item.email for item in notas_importadas if item.email not in inscripciones]
    if faltantes:
        raise HTTPException(
            status_code=422,
            detail="Todos los estudiantes del archivo deben pertenecer al seminario",
        )

    ahora = datetime.now(timezone.utc)
    for item in notas_importadas:
        inscripcion = inscripciones[item.email]
        if inscripcion.nota != item.nota:
            inscripcion.nota = item.nota
            inscripcion.ultimo_avance_en = ahora

    registrar_evento_auditoria(
        session,
        accion="importar_notas_excel",
        tipo_recurso="seminario",
        id_recurso=id,
        rol_actor="DOCENTE",
        detalles={"cantidad": len(notas_importadas)},
    )
    session.commit()
    return _planilla(session, seminario)


@router.get("/{id}/exportar")
def exportar_planilla(
    seminario: Seminario = Depends(_exigir_docente),
    session: Session = Depends(get_db),
) -> StreamingResponse:
    planilla = _planilla(session, seminario)
    return StreamingResponse(
        exportar_planilla_excel(planilla),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="seminario-{seminario.id}.xlsx"',
            "Cache-Control": "private, no-store",
        },
    )


@router_legajos.get("/{id}/seminarios", response_model=list[ResultadoSeminario])
def consultar_resultados_legajo(
    id: UUID,
    response: Response,
    credencial: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_db),
) -> list[ResultadoSeminario]:
    credencial = exigir_credencial(credencial)
    legajo = session.get(Legajo, id)
    if legajo is None:
        raise HTTPException(status_code=404, detail="No se encontró el legajo")
    autorizar_dueno_o_coordinador(legajo, credencial, session)
    seminarios = list(session.scalars(
        select(Seminario).join(InscripcionSeminario, InscripcionSeminario.seminario_id == Seminario.id)
        .where(InscripcionSeminario.legajo_id == id).order_by(Seminario.nombre, Seminario.id)
    ))
    resultados = []
    for seminario in seminarios:
        estudiante = next((item for item in _planilla(session, seminario).estudiantes if item.legajo_id == id), None)
        if estudiante is not None:
            resultados.append(ResultadoSeminario(
                seminario_id=seminario.id,
                nombre=seminario.nombre,
                porcentaje_asistencia=estudiante.porcentaje_asistencia,
                nota=estudiante.nota,
                condicion=estudiante.condicion,
            ))
    response.headers["Cache-Control"] = "private, no-store"
    return resultados