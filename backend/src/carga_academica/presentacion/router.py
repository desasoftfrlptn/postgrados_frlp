import hashlib
from datetime import date, datetime, time, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from src.authentication.application.security import bearer_scheme, get_current_user
from src.authentication.infrastructure.models import User
from src.carga_academica.aplicacion.acceso import crear_acceso, enlace_planilla
from src.carga_academica.dominio.reglas import (
    calcular_condicion,
    calcular_porcentaje_asistencia,
)
from src.carga_academica.infraestructura.excel import generar_excel
from src.carga_academica.infraestructura.modelos import (
    AccesoDocente,
    Asistencia,
    Clase,
    InscripcionSeminario,
    Seminario,
)
from src.carga_academica.presentacion.esquemas import (
    CambiarFechaClase,
    CeldaAsistencia,
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
from src.inscripcion.infrastructure.models import Cohorte, Legajo
from src.inscripcion.presentation.acceso_legajo import (
    autorizar_dueno_o_coordinador,
    exigir_credencial,
)
from src.shared.auditoria.servicio import registrar_evento_auditoria
from src.shared.autorizacion.permisos import requerir_roles

router = APIRouter(prefix="/api/v1/seminarios", tags=["seminarios"])
router_legajos = APIRouter(prefix="/api/v1/legajos", tags=["carga-academica"])


def _token_invalido() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="Token docente ausente, inválido o vencido",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _seminario(session: Session, id: UUID, *, bloquear: bool = False) -> Seminario:
    consulta = select(Seminario).where(Seminario.id == id)
    if bloquear:
        consulta = consulta.with_for_update()
    seminario = session.scalar(consulta)
    if seminario is None:
        raise HTTPException(status_code=404, detail="No se encontró el seminario")
    return seminario


def _autorizar_docente(
    id: UUID,
    credencial: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_db),
) -> Seminario:
    if credencial is None:
        raise _token_invalido()
    try:
        resumen = hashlib.sha256(credencial.credentials.encode("ascii")).hexdigest()
    except UnicodeEncodeError:
        raise _token_invalido() from None
    acceso = session.scalar(select(AccesoDocente).where(AccesoDocente.token_hash == resumen))
    ahora = datetime.now(timezone.utc)
    if acceso is None:
        try:
            get_current_user(credencial, session)
        except HTTPException as error:
            if error.status_code != 401:
                raise
        else:
            raise HTTPException(status_code=403, detail="Este recurso requiere acceso docente")
        raise _token_invalido()
    expira = acceso.expira_en
    if expira.tzinfo is None:
        expira = expira.replace(tzinfo=timezone.utc)
    if expira <= ahora:
        raise _token_invalido()
    if acceso.seminario_id != id:
        raise HTTPException(status_code=403, detail="No tenés permisos para este seminario")
    seminario = _seminario(session, id, bloquear=True)
    acceso_vigente = session.scalar(
        select(AccesoDocente.id).where(AccesoDocente.token_hash == resumen)
    )
    if acceso_vigente is None:
        raise _token_invalido()
    if expira <= datetime.now(timezone.utc):
        raise _token_invalido()
    return seminario


def _auditar(
    session: Session,
    seminario_id: UUID,
    accion: str,
    *,
    usuario: User | None = None,
    detalles: dict[str, object] | None = None,
) -> None:
    registrar_evento_auditoria(
        session, accion=accion, tipo_recurso="seminario", id_recurso=seminario_id,
        id_actor=usuario.id if usuario else None,
        rol_actor=usuario.role if usuario else "DOCENTE", detalles=detalles,
    )


def _inscripciones_activas(session: Session, seminario_id: UUID) -> list[tuple[InscripcionSeminario, Legajo]]:
    return list(session.execute(
        select(InscripcionSeminario, Legajo)
        .join(Legajo, Legajo.id == InscripcionSeminario.legajo_id)
        .where(InscripcionSeminario.seminario_id == seminario_id, Legajo.estado != "Baja")
        .order_by(Legajo.apellido, Legajo.nombre, Legajo.id)
    ).all())


