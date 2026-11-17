import base64
import hashlib
from collections.abc import Generator
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from main import app
from src.authentication.application.security import create_token_pair
from src.authentication.infrastructure.models import User
from src.carga_academica.infraestructura.modelos import AccesoDocente
from src.core.config import settings
from src.db.base import Base
from src.db.session import get_db
from src.inscripcion.infrastructure.models import Cohorte, Legajo
from src.shared.auditoria.modelos import EventoAuditoria


@pytest.fixture
def entorno(tmp_path: Path) -> Generator[tuple[TestClient, Session, Cohorte, Legajo, dict[str, str]], None, None]:
    motor = create_engine(f"sqlite:///{tmp_path / 'docentes.db'}")
    Base.metadata.create_all(motor)
    session = Session(motor)
    cohorte = Cohorte(anio=2026, nombre="Cohorte")
    coordinador = User(email="coord@example.com", password_hash="sin-uso", role="COORDINADOR")
    cpr = User(email="cpr@example.com", password_hash="sin-uso", role="CPR")
    session.add_all((cohorte, coordinador, cpr))
    session.flush()
    legajo = Legajo(
        cohorte_id=cohorte.id, estado="Activo", carreras=["Maestría"], dni="12345678",
        apellido="Pérez", nombre="Ana", nacionalidad="Argentina", email="ana@example.com",
        email_alternativo="alternativo@example.com", telefono_movil="123", domicilio="Calle 1",
        ciudad="La Plata", provincia="Buenos Aires", pais="Argentina",
        titulo_grado="Ingeniería", como_conocio="web", motivacion="Estudiar",
    )
    session.add(legajo)
    tokens = {}
    for usuario in (coordinador, cpr):
        token, _, _ = create_token_pair(session, usuario)
        tokens[usuario.role] = f"Bearer {token}"
    session.commit()

    def obtener_session() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_db] = obtener_session
    try:
        with TestClient(app) as cliente:
            yield cliente, session, cohorte, legajo, tokens
    finally:
        app.dependency_overrides.pop(get_db, None)
        session.close()
        motor.dispose()


def _crear(cliente: TestClient, cohorte: Cohorte, tokens: dict[str, str]) -> str:
    respuesta = cliente.post(
        "/api/v1/seminarios",
        headers={"Authorization": tokens["COORDINADOR"]},
        json={
            "cohorte_id": str(cohorte.id),
            "nombre": "Metodología",
            "docente_nombre": "María Pérez",
            "docente_email": "docente@example.com",
            "fecha_fin_cuatrimestre": (date.today() + timedelta(days=30)).isoformat(),
        },
    )
    assert respuesta.status_code == 201, respuesta.text
    return respuesta.json()["id"]


def _enlace(cliente: TestClient, id: str, tokens: dict[str, str], datos: dict | None = None) -> dict:
    respuesta = cliente.post(
        f"/api/v1/seminarios/{id}/enlace",
        headers={"Authorization": tokens["COORDINADOR"]},
        json=datos if datos is not None else {},
    )
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.headers["cache-control"] == "no-store"
    return respuesta.json()


def test_flujo_docente_y_aislamiento(entorno) -> None:
    cliente, session, cohorte, legajo, tokens = entorno
    seminario = _crear(cliente, cohorte, tokens)
    otro = _crear(cliente, cohorte, tokens)
    coord = {"Authorization": tokens["COORDINADOR"]}
    inscripcion = cliente.post(
        f"/api/v1/seminarios/{seminario}/inscripciones",
        headers=coord,
        json={"legajo_ids": [str(legajo.id)]},
    )
    assert inscripcion.status_code == 204
    datos = _enlace(cliente, seminario, tokens)
    token = datos["token"]
    assert len(base64.urlsafe_b64decode(token + "=" * (-len(token) % 4))) >= 32
    assert datos["enlace"].endswith(f"/docente/seminarios/{seminario}#token={token}")
    guardado = session.scalar(select(AccesoDocente))
    assert guardado.token_hash == hashlib.sha256(token.encode("ascii")).hexdigest()
    assert token not in guardado.token_hash
    docente = {"Authorization": f"Bearer {token}"}
    listado = cliente.get(f"/api/v1/seminarios/{seminario}/estudiantes", headers=docente)
    assert listado.status_code == 200
    assert listado.headers["cache-control"] == "private, no-store"
    assert [est["legajo_id"] for est in listado.json()["estudiantes"]] == [str(legajo.id)]
    assert cliente.get(f"/api/v1/seminarios/{otro}/estudiantes", headers=docente).status_code == 403
    assert cliente.get(f"/api/v1/seminarios/{seminario}/estudiantes", headers=coord).status_code == 403
    assert cliente.get(f"/api/v1/seminarios/{seminario}/estudiantes").status_code == 401
    assert cliente.get("/api/v1/seminarios", headers=docente).status_code == 401
    assert cliente.get("/api/v1/seminarios", headers=coord).status_code == 200

    legajo.estado = "Baja"
    session.commit()
    assert cliente.get(f"/api/v1/seminarios/{seminario}/estudiantes", headers=docente).json()["estudiantes"] == []


