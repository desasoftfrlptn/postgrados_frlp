from collections.abc import Generator
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from uuid import UUID, uuid4
from xml.etree import ElementTree
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from main import app
from src.authentication.application.security import create_token_pair
from src.authentication.infrastructure.models import User
from src.carga_academica.dominio.reglas import calcular_condicion, calcular_porcentaje_asistencia
from src.carga_academica.aplicacion.recordatorios import enviar_recordatorios
from src.carga_academica.infraestructura.excel import generar_excel
from src.carga_academica.infraestructura.modelos import AccesoDocente, Seminario
from src.core.config import settings
from src.db.base import Base
from src.db.session import get_db
from src.inscripcion.infrastructure.models import Cohorte, Legajo
from src.shared.auditoria.modelos import EventoAuditoria


@pytest.fixture
def entorno(tmp_path: Path) -> Generator[tuple[TestClient, Session, Cohorte, Legajo, dict[str, str]], None, None]:
    engine = create_engine(f"sqlite:///{tmp_path / 'academico.db'}")
    Base.metadata.create_all(engine)
    session = Session(engine)
    cohorte = Cohorte(anio=2026, nombre="Cohorte", inscripcion_abierta=True)
    usuario = User(email="coordinacion@example.com", password_hash="sin-uso", role="COORDINADOR")
    session.add_all([cohorte, usuario])
    session.flush()
    legajo = Legajo(
        cohorte_id=cohorte.id, estado="Activo", carreras=["Especialización"],
        dni="12345678", apellido="Pérez", nombre="Ana", nacionalidad="Argentina",
        email="ana@example.com", email_alternativo="alternativo@example.com",
        telefono_movil="123", domicilio="Calle 1", ciudad="La Plata",
        provincia="Buenos Aires", pais="Argentina", titulo_grado="Ingeniería",
        como_conocio="web", motivacion="Estudiar",
    )
    session.add(legajo)
    token, _, _ = create_token_pair(session, usuario)
    session.commit()

    def reemplazar_sesion() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_db] = reemplazar_sesion
    with TestClient(app) as cliente:
        yield cliente, session, cohorte, legajo, {"Authorization": f"Bearer {token}"}
    app.dependency_overrides.clear()
    session.close()
    engine.dispose()


def _crear(cliente: TestClient, cohorte: Cohorte, coordinador: dict[str, str]) -> str:
    respuesta = cliente.post("/api/v1/seminarios", headers=coordinador, json={
        "cohorte_id": str(cohorte.id), "nombre": "Metodología",
        "docente_nombre": "Docente", "docente_email": "docente@example.com",
    })
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()["id"]


def _enlace(cliente: TestClient, id: str, coordinador: dict[str, str]) -> dict[str, str]:
    respuesta = cliente.post(f"/api/v1/seminarios/{id}/enlace", json={}, headers=coordinador)
    assert respuesta.status_code == 200
    assert respuesta.headers["cache-control"] == "no-store"
    return {"Authorization": "Bearer " + respuesta.json()["token"]}


def test_reglas_con_fechas_futuras_y_limites() -> None:
    hoy = date(2026, 11, 16)
    fechas = [hoy - timedelta(days=i) for i in range(3)] + [hoy + timedelta(days=1), hoy + timedelta(days=2)]
    porcentaje = calcular_porcentaje_asistencia(fechas, {fechas[0], fechas[1], fechas[3]}, hoy)
    assert porcentaje == Decimal(200) / 3
    assert calcular_porcentaje_asistencia([hoy + timedelta(days=1)], set(), hoy) == 0
    assert calcular_condicion(None, Decimal(100)) == "Pendiente"
    assert calcular_condicion(Decimal("3.9"), Decimal(100)) == "Desaprobado"
    assert calcular_condicion(Decimal("4"), Decimal("74.999")) == "Libre"
    assert calcular_condicion(Decimal("4"), Decimal("75")) == "Aprobado"


