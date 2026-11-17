from collections.abc import Generator
from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from main import app
from src.autenticacion.aplicacion.seguridad import create_token_pair
from src.autenticacion.infraestructura.modelos import User
from src.db.base import Base
from src.db.session import get_db
from src.inscripcion.infrastructure.models import Cohorte, Legajo
from src.seguimiento_graduacion.aplicacion.alertas import enviar_alertas_pendientes
from src.seguimiento_graduacion.dominio.semaforo import DatosSemaforo, EstadoSemaforo, calcular_semaforo
from src.seguimiento_graduacion.infraestructura.modelos import AlertaRiesgo, SemaforoGraduacion
from src.shared.auditoria.modelos import EventoAuditoria


@pytest.mark.parametrize(
    ("carrera", "dias", "estado"),
    [
        ("Especialización", 365, "VERDE"), ("Especialización", 366, "AMARILLO"),
        ("Especialización", 547, "AMARILLO"), ("Especialización", 548, "ROJO"),
        ("Maestría", 547, "VERDE"), ("Maestría", 548, "AMARILLO"),
        ("Maestría", 876, "AMARILLO"), ("Maestría", 877, "ROJO"),
        ("Doctorado", 730, "VERDE"), ("Doctorado", 731, "AMARILLO"),
        ("Doctorado", 1277, "AMARILLO"), ("Doctorado", 1278, "ROJO"),
    ],
)
def test_umbrales_exactos_de_arquitectura(carrera: str, dias: int, estado: str) -> None:
    inicio = date(2020, 1, 1)
    datos = DatosSemaforo(
        tipo_carrera=carrera, fecha_inscripcion=inicio, seminarios_obligatorios_total=1,
        seminarios_aprobados=0, tiene_tfi_registrado=False, tiene_director_asignado=False,
        tiene_fecha_cpr=False, hoy=inicio + timedelta(days=dias),
    )
    assert calcular_semaforo(datos).value == estado


def test_dominio_rechaza_datos_incoherentes_y_prioriza_rojo() -> None:
    inicio = date(2020, 1, 1)
    with pytest.raises(ValueError):
        calcular_semaforo(DatosSemaforo("Maestría", inicio, 1, 2, False, False, False, inicio))
    datos = DatosSemaforo("Doctorado", inicio, 0, 0, False, True, False, inicio + timedelta(days=1278))
    assert calcular_semaforo(datos) == EstadoSemaforo.ROJO


@pytest.fixture
def entorno(tmp_path: Path) -> Generator[tuple[TestClient, Session, Cohorte, Legajo, dict[str, str], User], None, None]:
    motor = create_engine(f"sqlite:///{tmp_path / 'riesgo.db'}")
    Base.metadata.create_all(motor)
    session = Session(motor)
    cohorte = Cohorte(anio=2026, nombre="Cohorte")
    usuarios = [
        User(email=f"{rol.lower()}@example.com", password_hash="sin-uso", role=rol)
        for rol in ("COORDINADOR", "CPR", "ADMIN")
    ]
    session.add_all([cohorte, *usuarios])
    session.flush()
    legajo = Legajo(
        cohorte_id=cohorte.id, estado="Activo", carreras=["Especialización", "Maestría"],
        dni="12345678", apellido="Pérez", nombre="Ana", nacionalidad="Argentina",
        email="ana@example.com", email_alternativo="alternativo@example.com",
        telefono_movil="123", domicilio="Calle 1", ciudad="La Plata",
        provincia="Buenos Aires", pais="Argentina", titulo_grado="Ingeniería",
        como_conocio="web", motivacion="Estudiar",
        fecha_inscripcion=datetime.now(timezone.utc) - timedelta(days=600),
    )
    session.add(legajo)
    tokens = {}
    for usuario in usuarios:
        token, _, _ = create_token_pair(session, usuario)
        tokens[usuario.role] = f"Bearer {token}"
    session.commit()

    def obtener_session() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_db] = obtener_session
    try:
        with TestClient(app) as cliente:
            yield cliente, session, cohorte, legajo, tokens, usuarios[0]
    finally:
        app.dependency_overrides.pop(get_db, None)
        session.close()
        motor.dispose()


def _cabecera(tokens: dict[str, str], rol: str = "COORDINADOR") -> dict[str, str]:
    return {"Authorization": tokens[rol]}


