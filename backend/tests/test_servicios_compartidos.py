from collections.abc import Generator
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from src.db.base import Base
from src.shared.auditoria.modelos import EventoAuditoria
from src.shared.auditoria.servicio import registrar_evento_auditoria
from src.shared.autorizacion.permisos import verificar_propietario_o_roles
from src.shared.correo.cliente_smtp import enviar_mensaje_correo
from src.shared.http.errores import ErrorAplicacion, registrar_manejador_error_aplicacion
from src.shared.http.encabezados import MiddlewareEncabezadosSeguridad
from src.shared.limite_solicitudes.modelos import ContadorLimiteSolicitudes
from src.shared.limite_solicitudes.servicio import (
    consumir_limite_solicitudes,
    limpiar_contadores_limite,
)
from src.core.config import settings


@pytest.fixture
def sesion_compartida(tmp_path: Path) -> Generator[Session, None, None]:
    motor = create_engine(f"sqlite:///{tmp_path / 'compartido.db'}")
    Base.metadata.create_all(motor)
    with Session(motor) as sesion:
        yield sesion
    motor.dispose()


def test_autorizacion_permite_propietario_y_rol_privilegiado() -> None:
    id_propietario = uuid4()
    verificar_propietario_o_roles(
        SimpleNamespace(id=id_propietario, role="ASPIRANTE"),
        id_propietario,
        "COORDINADOR",
    )
    verificar_propietario_o_roles(
        SimpleNamespace(id=uuid4(), role="COORDINADOR"),
        id_propietario,
        "COORDINADOR",
    )


def test_autorizacion_deniega_a_otros_usuarios() -> None:
    with pytest.raises(HTTPException) as excepcion:
        verificar_propietario_o_roles(
            SimpleNamespace(id=uuid4(), role="CPR"),
            uuid4(),
            "COORDINADOR",
        )

    assert excepcion.value.status_code == 403


def test_limite_cuenta_solicitudes_por_clave_y_ventana(sesion_compartida: Session) -> None:
    inicio = datetime(2026, 11, 16, 12, 0, tzinfo=timezone.utc)

    primera = consumir_limite_solicitudes(
        sesion_compartida,
        clave="inscripcion:192.0.2.10",
        limite=2,
        segundos_ventana=60,
        ahora=inicio,
    )
    segunda = consumir_limite_solicitudes(
        sesion_compartida,
        clave="inscripcion:192.0.2.10",
        limite=2,
        segundos_ventana=60,
        ahora=inicio,
    )
    limitada = consumir_limite_solicitudes(
        sesion_compartida,
        clave="inscripcion:192.0.2.10",
        limite=2,
        segundos_ventana=60,
        ahora=inicio,
    )
    otra_ip = consumir_limite_solicitudes(
        sesion_compartida,
        clave="inscripcion:192.0.2.11",
        limite=2,
        segundos_ventana=60,
        ahora=inicio,
    )
    siguiente_ventana = consumir_limite_solicitudes(
        sesion_compartida,
        clave="inscripcion:192.0.2.10",
        limite=2,
        segundos_ventana=60,
        ahora=datetime(2026, 11, 16, 12, 1, tzinfo=timezone.utc),
    )

    assert primera.permitido and primera.restantes == 1
    assert segunda.permitido and segunda.restantes == 0
    assert not limitada.permitido and limitada.reintentar_en_segundos == 60
    assert otra_ip.permitido
    assert siguiente_ventana.permitido
    assert len(list(sesion_compartida.scalars(select(ContadorLimiteSolicitudes)))) == 3


def test_auditoria_se_agrega_a_la_transaccion_del_modulo(sesion_compartida: Session) -> None:
    id_actor = uuid4()
    evento = registrar_evento_auditoria(
        sesion_compartida,
        accion="documento.descarga.denegada",
        tipo_recurso="documento",
        id_actor=id_actor,
        rol_actor="CPR",
        id_recurso=uuid4(),
        detalles={"motivo": "sin_permisos"},
    )
    sesion_compartida.commit()

    guardado = sesion_compartida.get(EventoAuditoria, evento.id)
    assert guardado is not None
    assert guardado.id_actor == id_actor
    assert guardado.accion == "documento.descarga.denegada"
    assert guardado.detalles == {"motivo": "sin_permisos"}


def test_se_pueden_limpiar_contadores_vencidos(sesion_compartida: Session) -> None:
    ahora = datetime(2026, 11, 16, 12, 0, tzinfo=timezone.utc)
    consumir_limite_solicitudes(
        sesion_compartida,
        clave="inscripcion:192.0.2.10",
        limite=2,
        segundos_ventana=60,
        ahora=ahora,
    )

    eliminados = limpiar_contadores_limite(
        sesion_compartida,
        anteriores_a=datetime(2026, 11, 16, 12, 1, tzinfo=timezone.utc),
    )
    sesion_compartida.commit()

    assert eliminados == 1
    assert sesion_compartida.scalar(select(ContadorLimiteSolicitudes)) is None


def test_cliente_smtp_usa_configuracion_compartida(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    mensajes_enviados: list[EmailMessage] = []

    class ServidorSmtpFalso:
        def __init__(self, servidor: str, puerto: int, timeout: int) -> None:
            assert servidor == "mail.example.test"
            assert puerto == 587
            assert timeout == 10

        def __enter__(self) -> "ServidorSmtpFalso":
            return self

        def __exit__(self, *_: object) -> None:
            return None

        def starttls(self, *, context: object) -> None:
            assert context is not None

        def login(self, usuario: str, contrasena: str) -> None:
            assert usuario == "mailer"
            assert contrasena == "secret"

        def send_message(self, mensaje: EmailMessage) -> None:
            mensajes_enviados.append(mensaje)

    monkeypatch.setattr("src.shared.correo.cliente_smtp.smtplib.SMTP", ServidorSmtpFalso)
    monkeypatch.setattr(settings, "smtp_host", "mail.example.test")
    monkeypatch.setattr(settings, "smtp_port", 587)
    monkeypatch.setattr(settings, "smtp_starttls", True)
    monkeypatch.setattr(settings, "smtp_user", "mailer")
    monkeypatch.setattr(settings, "smtp_password", "secret")
    mensaje = EmailMessage()
    mensaje["To"] = "usuario@example.test"

    enviar_mensaje_correo(mensaje)

    assert mensajes_enviados == [mensaje]


def test_se_agregan_encabezados_de_seguridad() -> None:
    app = FastAPI()
    app.add_middleware(MiddlewareEncabezadosSeguridad)

    @app.get("/salud")
    def salud() -> dict[str, str]:
        return {"status": "ok"}

    respuesta = TestClient(app).get("/salud")

    assert respuesta.headers["X-Content-Type-Options"] == "nosniff"
    assert respuesta.headers["X-Frame-Options"] == "DENY"
    assert "Content-Security-Policy" in respuesta.headers


def test_error_aplicacion_usa_formato_compartido() -> None:
    app = FastAPI()
    registrar_manejador_error_aplicacion(app)

    @app.get("/fallo")
    def falla() -> None:
        raise ErrorAplicacion(
            codigo="operacion.fallida",
            mensaje="No se pudo completar la operación",
            codigo_http=409,
        )

    respuesta = TestClient(app).get("/fallo")

    assert respuesta.status_code == 409
    assert respuesta.json() == {
        "code": "operacion.fallida",
        "detail": "No se pudo completar la operación",
    }
