import logging
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.carga_academica.aplicacion.acceso import crear_acceso, enlace_planilla
from src.carga_academica.infraestructura.modelos import ClaseSeminario, InscripcionSeminario, Seminario
from src.core.config import settings
from src.inscripcion.infrastructure.models import Cohorte, Legajo
from src.shared.auditoria.modelos import EventoAuditoria
from src.shared.auditoria.servicio import registrar_evento_auditoria
from src.shared.correo.cliente_smtp import enviar_mensaje_correo

_LOGGER = logging.getLogger(__name__)


def enviar_recordatorios(session: Session, ahora: datetime | None = None) -> int:
    ahora = ahora or datetime.now(timezone.utc)
    if ahora.utcoffset() is None:
        raise ValueError("La fecha actual debe incluir zona horaria")
    ids = list(session.scalars(select(Seminario.id).where(
        Seminario.fecha_limite_notas > ahora,
        Seminario.fecha_limite_notas <= ahora + timedelta(hours=48),
    )))
    enviados = 0
    for id in ids:
        seminario = session.scalar(select(Seminario).where(Seminario.id == id).with_for_update())
        if seminario is None or seminario.fecha_limite_notas is None:
            session.rollback()
            continue
        limite = seminario.fecha_limite_notas
        if limite.tzinfo is None:
            limite = limite.replace(tzinfo=timezone.utc)
        ultimo = seminario.ultimo_recordatorio_en
        if ultimo is not None and ultimo.tzinfo is None:
            ultimo = ultimo.replace(tzinfo=timezone.utc)
        if (
            limite <= ahora
            or limite > ahora + timedelta(hours=48)
            or (ultimo is not None and ultimo + timedelta(hours=24) > ahora)
        ):
            session.rollback()
            continue
        pendientes = session.scalar(
            select(func.count()).select_from(InscripcionSeminario)
            .join(Legajo, Legajo.id == InscripcionSeminario.legajo_id)
            .where(
                InscripcionSeminario.seminario_id == id,
                InscripcionSeminario.nota.is_(None),
                Legajo.estado != "Baja",
            )
        )
        if not pendientes:
            session.rollback()
            continue
        token = crear_acceso(session, id, limite)
        mensaje = EmailMessage()
        mensaje["From"] = settings.email_from
        mensaje["To"] = seminario.docente_email
        mensaje["Subject"] = "Recordatorio de carga de notas"
        mensaje.set_content(
            f"El seminario {seminario.nombre} tiene {pendientes} estudiante(s) sin nota.\n"
            f"Fecha límite: {limite.isoformat()}.\n"
            f"Accedé a la planilla: {enlace_planilla(id, token)}\n"
        )
        try:
            enviar_mensaje_correo(mensaje)
        except (OSError, smtplib.SMTPException):
            session.rollback()
            _LOGGER.exception("No se pudo enviar el recordatorio del seminario %s", id)
            continue
        seminario.ultimo_recordatorio_en = ahora
        registrar_evento_auditoria(
            session, accion="enviar_recordatorio_notas", tipo_recurso="seminario",
            id_recurso=id, rol_actor="SISTEMA", detalles={"pendientes": pendientes},
        )
        session.commit()
        enviados += 1
    return enviados


def enviar_recordatorios_asistencia(session: Session, ahora: datetime | None = None) -> int:
    """Envía recordatorios a docentes sin carga de asistencia en más de 2 semanas lectivas."""
    ahora = ahora or datetime.now(timezone.utc)
    if ahora.utcoffset() is None:
        raise ValueError("La fecha actual debe incluir zona horaria")

    fecha_hoy = ahora.astimezone(timezone(timedelta(hours=-3))).date()
    umbral_asistencia = fecha_hoy - timedelta(days=14)
    ventana_reenvio = ahora - timedelta(days=7)

    seminarios = list(
        session.scalars(
            select(Seminario).where(Seminario.fecha_fin_cuatrimestre >= fecha_hoy)
        )
    )
    enviados = 0
    for seminario in seminarios:
        inscriptos = session.scalar(
            select(func.count())
            .select_from(InscripcionSeminario)
            .join(Legajo, Legajo.id == InscripcionSeminario.legajo_id)
            .where(
                InscripcionSeminario.seminario_id == seminario.id,
                Legajo.estado != "Baja",
            )
        )
        if not inscriptos:
            continue

        ultima_clase = session.scalar(
            select(func.max(ClaseSeminario.fecha)).where(
                ClaseSeminario.seminario_id == seminario.id
            )
        )
        if ultima_clase is not None and ultima_clase >= umbral_asistencia:
            continue
        if ultima_clase is None:
            cohorte = session.get(Cohorte, seminario.cohorte_id)
            if cohorte is not None and cohorte.fecha_inicio is not None and cohorte.fecha_inicio > umbral_asistencia:
                continue

        ultimo_aviso = session.scalar(
            select(EventoAuditoria.creado_en)
            .where(
                EventoAuditoria.accion == "enviar_recordatorio_asistencia",
                EventoAuditoria.tipo_recurso == "seminario",
                EventoAuditoria.id_recurso == str(seminario.id),
            )
            .order_by(EventoAuditoria.creado_en.desc())
            .limit(1)
        )
        if ultimo_aviso is not None:
            if ultimo_aviso.tzinfo is None:
                ultimo_aviso = ultimo_aviso.replace(tzinfo=timezone.utc)
            if ultimo_aviso > ventana_reenvio:
                continue

        expira = datetime.combine(
            seminario.fecha_fin_cuatrimestre,
            datetime.max.time(),
            tzinfo=timezone(timedelta(hours=-3)),
        ).astimezone(timezone.utc)
        token = crear_acceso(session, seminario.id, expira)
        mensaje = EmailMessage()
        mensaje["From"] = settings.email_from
        mensaje["To"] = seminario.docente_email
        mensaje["Subject"] = "Recordatorio de carga de asistencia"
        mensaje.set_content(
            f"El seminario {seminario.nombre} no registra carga de asistencia en las últimas 2 semanas.\n"
            f"Accedé a la planilla: {enlace_planilla(seminario.id, token)}\n"
        )
        try:
            enviar_mensaje_correo(mensaje)
        except (OSError, smtplib.SMTPException):
            session.rollback()
            _LOGGER.exception("No se pudo enviar el recordatorio de asistencia del seminario %s", seminario.id)
            continue

        registrar_evento_auditoria(
            session,
            accion="enviar_recordatorio_asistencia",
            tipo_recurso="seminario",
            id_recurso=seminario.id,
            rol_actor="SISTEMA",
            detalles={"ultima_clase": ultima_clase.isoformat() if ultima_clase else None},
        )
        session.commit()
        enviados += 1
    return enviados