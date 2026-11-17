import logging
from dataclasses import dataclass
from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.carga_academica.dominio.reglas import calcular_condicion, calcular_porcentaje_asistencia
from src.carga_academica.infraestructura.modelos import (
    AsistenciaSeminario,
    ClaseSeminario,
    InscripcionSeminario,
    Seminario,
)
from src.inscripcion.infrastructure.models import Legajo
from src.seguimiento_graduacion.dominio.semaforo import (
    DURACION_DIAS,
    DatosSemaforo,
    EstadoSemaforo,
    calcular_semaforo,
)
from src.seguimiento_graduacion.infraestructura.modelos import (
    AlertaRiesgo,
    AvanceTesis,
    PlanGraduacion,
    SemaforoGraduacion,
    TrabajoFinal,
)
from src.shared.auditoria.servicio import registrar_evento_auditoria

_LOGGER = logging.getLogger(__name__)
_TIPO_TRABAJO = {
    "Especialización": "TFI",
    "Maestría": "Maestría",
    "Doctorado": "Doctorado",
}


@dataclass(frozen=True)
class InsumosSemaforo:
    datos: DatosSemaforo
    seminarios_adeudados: int
    fecha_ultimo_avance: date


def fecha_local(valor: datetime) -> date:
    if valor.tzinfo is None:
        valor = valor.replace(tzinfo=timezone.utc)
    return valor.astimezone().date()


def obtener_insumos(
    session: Session, legajos: list[Legajo], hoy: date,
) -> dict[tuple[UUID, str], InsumosSemaforo | None]:
    if not legajos:
        return {}
    ids_legajos = [legajo.id for legajo in legajos]
    ids_cohortes = {legajo.cohorte_id for legajo in legajos}
    planes = {
        (plan.cohorte_id, plan.carrera)
        for plan in session.scalars(
            select(PlanGraduacion).where(
                PlanGraduacion.cohorte_id.in_(ids_cohortes),
                PlanGraduacion.confirmado.is_(True),
            )
        )
    }
    seminarios: dict[tuple[UUID, str], set[UUID]] = {}
    todos_seminarios: dict[tuple[UUID, str], set[UUID]] = {}
    for seminario in session.scalars(select(Seminario).where(
        Seminario.cohorte_id.in_(ids_cohortes),
        Seminario.carrera.is_not(None),
    )):
        if seminario.carrera is not None:
            clave_plan = (seminario.cohorte_id, seminario.carrera)
            todos_seminarios.setdefault(clave_plan, set()).add(seminario.id)
            if seminario.es_obligatorio:
                seminarios.setdefault(clave_plan, set()).add(seminario.id)
    ids_seminarios = {id for conjunto in todos_seminarios.values() for id in conjunto}
    clases: dict[UUID, list[ClaseSeminario]] = {}
    if ids_seminarios:
        for clase in session.scalars(select(ClaseSeminario).where(
            ClaseSeminario.seminario_id.in_(ids_seminarios), ClaseSeminario.fecha <= hoy,
        )):
            clases.setdefault(clase.seminario_id, []).append(clase)
    inscripciones = list(session.scalars(select(InscripcionSeminario).where(
        InscripcionSeminario.legajo_id.in_(ids_legajos),
    )))
    presentes: set[tuple[UUID, UUID]] = set()
    ids_inscripciones = [inscripcion.id for inscripcion in inscripciones]
    if ids_inscripciones:
        presentes = {
            (asistencia.inscripcion_id, asistencia.clase_id)
            for asistencia in session.scalars(select(AsistenciaSeminario).where(
                AsistenciaSeminario.inscripcion_id.in_(ids_inscripciones),
                AsistenciaSeminario.presente.is_(True),
            ))
        }
    aprobados: dict[tuple[UUID, UUID], bool] = {}
    avances_seminario: dict[tuple[UUID, UUID], date] = {}
    for inscripcion in inscripciones:
        fechas = [clase.fecha for clase in clases.get(inscripcion.seminario_id, [])]
        fechas_presentes = {
            clase.fecha for clase in clases.get(inscripcion.seminario_id, [])
            if (inscripcion.id, clase.id) in presentes
        }
        porcentaje = calcular_porcentaje_asistencia(fechas, fechas_presentes, hoy)
        aprobados[(inscripcion.legajo_id, inscripcion.seminario_id)] = (
            calcular_condicion(inscripcion.nota, porcentaje) == "Aprobado"
        )
        fechas_avance = list(fechas_presentes)
        if inscripcion.ultimo_avance_en is not None:
            fecha = fecha_local(inscripcion.ultimo_avance_en)
            if fecha <= hoy:
                fechas_avance.append(fecha)
        if fechas_avance:
            avances_seminario[(inscripcion.legajo_id, inscripcion.seminario_id)] = max(fechas_avance)
    trabajos: dict[tuple[UUID, str], list[TrabajoFinal]] = {}
    for trabajo in session.scalars(select(TrabajoFinal).where(TrabajoFinal.legajo_id.in_(ids_legajos))):
        trabajos.setdefault((trabajo.legajo_id, trabajo.tipo), []).append(trabajo)
    avances_tesis: dict[tuple[UUID, str], list[date]] = {}
    for avance in session.scalars(select(AvanceTesis).where(
        AvanceTesis.legajo_id.in_(ids_legajos), AvanceTesis.fecha <= hoy,
    )):
        avances_tesis.setdefault((avance.legajo_id, avance.carrera), []).append(avance.fecha)

    resultado: dict[tuple[UUID, str], InsumosSemaforo | None] = {}
    for legajo in legajos:
        for carrera in legajo.carreras:
            if carrera not in DURACION_DIAS:
                raise ValueError(f"El legajo {legajo.id} tiene una carrera no admitida")
            clave = (legajo.id, carrera)
            if (legajo.cohorte_id, carrera) not in planes:
                resultado[clave] = None
                continue
            ids_obligatorios = seminarios.get((legajo.cohorte_id, carrera), set())
            total_aprobados = sum(
                aprobados.get((legajo.id, id_seminario), False) for id_seminario in ids_obligatorios
            )
            trabajos_carrera = trabajos.get((legajo.id, _TIPO_TRABAJO[carrera]), [])
            fechas_avance = [fecha_local(legajo.fecha_inscripcion)]
            fechas_avance.extend(avances_tesis.get(clave, []))
            fechas_avance.extend(
                trabajo.fecha_aprobacion_cpr for trabajo in trabajos_carrera
                if trabajo.fecha_aprobacion_cpr <= hoy
            )
            fechas_avance.extend(
                fecha for id_seminario in todos_seminarios.get((legajo.cohorte_id, carrera), set())
                if (fecha := avances_seminario.get((legajo.id, id_seminario))) is not None
            )
            datos = DatosSemaforo(
                tipo_carrera=carrera,
                fecha_inscripcion=fecha_local(legajo.fecha_inscripcion),
                seminarios_obligatorios_total=len(ids_obligatorios),
                seminarios_aprobados=total_aprobados,
                tiene_tfi_registrado=bool(trabajos_carrera),
                tiene_director_asignado=any(bool(trabajo.director_nombre) for trabajo in trabajos_carrera),
                tiene_fecha_cpr=any(trabajo.fecha_aprobacion_cpr <= hoy for trabajo in trabajos_carrera),
                hoy=hoy,
            )
            resultado[clave] = InsumosSemaforo(
                datos=datos,
                seminarios_adeudados=len(ids_obligatorios) - total_aprobados,
                fecha_ultimo_avance=max(fechas_avance),
            )
    return resultado


