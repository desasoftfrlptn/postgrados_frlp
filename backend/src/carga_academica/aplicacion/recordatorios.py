import logging
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.carga_academica.aplicacion.acceso import crear_acceso, enlace_planilla
from src.carga_academica.infraestructura.modelos import InscripcionSeminario, Seminario
from src.core.config import settings
from src.inscripcion.infrastructure.models import Legajo
from src.shared.auditoria.servicio import registrar_evento_auditoria
from src.shared.correo.cliente_smtp import enviar_mensaje_correo

_LOGGER = logging.getLogger(__name__)


def enviar_recordatorios(session: Session, ahora: datetime | None = None) -> int:
    ahora = ahora or datetime.now(timezone.utc)
    ids = list(session.scalars(
        select(Seminario.id).where(
            Seminario.fecha_limite_notas > ahora,
            Seminario.fecha_limite_notas <= ahora + timedelta(hours=48),
        )
    ))
    enviados = 0
    for id in ids:
        seminario = session.scalar(select(Seminario).where(Seminario.id == id).with_for_update())
        if seminario is None or seminario.fecha_limite_notas is None:
            session.rollback()
            continue
        ultimo = seminario.ultimo_recordatorio_en
        if ultimo is not None:
            if ultimo.tzinfo is None:
                ultimo = ultimo.replace(tzinfo=timezone.utc)
            if ultimo + timedelta(hours=24) > ahora:
                session.rollback()
                continue
        pendientes = session.scalar(
            select(func.count()).select_from(InscripcionSeminario)
            .join(Legajo, Legajo.id == InscripcionSeminario.legajo_id)
            .where(InscripcionSeminario.seminario_id == id, InscripcionSeminario.nota.is_(None), Legajo.estado != "Baja")
        )
        if not pendientes:
            session.rollback()
            continue
        expira = seminario.fecha_limite_notas
        if expira.tzinfo is None:
            expira = expira.replace(tzinfo=timezone.utc)
        if expira <= ahora or expira > ahora + timedelta(hours=48):
            session.rollback()
            continue
        token = crear_acceso(session, id, expira)
        enlace = enlace_planilla(id, token)
        mensaje = EmailMessage()
        mensaje["From"] = settings.email_from
        mensaje["To"] = seminario.docente_email
        mensaje["Subject"] = "Recordatorio de carga de notas"
        mensaje.set_content(
            f"El seminario {seminario.nombre} tiene {pendientes} estudiante(s) sin nota.\n"
            f"Fecha límite: {expira.isoformat()}.\n"
            f"Accedé a la planilla: {enlace}\n"
        )
        try:
            enviar_mensaje_correo(mensaje)
        except (OSError, smtplib.SMTPException):
            session.rollback()
            _LOGGER.exception("No se pudo enviar el recordatorio del seminario %s", id)
            continue
        seminario.ultimo_recordatorio_en = ahora
        registrar_evento_auditoria(session, accion="enviar_recordatorio_notas", tipo_recurso="seminario", id_recurso=id, detalles={"pendientes": pendientes})
        session.commit()
        enviados += 1
    return enviados