def test_flujo_planilla_y_lotes_atomicos(entorno: tuple[TestClient, Session, Cohorte, Legajo, dict[str, str]]) -> None:
    cliente, session, cohorte, legajo, coordinador = entorno
    id = _crear(cliente, cohorte, coordinador)
    assert cliente.post(f"/api/v1/seminarios/{id}/inscripciones", headers=coordinador, json={"legajo_ids": [str(legajo.id)]}).status_code == 204
    docente = _enlace(cliente, id, coordinador)
    clases = []
    for fecha in [date.today() - timedelta(days=2), date.today() - timedelta(days=1), date.today(), date.today() + timedelta(days=1)]:
        respuesta = cliente.post(f"/api/v1/seminarios/{id}/clases", headers=docente, json={"fecha": fecha.isoformat()})
        assert respuesta.status_code == 201, respuesta.text
        clases.append(respuesta.json()["id"])
    respuesta = cliente.get(f"/api/v1/seminarios/{id}/estudiantes", headers=docente)
    assert respuesta.status_code == 200
    assert all(not a["presente"] for a in respuesta.json()["estudiantes"][0]["asistencias"])
    registros = [{"clase_id": c, "legajo_id": str(legajo.id), "presente": True} for c in (clases[0], clases[1], clases[3])]
    respuesta = cliente.patch(f"/api/v1/seminarios/{id}/asistencias", headers=docente, json={"asistencias": registros})
    assert respuesta.status_code == 200, respuesta.text
    assert Decimal(respuesta.json()["estudiantes"][0]["porcentaje_asistencia"]) == Decimal("66.67")
    respuesta = cliente.patch(f"/api/v1/seminarios/{id}/notas", headers=docente, json={"notas": [{"legajo_id": str(legajo.id), "nota": 4}]})
    assert respuesta.json()["estudiantes"][0]["condicion"] == "Libre"
    respuesta = cliente.patch(f"/api/v1/seminarios/{id}/asistencias", headers=docente, json={"asistencias": [
        {"clase_id": clases[2], "legajo_id": str(legajo.id), "presente": True},
        {"clase_id": clases[2], "legajo_id": str(uuid4()), "presente": True},
    ]})
    assert respuesta.status_code == 422
    assert cliente.get(f"/api/v1/seminarios/{id}/estudiantes", headers=docente).json()["estudiantes"][0]["condicion"] == "Libre"
    respuesta = cliente.patch(f"/api/v1/seminarios/{id}/asistencias", headers=docente, json={"asistencias": [
        {"clase_id": clases[2], "legajo_id": str(legajo.id), "presente": True},
    ]})
    assert respuesta.json()["estudiantes"][0]["condicion"] == "Aprobado"
    for nota in [0, 11, 7.55, "abc", True]:
        respuesta = cliente.patch(f"/api/v1/seminarios/{id}/notas", headers=docente, json={"notas": [{"legajo_id": str(legajo.id), "nota": nota}]})
        assert respuesta.status_code == 422
    respuesta = cliente.patch(f"/api/v1/seminarios/{id}/notas", headers=docente, json={"notas": [{"legajo_id": str(legajo.id), "nota": 3.9}]})
    assert respuesta.json()["estudiantes"][0]["condicion"] == "Desaprobado"
    historial = cliente.get(f"/api/v1/legajos/{legajo.id}/seminarios", headers=coordinador)
    assert historial.status_code == 200
    assert historial.json()[0]["condicion"] == "Desaprobado"
    assert cliente.get(f"/api/v1/legajos/{legajo.id}/seminarios", headers=docente).status_code == 401
    descarga = cliente.get(f"/api/v1/seminarios/{id}/exportar", headers=docente)
    assert descarga.status_code == 200
    with ZipFile(BytesIO(descarga.content)) as archivo:
        hoja = archivo.read("xl/worksheets/sheet1.xml")
        ElementTree.fromstring(hoja)
        assert b"Ana" in hoja and b"66.67" not in hoja and b"100.00" in hoja
    fecha_nueva = (date.today() + timedelta(days=2)).isoformat()
    assert cliente.patch(f"/api/v1/seminarios/{id}/clases/{clases[0]}", headers=docente, json={"fecha": fecha_nueva}).status_code == 200
    assert cliente.get(f"/api/v1/seminarios/{id}/estudiantes", headers=docente).json()["estudiantes"][0]["porcentaje_asistencia"] == "100.00"
    assert session.scalar(select(EventoAuditoria).where(EventoAuditoria.accion == "registrar_notas")) is not None
    legajo.estado = "Baja"
    session.commit()
    assert cliente.get(f"/api/v1/seminarios/{id}/estudiantes", headers=docente).json()["estudiantes"] == []