def _motivo(carrera: str, estado: EstadoSemaforo) -> str:
    if estado == EstadoSemaforo.VERDE:
        return "Dentro de los plazos y sin riesgo detectado"
    if estado == EstadoSemaforo.ROJO:
        if carrera == "Doctorado":
            return "Superó el 70% del plazo y no tiene fecha de aprobación CPR"
        return "Superó el umbral de plazo y adeuda seminarios obligatorios"
    if carrera == "Especialización":
        return "Superó el 50% del plazo y no tiene TFI registrado"
    return "Superó el umbral de plazo y no tiene director asignado"


def recalcular_semaforos(session: Session, ahora: datetime | None = None) -> int:
    momento = ahora or datetime.now(timezone.utc)
    if momento.utcoffset() is None:
        raise ValueError("La fecha actual debe incluir zona horaria")
    hoy = momento.astimezone().date()
    legajos = list(session.scalars(
        select(Legajo).where(Legajo.estado == "Activo").order_by(Legajo.id).with_for_update()
    ))
    planes_bloqueados = list(session.scalars(
        select(PlanGraduacion)
        .where(PlanGraduacion.cohorte_id.in_({legajo.cohorte_id for legajo in legajos}))
        .order_by(PlanGraduacion.id)
        .with_for_update()
    ))
    insumos = obtener_insumos(session, legajos, hoy)
    existentes = {
        (semaforo.legajo_id, semaforo.carrera): semaforo
        for semaforo in session.scalars(select(SemaforoGraduacion).where(
            SemaforoGraduacion.legajo_id.in_([legajo.id for legajo in legajos]),
        ))
    }
    cambios = 0
    for clave, insumo in insumos.items():
        if insumo is None:
            _LOGGER.warning("No se recalculó el legajo %s, carrera %s: plan no confirmado", *clave)
            continue
        estado = calcular_semaforo(insumo.datos)
        motivo = _motivo(clave[1], estado)
        semaforo = existentes.get(clave)
        anterior = semaforo.estado if semaforo is not None else None
        if semaforo is None:
            semaforo = SemaforoGraduacion(
                legajo_id=clave[0], carrera=clave[1], estado=estado.value, motivo=motivo,
                seminarios_adeudados=insumo.seminarios_adeudados,
                fecha_ultimo_avance=insumo.fecha_ultimo_avance,
                fecha_cambio=momento, recalculado_en=momento,
            )
            session.add(semaforo)
            session.flush()
        else:
            semaforo.estado = estado.value
            semaforo.motivo = motivo
            semaforo.seminarios_adeudados = insumo.seminarios_adeudados
            semaforo.fecha_ultimo_avance = insumo.fecha_ultimo_avance
            semaforo.recalculado_en = momento
            if anterior != estado.value:
                semaforo.fecha_cambio = momento
        if anterior != estado.value:
            cambios += 1
            registrar_evento_auditoria(
                session, accion="semaforo_cambiado", tipo_recurso="legajo",
                id_recurso=clave[0], rol_actor="SISTEMA",
                detalles={"carrera": clave[1], "estado_anterior": anterior, "estado_nuevo": estado.value},
            )
            if estado == EstadoSemaforo.ROJO:
                dias = (hoy - insumo.datos.fecha_inscripcion).days
                session.add(AlertaRiesgo(
                    semaforo_id=semaforo.id,
                    motivo=motivo,
                    dias_restantes=DURACION_DIAS[clave[1]] - dias,
                    destinatarios_definidos=False,
                    creada_en=momento,
                ))
    for plan in planes_bloqueados:
        if plan.confirmado:
            plan.requiere_recalculo = False
    session.commit()
    return cambios