def test_vencimiento_rotacion_y_permisos(entorno) -> None:
    cliente, session, cohorte, _, tokens = entorno
    seminario = _crear(cliente, cohorte, tokens)
    primero = _enlace(cliente, seminario, tokens)
    expira = datetime.fromisoformat(primero["expira_en"].replace("Z", "+00:00"))
    fin = date.today() + timedelta(days=30)
    assert expira.astimezone(timezone(timedelta(hours=-3))).date() == fin
    assert expira.astimezone(timezone(timedelta(hours=-3))).hour == 23
    primero_header = {"Authorization": f"Bearer {primero['token']}"}

    vencimiento = datetime.now(timezone.utc) + timedelta(days=2)
    segundo = _enlace(cliente, seminario, tokens, {"expira_en": vencimiento.isoformat()})
    assert datetime.fromisoformat(segundo["expira_en"].replace("Z", "+00:00")) == vencimiento
    assert cliente.get(f"/api/v1/seminarios/{seminario}/estudiantes", headers=primero_header).status_code == 401
    segundo_header = {"Authorization": f"Bearer {segundo['token']}"}
    coord = {"Authorization": tokens["COORDINADOR"]}
    assert cliente.post(f"/api/v1/seminarios/{seminario}/enlace", headers=coord, json={"expira_en": "2020-01-01T00:00:00Z"}).status_code == 422
    assert cliente.get(f"/api/v1/seminarios/{seminario}/estudiantes", headers=segundo_header).status_code == 200
    acceso = session.scalar(select(AccesoDocente).where(AccesoDocente.seminario_id == UUID(seminario)))
    acceso.expira_en = datetime.now(timezone.utc) - timedelta(seconds=1)
    session.commit()
    assert cliente.get(f"/api/v1/seminarios/{seminario}/estudiantes", headers=segundo_header).status_code == 401
    assert cliente.post(f"/api/v1/seminarios/{seminario}/enlace", headers=coord, json={"expira_en": "2030-01-01T00:00:00"}).status_code == 422
    assert cliente.post(f"/api/v1/seminarios/{seminario}/enlace", headers={"Authorization": tokens["CPR"]}, json={}).status_code == 403


def test_inscripciones_validan_cohorte_estado_y_duplicados(entorno) -> None:
    cliente, session, cohorte, legajo, tokens = entorno
    seminario = _crear(cliente, cohorte, tokens)
    coord = {"Authorization": tokens["COORDINADOR"]}
    ruta = f"/api/v1/seminarios/{seminario}/inscripciones"
    id_legajo = str(legajo.id)
    assert cliente.post(ruta, headers=coord, json={"legajo_ids": [id_legajo, id_legajo]}).status_code == 422
    assert cliente.post(ruta, headers=coord, json={"legajo_ids": [id_legajo, str(uuid4())]}).status_code == 422
    otra_cohorte = Cohorte(anio=2027, nombre="Otra cohorte")
    session.add(otra_cohorte)
    session.flush()
    legajo.cohorte_id = otra_cohorte.id
    session.commit()
    assert cliente.post(ruta, headers=coord, json={"legajo_ids": [id_legajo]}).status_code == 422
    legajo.cohorte_id = cohorte.id
    legajo.estado = "Pendiente"
    session.commit()
    assert cliente.post(ruta, headers=coord, json={"legajo_ids": [id_legajo]}).status_code == 422
    legajo.estado = "Activo"
    session.commit()
    assert cliente.post(ruta, headers=coord, json={"legajo_ids": [id_legajo]}).status_code == 204
    assert cliente.post(ruta, headers=coord, json={"legajo_ids": [id_legajo]}).status_code == 409


def test_docente_no_puede_modificar_tesis_y_se_audita(entorno) -> None:
    cliente, session, cohorte, legajo, tokens = entorno
    seminario = _crear(cliente, cohorte, tokens)
    enlace = _enlace(cliente, seminario, tokens)
    respuesta = cliente.post(
        f"/api/v1/legajos/{legajo.id}/trabajo-final",
        headers={"Authorization": f"Bearer {enlace['token']}"},
        json={
            "tipo": "TFI", "titulo": "Trabajo", "director_nombre": "Docente",
            "director_email": "docente@example.com", "fecha_aprobacion_cpr": "2026-01-01",
            "numero_resolucion": "1",
        },
    )
    assert respuesta.status_code == 403
    id_trabajo = str(uuid4())
    modificacion = cliente.patch(
        f"/api/v1/trabajos-finales/{id_trabajo}",
        headers={"Authorization": f"Bearer {enlace['token']}"},
        json={"titulo": "No autorizado"},
    )
    assert modificacion.status_code == 403
    eventos = list(session.scalars(select(EventoAuditoria).where(
        EventoAuditoria.accion == "trabajo_final_acceso_denegado",
        EventoAuditoria.rol_actor == "DOCENTE",
    )))
    assert len(eventos) == 2
    assert all(evento.detalles["seminario_actor_id"] == seminario for evento in eventos)
    assert any(evento.id_recurso == id_trabajo for evento in eventos)


def test_cors_preflight(entorno) -> None:
    cliente, _, _, _, _ = entorno
    respuesta = cliente.options(
        f"/api/v1/seminarios/{uuid4()}/estudiantes",
        headers={
            "Origin": settings.cors_origin, "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert respuesta.status_code == 200
    assert respuesta.headers["access-control-allow-origin"] == settings.cors_origin