def _crear_seminario(cliente: TestClient, cohorte: Cohorte, tokens: dict[str, str]) -> str:
    respuesta = cliente.post("/api/v1/seminarios", headers=_cabecera(tokens), json={
        "cohorte_id": str(cohorte.id), "nombre": "Metodología",
        "docente_nombre": "Docente", "docente_email": "docente@example.com",
        "fecha_fin_cuatrimestre": (date.today() + timedelta(days=30)).isoformat(),
        "carrera": "Especialización", "es_obligatorio": True,
    })
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()["id"]


def _confirmar(cliente: TestClient, cohorte: Cohorte, carrera: str, tokens: dict[str, str]) -> None:
    respuesta = cliente.post("/api/v1/graduacion/planes/confirmar", headers=_cabecera(tokens), json={
        "cohorte_id": str(cohorte.id), "carrera": carrera, "confirmar": True,
    })
    assert respuesta.status_code == 200, respuesta.text


def test_flujo_por_carrera_plan_aprobacion_y_dashboard(entorno, monkeypatch) -> None:
    cliente, session, cohorte, legajo, tokens, coordinador = entorno
    mensajes = []
    monkeypatch.setattr("src.seguimiento_graduacion.aplicacion.alertas.enviar_mensaje_correo", mensajes.append)
    ruta = f"/api/v1/legajos/{legajo.id}/semaforo"
    assert cliente.get(ruta).status_code == 401
    assert cliente.get(ruta, headers=_cabecera(tokens, "CPR")).status_code == 403
    assert {item["estado"] for item in cliente.get(ruta, headers=_cabecera(tokens)).json()} == {"SIN_DATOS"}
    seminario = _crear_seminario(cliente, cohorte, tokens)
    _confirmar(cliente, cohorte, "Especialización", tokens)
    _confirmar(cliente, cohorte, "Maestría", tokens)
    asignacion = cliente.post("/api/v1/graduacion/asignaciones", headers=_cabecera(tokens, "ADMIN"), json={
        "carrera": "Especialización", "usuario_id": str(coordinador.id),
    })
    assert asignacion.status_code == 201
    recalculo = cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens))
    assert recalculo.status_code == 200, recalculo.text
    assert recalculo.json() == {"cambios": 2, "alertas_enviadas": 1, "alertas_pendientes": 0}
    valores = {item["carrera"]: item for item in cliente.get(ruta, headers=_cabecera(tokens)).json()}
    assert valores["Especialización"]["estado"] == "ROJO"
    assert valores["Especialización"]["seminarios_adeudados"] == 1
    assert valores["Maestría"]["estado"] == "AMARILLO"
    assert len(mensajes) == 1
    assert "Ana Pérez" in mensajes[0].get_content()
    assert "Días restantes" in mensajes[0].get_content()
    assert cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens)).json()["cambios"] == 0
    assert len(mensajes) == 1
    listado = cliente.get("/api/v1/graduacion/en-riesgo", headers=_cabecera(tokens))
    assert listado.status_code == 200
    assert len(listado.json()) == 1 and listado.json()[0]["legajo_id"] == str(legajo.id)
    excel = cliente.get("/api/v1/graduacion/en-riesgo/exportar", headers=_cabecera(tokens))
    with ZipFile(BytesIO(excel.content)) as archivo:
        assert b"Ana" in archivo.read("xl/worksheets/sheet1.xml")

    assert cliente.post(f"/api/v1/seminarios/{seminario}/inscripciones", headers=_cabecera(tokens), json={
        "legajo_ids": [str(legajo.id)],
    }).status_code == 204
    enlace = cliente.post(f"/api/v1/seminarios/{seminario}/enlace", headers=_cabecera(tokens), json={}).json()
    docente = {"Authorization": f"Bearer {enlace['token']}"}
    clase = cliente.post(f"/api/v1/seminarios/{seminario}/clases", headers=docente, json={}).json()["id"]
    cliente.patch(f"/api/v1/seminarios/{seminario}/asistencias", headers=docente, json={
        "asistencias": [{"clase_id": clase, "legajo_id": str(legajo.id), "presente": True}],
    })
    cliente.patch(f"/api/v1/seminarios/{seminario}/notas", headers=docente, json={
        "notas": [{"legajo_id": str(legajo.id), "nota": 8}],
    })
    cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens))
    actual = cliente.get(ruta, headers=_cabecera(tokens)).json()[0]
    assert actual["estado"] == "AMARILLO"
    assert actual["seminarios_adeudados"] == 0
    assert actual["dias_sin_avance"] == 0
    assert cliente.get("/api/v1/graduacion/en-riesgo", headers=_cabecera(tokens)).json() == []
    eventos = list(session.scalars(select(EventoAuditoria).where(EventoAuditoria.accion == "semaforo_cambiado")))
    assert any(evento.detalles["estado_anterior"] == "ROJO" and evento.detalles["estado_nuevo"] == "AMARILLO" for evento in eventos)


