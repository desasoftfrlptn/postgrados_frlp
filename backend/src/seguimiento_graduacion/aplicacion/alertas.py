import logging
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.autenticacion.infraestructura.modelos import User
from src.core.config import settings
from src.inscripcion.infrastructure.models import Legajo
from src.seguimiento_graduacion.infraestructura.modelos import (
    AlertaRiesgo,
    AsignacionCoordinador,
    EntregaAlerta,
    PlanGraduacion,
    SemaforoGraduacion,
)
from src.shared.auditoria.servicio import registrar_evento_auditoria
from src.shared.correo.cliente_smtp import enviar_mensaje_correo

_LOGGER = logging.getLogger(__name__)


def _plan_habilitado(session: Session, semaforo: SemaforoGraduacion) -> bool:
    legajo = session.get(Legajo, semaforo.legajo_id)
    if legajo is None:
        raise RuntimeError("El semáforo no tiene un legajo asociado")
    plan = session.scalar(select(PlanGraduacion).where(
        PlanGraduacion.cohorte_id == legajo.cohorte_id,
        PlanGraduacion.carrera == semaforo.carrera,
    ).with_for_update())
    return plan is not None and plan.confirmado and not plan.requiere_recalculo


def enviar_alertas_pendientes(session: Session) -> int:
    alertas = list(session.scalars(
        select(AlertaRiesgo.id).where(AlertaRiesgo.destinatarios_definidos.is_(False))
    ))
    for id_alerta in alertas:
        alerta = session.scalar(
            select(AlertaRiesgo).where(
                AlertaRiesgo.id == id_alerta,
                AlertaRiesgo.destinatarios_definidos.is_(False),
            ).with_for_update(skip_locked=True)
        )
        if alerta is None:
            session.rollback()
            continue
        semaforo = session.get(SemaforoGraduacion, alerta.semaforo_id)
        if semaforo is None:
            raise RuntimeError("La alerta no tiene un semáforo asociado")
        if not _plan_habilitado(session, semaforo):
            session.rollback()
            continue
        coordinadores = list(session.scalars(
            select(User.id).join(AsignacionCoordinador, AsignacionCoordinador.usuario_id == User.id)
            .where(
                AsignacionCoordinador.carrera == semaforo.carrera,
                User.role == "COORDINADOR",
                User.is_active.is_(True),
            )
        ))
        if not coordinadores:
            _LOGGER.warning("Alerta %s sin coordinador activo para %s", alerta.id, semaforo.carrera)
            session.rollback()
            continue
        existentes = set(session.scalars(
            select(EntregaAlerta.usuario_id).where(EntregaAlerta.alerta_id == alerta.id)
        ))
        session.add_all(
            EntregaAlerta(alerta_id=alerta.id, usuario_id=coordinador_id)
            for coordinador_id in coordinadores if coordinador_id not in existentes
        )
        alerta.destinatarios_definidos = True
        session.commit()

    pendientes = list(session.scalars(
        select(EntregaAlerta.id).where(EntregaAlerta.enviado_en.is_(None))
    ))
    enviados = 0
    for id_entrega in pendientes:
        entrega = session.scalar(select(EntregaAlerta).where(
            EntregaAlerta.id == id_entrega, EntregaAlerta.enviado_en.is_(None),
        ).with_for_update(skip_locked=True))
        if entrega is None:
            session.rollback()
            continue
        alerta = session.get(AlertaRiesgo, entrega.alerta_id)
        usuario = session.get(User, entrega.usuario_id)
        if alerta is None or usuario is None:
            raise RuntimeError("La entrega de alerta tiene referencias inexistentes")
        semaforo = session.get(SemaforoGraduacion, alerta.semaforo_id)
        if semaforo is None:
            raise RuntimeError("La alerta no tiene un semáforo asociado")
        if not _plan_habilitado(session, semaforo):
            session.rollback()
            continue
        asignacion = session.scalar(
            select(AsignacionCoordinador.id).where(
                AsignacionCoordinador.usuario_id == usuario.id,
                AsignacionCoordinador.carrera == semaforo.carrera,
            ).with_for_update()
        )
        if asignacion is None or not usuario.is_active or usuario.role != "COORDINADOR":
            _LOGGER.warning("La entrega %s requiere reasignación de coordinador", entrega.id)
            session.delete(entrega)
            alerta.destinatarios_definidos = False
            session.commit()
            continue
        legajo = session.get(Legajo, semaforo.legajo_id)
        if legajo is None:
            raise RuntimeError("El semáforo no tiene un legajo asociado")
        mensaje = EmailMessage()
        mensaje["From"] = settings.email_from
        mensaje["To"] = usuario.email
        mensaje["Subject"] = "Alerta de riesgo académico"
        mensaje.set_content(
            f"El estudiante {legajo.nombre} {legajo.apellido} de {semaforo.carrera} "
            "cambió a ROJO.\n"
            f"Motivo: {alerta.motivo}.\n"
            f"Días restantes hasta el vencimiento: {alerta.dias_restantes} "
            "(un valor negativo indica días vencidos).\n"
        )
        try:
            enviar_mensaje_correo(mensaje)
        except (OSError, smtplib.SMTPException):
            session.rollback()
            _LOGGER.exception("No se pudo enviar la alerta %s", id_entrega)
            continue
        entrega.enviado_en = datetime.now(timezone.utc)
        registrar_evento_auditoria(
            session, accion="alerta_riesgo_enviada", tipo_recurso="legajo",
            id_recurso=legajo.id, rol_actor="SISTEMA",
            detalles={"alerta_id": str(alerta.id), "coordinador_id": str(usuario.id)},
        )
        session.commit()
        enviados += 1
    return enviados