def _planilla(session: Session, seminario: Seminario) -> PlanillaRespuesta:
    clases = list(session.scalars(select(Clase).where(Clase.seminario_id == seminario.id).order_by(Clase.fecha, Clase.id)))
    inscripciones = _inscripciones_activas(session, seminario.id)
    asistencias = list(session.scalars(
        select(Asistencia).join(Clase, Clase.id == Asistencia.clase_id)
        .where(Clase.seminario_id == seminario.id)
    ))
    por_celda = {(a.inscripcion_id, a.clase_id): a.presente for a in asistencias}
    fechas = [clase.fecha for clase in clases]
    estudiantes = []
    for inscripcion, legajo in inscripciones:
        presentes = {clase.fecha for clase in clases if por_celda.get((inscripcion.id, clase.id), False)}
        porcentaje = calcular_porcentaje_asistencia(fechas, presentes, date.today())
        estudiantes.append(EstudianteRespuesta(
            legajo_id=legajo.id, numero_legajo=legajo.numero_legajo,
            apellido=legajo.apellido, nombre=legajo.nombre, email=legajo.email,
            titulo_grado=legajo.titulo_grado,
            asistencias=[CeldaAsistencia(clase_id=c.id, presente=por_celda.get((inscripcion.id, c.id), False)) for c in clases],
            porcentaje_asistencia=porcentaje.quantize(Decimal("0.01")),
            nota=inscripcion.nota, condicion=calcular_condicion(inscripcion.nota, porcentaje),
        ))
    return PlanillaRespuesta(
        seminario=SeminarioRespuesta.model_validate(seminario),
        clases=[ClaseRespuesta.model_validate(c) for c in clases], estudiantes=estudiantes,
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
    _auditar(session, seminario.id, "crear_seminario", usuario=usuario)
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
    if len(legajos) != len(ids) or any(l.cohorte_id != seminario.cohorte_id or l.estado != "Activo" for l in legajos):
        raise HTTPException(status_code=422, detail="Todos los legajos deben estar activos y pertenecer a la cohorte del seminario")
    existentes = set(session.scalars(select(InscripcionSeminario.legajo_id).where(InscripcionSeminario.seminario_id == id, InscripcionSeminario.legajo_id.in_(ids))))
    if existentes:
        raise HTTPException(status_code=409, detail="Ya hay estudiantes inscriptos en el seminario")
    session.add_all(InscripcionSeminario(seminario_id=id, legajo_id=legajo_id) for legajo_id in ids)
    _auditar(session, id, "inscribir_estudiantes", usuario=usuario, detalles={"legajo_ids": [str(i) for i in ids]})
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
    ahora = datetime.now(timezone.utc)
    fin_mes = 6 if ahora.month <= 6 else 12
    fin_dia = 30 if fin_mes == 6 else 31
    expira = datos.expira_en or datetime.combine(date(ahora.year, fin_mes, fin_dia), time.max, tzinfo=timezone.utc)
    if expira <= ahora:
        raise HTTPException(status_code=422, detail="La expiración debe ser futura")
    session.execute(delete(AccesoDocente).where(AccesoDocente.seminario_id == seminario.id))
    token = crear_acceso(session, seminario.id, expira)
    _auditar(session, id, "generar_enlace_docente", usuario=usuario, detalles={"expira_en": expira.isoformat()})
    session.commit()
    response.headers["Cache-Control"] = "no-store"
    return EnlaceRespuesta(token=token, expira_en=expira, enlace=enlace_planilla(id, token))


@router.get("/{id}/estudiantes", response_model=PlanillaRespuesta)
def listar_estudiantes(
    response: Response,
    seminario: Seminario = Depends(_autorizar_docente),
    session: Session = Depends(get_db),
) -> PlanillaRespuesta:
    response.headers["Cache-Control"] = "private, no-store"
    return _planilla(session, seminario)


@router.get("/{id}/exportar")
def exportar_planilla(
    seminario: Seminario = Depends(_autorizar_docente),
    session: Session = Depends(get_db),
) -> StreamingResponse:
    planilla = _planilla(session, seminario)
    filas = [["Apellido", "Nombre", "Email", "Carrera de grado"] + [c.fecha.isoformat() for c in planilla.clases] + ["% Asistencia"]]
    for estudiante in planilla.estudiantes:
        filas.append(
            [estudiante.apellido, estudiante.nombre, estudiante.email, estudiante.titulo_grado]
            + ["P" if celda.presente else "A" for celda in estudiante.asistencias]
            + [str(estudiante.porcentaje_asistencia)]
        )
    return StreamingResponse(
        generar_excel(filas),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="seminario-{seminario.id}.xlsx"', "Cache-Control": "private, no-store"},
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
        estudiante = next((e for e in _planilla(session, seminario).estudiantes if e.legajo_id == id), None)
        if estudiante is not None:
            resultados.append(ResultadoSeminario(
                seminario_id=seminario.id, nombre=seminario.nombre,
                porcentaje_asistencia=estudiante.porcentaje_asistencia,
                nota=estudiante.nota, condicion=estudiante.condicion,
            ))
    response.headers["Cache-Control"] = "private, no-store"
    return resultados


@router.post("/{id}/clases", response_model=ClaseRespuesta, status_code=status.HTTP_201_CREATED)
def crear_clase(
    id: UUID,
    datos: CrearClase,
    _: Seminario = Depends(_autorizar_docente),
    session: Session = Depends(get_db),
) -> Clase:
    _seminario(session, id, bloquear=True)
    if session.scalar(select(Clase.id).where(Clase.seminario_id == id, Clase.fecha == datos.fecha)):
        raise HTTPException(status_code=409, detail="Ya existe una clase para esa fecha")
    clase = Clase(seminario_id=id, fecha=datos.fecha)
    session.add(clase)
    _auditar(session, id, "crear_clase", detalles={"fecha": datos.fecha.isoformat()})
    session.commit()
    return clase


@router.patch("/{id}/clases/{clase_id}", response_model=ClaseRespuesta)
def cambiar_fecha_clase(
    id: UUID,
    clase_id: UUID,
    datos: CambiarFechaClase,
    _: Seminario = Depends(_autorizar_docente),
    session: Session = Depends(get_db),
) -> Clase:
    clase = session.scalar(select(Clase).where(Clase.id == clase_id, Clase.seminario_id == id))
    if clase is None:
        raise HTTPException(status_code=404, detail="No se encontró la clase del seminario")
    if session.scalar(select(Clase.id).where(Clase.seminario_id == id, Clase.fecha == datos.fecha, Clase.id != clase_id)):
        raise HTTPException(status_code=409, detail="Ya existe una clase para esa fecha")
    anterior = clase.fecha
    clase.fecha = datos.fecha
    _auditar(session, id, "cambiar_fecha_clase", detalles={"clase_id": str(clase_id), "fecha_anterior": anterior.isoformat(), "fecha_nueva": datos.fecha.isoformat()})
    session.commit()
    return clase


@router.patch("/{id}/asistencias", response_model=PlanillaRespuesta)
def registrar_asistencias(
    id: UUID,
    datos: LoteAsistencias,
    _: Seminario = Depends(_autorizar_docente),
    session: Session = Depends(get_db),
) -> PlanillaRespuesta:
    seminario = _seminario(session, id, bloquear=True)
    pares = {(r.clase_id, r.legajo_id) for r in datos.asistencias}
    if len(pares) != len(datos.asistencias):
        raise HTTPException(status_code=422, detail="Hay asistencias duplicadas en el lote")
    clases = set(session.scalars(select(Clase.id).where(Clase.seminario_id == id, Clase.id.in_({r.clase_id for r in datos.asistencias}))))
    inscripciones = {l.id: i for i, l in _inscripciones_activas(session, id)}
    if any(r.clase_id not in clases or r.legajo_id not in inscripciones for r in datos.asistencias):
        raise HTTPException(status_code=422, detail="Todas las clases y estudiantes deben pertenecer al seminario")
    existentes = {(a.clase_id, a.inscripcion_id): a for a in session.scalars(
        select(Asistencia).where(Asistencia.clase_id.in_(clases), Asistencia.inscripcion_id.in_([i.id for i in inscripciones.values()]))
    )}
    for registro in datos.asistencias:
        inscripcion_id = inscripciones[registro.legajo_id].id
        asistencia = existentes.get((registro.clase_id, inscripcion_id))
        if asistencia is None:
            session.add(Asistencia(clase_id=registro.clase_id, inscripcion_id=inscripcion_id, presente=registro.presente))
        else:
            asistencia.presente = registro.presente
    _auditar(session, id, "registrar_asistencias", detalles={"cantidad": len(datos.asistencias)})
    session.commit()
    return _planilla(session, seminario)


@router.patch("/{id}/notas", response_model=PlanillaRespuesta)
def registrar_notas(
    id: UUID,
    datos: LoteNotas,
    _: Seminario = Depends(_autorizar_docente),
    session: Session = Depends(get_db),
) -> PlanillaRespuesta:
    seminario = _seminario(session, id, bloquear=True)
    ids = {r.legajo_id for r in datos.notas}
    if len(ids) != len(datos.notas):
        raise HTTPException(status_code=422, detail="Hay notas duplicadas en el lote")
    inscripciones = {l.id: i for i, l in _inscripciones_activas(session, id)}
    if not ids.issubset(inscripciones):
        raise HTTPException(status_code=422, detail="Todos los estudiantes deben pertenecer al seminario")
    for registro in datos.notas:
        inscripciones[registro.legajo_id].nota = registro.nota
    _auditar(session, id, "registrar_notas", detalles={"legajo_ids": [str(i) for i in ids]})
    session.commit()
    return _planilla(session, seminario)