def test_alerta_sin_asignacion_y_reintento_smtp(entorno, monkeypatch) -> None:
    cliente, session, cohorte, _, tokens, coordinador = entorno
    _crear_seminario(cliente, cohorte, tokens)
    _confirmar(cliente, cohorte, "Especialización", tokens)
    primera = cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens))
    assert primera.json()["alertas_pendientes"] == 1
    assert session.scalar(select(AlertaRiesgo)).destinatarios_definidos is False
    assert cliente.post("/api/v1/graduacion/asignaciones", headers=_cabecera(tokens), json={
        "carrera": "Especialización", "usuario_id": str(coordinador.id),
    }).status_code == 201

    def fallar(_mensaje) -> None:
        raise OSError("SMTP no disponible")

    monkeypatch.setattr("src.seguimiento_graduacion.aplicacion.alertas.enviar_mensaje_correo", fallar)
    fallida = cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens))
    assert fallida.json()["alertas_pendientes"] == 1
    mensajes = []
    monkeypatch.setattr("src.seguimiento_graduacion.aplicacion.alertas.enviar_mensaje_correo", mensajes.append)
    reintento = cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens))
    assert reintento.json()["alertas_enviadas"] == 1
    assert reintento.json()["alertas_pendientes"] == 0
    assert len(mensajes) == 1
    assert cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens)).json()["alertas_enviadas"] == 0


def test_cambio_de_plan_invalida_calculo_y_verde_manual(entorno, monkeypatch) -> None:
    cliente, session, cohorte, legajo, tokens, _ = entorno
    monkeypatch.setattr("src.seguimiento_graduacion.aplicacion.alertas.enviar_mensaje_correo", lambda _: None)
    seminario = _crear_seminario(cliente, cohorte, tokens)
    _confirmar(cliente, cohorte, "Especialización", tokens)
    cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens))
    ruta = f"/api/v1/legajos/{legajo.id}/semaforo"
    assert cliente.patch(ruta, headers=_cabecera(tokens, "CPR"), json={"carrera": "Especialización", "estado": "VERDE"}).status_code == 403
    manual = cliente.patch(ruta, headers=_cabecera(tokens), json={"carrera": "Especialización", "estado": "VERDE"})
    assert manual.status_code == 200 and manual.json()["estado"] == "VERDE"
    cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens))
    assert cliente.get(ruta, headers=_cabecera(tokens)).json()[0]["estado"] == "ROJO"
    assert cliente.patch(f"/api/v1/seminarios/{seminario}/plan", headers=_cabecera(tokens), json={
        "carrera": "Especialización", "es_obligatorio": False,
    }).status_code == 200
    assert cliente.get(ruta, headers=_cabecera(tokens)).json()[0]["estado"] == "SIN_DATOS"
    assert cliente.get("/api/v1/graduacion/en-riesgo", headers=_cabecera(tokens)).json() == []
    assert session.scalar(select(SemaforoGraduacion)).estado == "ROJO"
    _confirmar(cliente, cohorte, "Especialización", tokens)
    assert cliente.get(ruta, headers=_cabecera(tokens)).json()[0]["estado"] == "SIN_EVALUAR"
    assert cliente.get("/api/v1/graduacion/en-riesgo", headers=_cabecera(tokens)).json() == []
    assert cliente.patch(ruta, headers=_cabecera(tokens), json={"carrera": "Especialización", "estado": "VERDE"}).status_code == 409
    cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens))
    assert cliente.get(ruta, headers=_cabecera(tokens)).json()[0]["estado"] == "AMARILLO"


