"""Tests de los mails de cambio de estado del legajo (US-CORE-006)."""

import asyncio
import uuid
from datetime import date
from types import SimpleNamespace

from src.inscripcion.application.notificaciones import NotificadorLegajo, armar_mail

HOY = date(2026, 11, 9)
LEGAJO = SimpleNamespace(
    id=uuid.uuid4(), nombre="Ana", apellido="Pérez", email="ana@mail.com",
    carrera_elegida="Maestría en Ingeniería", numero_legajo="26-001-001",
)


# ---------- armar_mail (pura) ----------

def test_observado_usa_su_plantilla_y_lleva_el_comentario():
    # Act
    mail = armar_mail(LEGAJO, "OBSERVADO", "Falta el título legalizado", HOY)
    # Assert
    assert mail["plantilla"] == "observacion.html"
    assert mail["destinatario"] == "ana@mail.com"
    assert mail["datos"]["detalle_observacion"] == "Falta el título legalizado"


def test_completado_lleva_el_numero_de_legajo():
    mail = armar_mail(LEGAJO, "COMPLETADO", None, HOY)
    assert mail["plantilla"] == "aprobacion.html"
    assert mail["datos"]["numero_legajo"] == "26-001-001"


def test_pendiente_arma_nombre_completo_y_fecha():
    mail = armar_mail(LEGAJO, "PENDIENTE", None, HOY)
    assert mail["datos"]["nombre_aspirante"] == "Ana Pérez"
    assert mail["datos"]["fecha_envio"] == "09/11/2026"


def test_estado_que_no_notifica_devuelve_none():
    assert armar_mail(LEGAJO, "EN_REVISION", None, HOY) is None


# ---------- NotificadorLegajo ----------

def test_notificador_manda_el_mail_armado():
    # Arrange: una función falsa que anota lo que le mandan
    enviados = []

    async def enviar_falso(destinatario, asunto, plantilla, datos):
        enviados.append((destinatario, plantilla))

    notificador = NotificadorLegajo(enviar_falso)
    # Act
    asyncio.run(notificador.cambio_de_estado(LEGAJO, "COMPLETADO"))
    # Assert
    assert enviados == [("ana@mail.com", "aprobacion.html")]


def test_si_el_mail_falla_no_se_propaga_el_error():
    # Arrange: el servidor de correo está caído
    async def enviar_que_falla(*args):
        raise ConnectionError("SMTP caído")

    notificador = NotificadorLegajo(enviar_que_falla)
    # Act + Assert: no lanza nada (si lanzara, el test falla)
    asyncio.run(notificador.cambio_de_estado(LEGAJO, "OBSERVADO", "Falta DNI"))