def test_autorizacion_revocacion_y_expiracion(entorno: tuple[TestClient, Session, Cohorte, Legajo, dict[str, str]]) -> None:
    cliente, session, cohorte, _, coordinador = entorno
    primero = _crear(cliente, cohorte, coordinador)
    segundo = _crear(cliente, cohorte, coordinador)
    docente = _enlace(cliente, primero, coordinador)
    assert cliente.get(f"/api/v1/seminarios/{primero}/estudiantes").status_code == 401
    assert cliente.get(f"/api/v1/seminarios/{segundo}/estudiantes", headers=docente).status_code == 403
    assert cliente.post(f"/api/v1/seminarios/{segundo}/clases", json={}, headers=docente).status_code == 403
    assert cliente.patch(f"/api/v1/seminarios/{segundo}/notas", json={"notas": []}, headers=docente).status_code == 403
    assert cliente.get(f"/api/v1/seminarios/{primero}/estudiantes", headers=coordinador).status_code == 403
    nuevo = _enlace(cliente, primero, coordinador)
    assert cliente.get(f"/api/v1/seminarios/{primero}/estudiantes", headers=docente).status_code == 401
    acceso = session.scalar(select(AccesoDocente).where(AccesoDocente.seminario_id == UUID(primero)))
    acceso.expira_en = datetime.now(timezone.utc) - timedelta(seconds=1)
    session.commit()
    assert cliente.get(f"/api/v1/seminarios/{primero}/estudiantes", headers=nuevo).status_code == 401
    assert cliente.post("/api/v1/seminarios", json={}).status_code == 401


def test_cors_preflight(entorno: tuple[TestClient, Session, Cohorte, Legajo, dict[str, str]]) -> None:
    cliente, _, _, _, _ = entorno
    respuesta = cliente.options(f"/api/v1/seminarios/{uuid4()}/asistencias", headers={
        "Origin": settings.cors_origin, "Access-Control-Request-Method": "PATCH",
        "Access-Control-Request-Headers": "authorization,content-type",
    })
    assert respuesta.status_code == 200
    assert respuesta.headers["access-control-allow-origin"] == settings.cors_origin


def test_excel_admite_mas_de_26_columnas_y_texto_literal() -> None:
    contenido = generar_excel([["=texto"] + [str(i) for i in range(30)]])
    with ZipFile(contenido) as archivo:
        hoja = archivo.read("xl/worksheets/sheet1.xml")
        ElementTree.fromstring(hoja)
        assert b'AE1' in hoja and b'=texto' in hoja and b"<f>" not in hoja


def test_recordatorios_respetan_plazo_frecuencia_y_notas(
    entorno: tuple[TestClient, Session, Cohorte, Legajo, dict[str, str]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cliente, session, cohorte, legajo, coordinador = entorno
    id = _crear(cliente, cohorte, coordinador)
    cliente.post(f"/api/v1/seminarios/{id}/inscripciones", headers=coordinador, json={"legajo_ids": [str(legajo.id)]})
    docente = _enlace(cliente, id, coordinador)
    ahora = datetime.now(timezone.utc)
    seminario = session.get(Seminario, UUID(id))
    seminario.fecha_limite_notas = ahora + timedelta(hours=47)
    session.commit()
    enviados = []
    monkeypatch.setattr("src.carga_academica.aplicacion.recordatorios.enviar_mensaje_correo", enviados.append)
    assert enviar_recordatorios(session, ahora) == 1
    assert "Metodología" in enviados[0].get_content()
    assert "1 estudiante" in enviados[0].get_content()
    assert "#token=" in enviados[0].get_content()
    assert cliente.get(f"/api/v1/seminarios/{id}/estudiantes", headers=docente).status_code == 200
    assert enviar_recordatorios(session, ahora + timedelta(hours=23)) == 0
    assert enviar_recordatorios(session, ahora + timedelta(hours=24)) == 1
    cliente.patch(f"/api/v1/seminarios/{id}/notas", headers=docente, json={"notas": [{"legajo_id": str(legajo.id), "nota": 5}]})
    assert enviar_recordatorios(session, ahora + timedelta(hours=46)) == 0


def test_error_smtp_no_confirma_recordatorio(
    entorno: tuple[TestClient, Session, Cohorte, Legajo, dict[str, str]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cliente, session, cohorte, legajo, coordinador = entorno
    id = _crear(cliente, cohorte, coordinador)
    cliente.post(f"/api/v1/seminarios/{id}/inscripciones", headers=coordinador, json={"legajo_ids": [str(legajo.id)]})
    ahora = datetime.now(timezone.utc)
    seminario = session.get(Seminario, UUID(id))
    seminario.fecha_limite_notas = ahora + timedelta(hours=2)
    session.commit()

    def fallar(_: object) -> None:
        raise OSError("SMTP no disponible")

    monkeypatch.setattr("src.carga_academica.aplicacion.recordatorios.enviar_mensaje_correo", fallar)
    assert enviar_recordatorios(session, ahora) == 0
    assert session.get(Seminario, UUID(id)).ultimo_recordatorio_en is None
    assert session.scalar(select(AccesoDocente).where(AccesoDocente.seminario_id == UUID(id))) is None