def test_reasigna_entrega_pendiente_sin_enviar_a_coordinador_desvinculado(entorno, monkeypatch) -> None:
    cliente, session, cohorte, _, tokens, coordinador = entorno
    _crear_seminario(cliente, cohorte, tokens)
    _confirmar(cliente, cohorte, "Especialización", tokens)
    asignacion = cliente.post("/api/v1/graduacion/asignaciones", headers=_cabecera(tokens), json={
        "carrera": "Especialización", "usuario_id": str(coordinador.id),
    }).json()

    def fallar(_mensaje) -> None:
        raise OSError("SMTP no disponible")

    monkeypatch.setattr("src.seguimiento_graduacion.aplicacion.alertas.enviar_mensaje_correo", fallar)
    assert cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens)).json()["alertas_pendientes"] == 1
    assert cliente.delete(f"/api/v1/graduacion/asignaciones/{asignacion['id']}", headers=_cabecera(tokens, "ADMIN")).status_code == 204
    otro = User(email="otro@example.com", password_hash="sin-uso", role="COORDINADOR")
    session.add(otro)
    session.commit()
    assert cliente.post("/api/v1/graduacion/asignaciones", headers=_cabecera(tokens), json={
        "carrera": "Especialización", "usuario_id": str(otro.id),
    }).status_code == 201
    mensajes = []
    monkeypatch.setattr("src.seguimiento_graduacion.aplicacion.alertas.enviar_mensaje_correo", mensajes.append)
    assert cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens)).json()["alertas_pendientes"] == 1
    assert mensajes == []
    resultado = cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens)).json()
    assert resultado["alertas_enviadas"] == 1
    assert resultado["alertas_pendientes"] == 0
    assert [mensaje["To"] for mensaje in mensajes] == [otro.email]


def test_avances_y_paginacion_con_roles(entorno) -> None:
    cliente, _, cohorte, legajo, tokens, _ = entorno
    ruta = f"/api/v1/legajos/{legajo.id}/avances-tesis"
    avance = {"carrera": "Maestría", "fecha": date.today().isoformat(), "descripcion": "Revisión de tesis"}
    assert cliente.post(ruta, headers=_cabecera(tokens), json=avance).status_code == 403
    assert cliente.post(ruta, headers=_cabecera(tokens, "CPR"), json={**avance, "fecha": (date.today() + timedelta(days=1)).isoformat()}).status_code == 422
    assert cliente.post(ruta, headers=_cabecera(tokens, "CPR"), json=avance).status_code == 201
    _crear_seminario(cliente, cohorte, tokens)
    _confirmar(cliente, cohorte, "Especialización", tokens)
    _confirmar(cliente, cohorte, "Maestría", tokens)
    cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens))
    estados = cliente.get(f"/api/v1/legajos/{legajo.id}/semaforo", headers=_cabecera(tokens)).json()
    assert next(item for item in estados if item["carrera"] == "Maestría")["dias_sin_avance"] == 0
    assert len(cliente.get("/api/v1/graduacion/en-riesgo?page=1&limit=1", headers=_cabecera(tokens)).json()) == 1
    assert cliente.get("/api/v1/graduacion/en-riesgo?page=2&limit=1", headers=_cabecera(tokens)).json() == []


def test_alerta_se_posterga_hasta_recalcular_plan_reconfirmado(entorno, monkeypatch) -> None:
    cliente, session, cohorte, _, tokens, coordinador = entorno
    seminario = _crear_seminario(cliente, cohorte, tokens)
    _confirmar(cliente, cohorte, "Especialización", tokens)
    assert cliente.post("/api/v1/graduacion/recalcular", headers=_cabecera(tokens)).json()["alertas_pendientes"] == 1
    assert cliente.post("/api/v1/graduacion/asignaciones", headers=_cabecera(tokens), json={
        "carrera": "Especialización", "usuario_id": str(coordinador.id),
    }).status_code == 201
    assert cliente.patch(f"/api/v1/seminarios/{seminario}/plan", headers=_cabecera(tokens), json={
        "carrera": "Especialización", "es_obligatorio": False,
    }).status_code == 200
    mensajes = []
    monkeypatch.setattr("src.seguimiento_graduacion.aplicacion.alertas.enviar_mensaje_correo", mensajes.append)
    assert enviar_alertas_pendientes(session) == 0
    _confirmar(cliente, cohorte, "Especialización", tokens)
    assert enviar_alertas_pendientes(session) == 0
    assert mensajes == []
