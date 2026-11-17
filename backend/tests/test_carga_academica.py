import base64
import hashlib
from collections.abc import Generator
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from uuid import UUID, uuid4
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from main import app
from src.authentication.application.security import create_token_pair
from src.authentication.infrastructure.models import User
from src.carga_academica.infraestructura.modelos import AccesoDocente, InscripcionSeminario
from src.carga_academica.aplicacion.recordatorios import enviar_recordatorios
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


def test_clases_asistencias_notas_y_exportacion(entorno) -> None:
    cliente, _, cohorte, legajo, tokens = entorno
    seminario = _crear(cliente, cohorte, tokens)
    coord = {"Authorization": tokens["COORDINADOR"]}
    assert cliente.patch(
        f"/api/v1/seminarios/{seminario}/plan", headers=coord,
        json={"carrera": "Maestría", "es_obligatorio": True},
    ).status_code == 200
    assert cliente.post(
        f"/api/v1/seminarios/{seminario}/inscripciones", headers=coord,
        json={"legajo_ids": [str(legajo.id)]},
    ).status_code == 204
    enlace = _enlace(cliente, seminario, tokens)
    docente = {"Authorization": f"Bearer {enlace['token']}"}
    clases = []
    for fecha in (date.today() - timedelta(days=1), date.today(), date.today() + timedelta(days=1)):
        respuesta = cliente.post(
            f"/api/v1/seminarios/{seminario}/clases", headers=docente,
            json={"fecha": fecha.isoformat()},
        )
        assert respuesta.status_code == 201
        clases.append(respuesta.json()["id"])
    ruta_asistencias = f"/api/v1/seminarios/{seminario}/asistencias"
    asistencias = [
        {"clase_id": clases[0], "legajo_id": str(legajo.id), "presente": True},
        {"clase_id": clases[2], "legajo_id": str(legajo.id), "presente": True},
    ]
    assert cliente.patch(ruta_asistencias, headers=docente, json={"asistencias": asistencias}).status_code == 200
    ruta_notas = f"/api/v1/seminarios/{seminario}/notas"
    for nota in (0, 11, 7.55, "4", True):
        assert cliente.patch(ruta_notas, headers=docente, json={"notas": [{"legajo_id": str(legajo.id), "nota": nota}]}).status_code == 422
    respuesta = cliente.patch(ruta_notas, headers=docente, json={"notas": [{"legajo_id": str(legajo.id), "nota": 4}]})
    assert respuesta.status_code == 200
    estudiante = respuesta.json()["estudiantes"][0]
    assert Decimal(estudiante["porcentaje_asistencia"]) == 50
    assert estudiante["condicion"] == "Libre"
    assert cliente.patch(ruta_asistencias, headers=docente, json={"asistencias": [
        {"clase_id": clases[1], "legajo_id": str(legajo.id), "presente": True},
        {"clase_id": clases[1], "legajo_id": str(uuid4()), "presente": True},
    ]}).status_code == 422
    assert cliente.patch(ruta_asistencias, headers=docente, json={"asistencias": [
        {"clase_id": clases[1], "legajo_id": str(legajo.id), "presente": True},
    ]}).json()["estudiantes"][0]["condicion"] == "Aprobado"
    historial = cliente.get(f"/api/v1/legajos/{legajo.id}/seminarios", headers=coord)
    assert historial.status_code == 200
    assert historial.json()[0]["condicion"] == "Aprobado"
    descarga = cliente.get(f"/api/v1/seminarios/{seminario}/exportar", headers=docente)
    assert descarga.status_code == 200
    with ZipFile(BytesIO(descarga.content)) as archivo:
        hoja = archivo.read("xl/worksheets/sheet1.xml")
        assert b"Ana" in hoja and b"100.00" in hoja


def test_recordatorios_notas_respetan_plazo_y_frecuencia(entorno, monkeypatch) -> None:
    cliente, session, cohorte, legajo, tokens = entorno
    seminario = _crear(cliente, cohorte, tokens)
    coord = {"Authorization": tokens["COORDINADOR"]}
    cliente.post(f"/api/v1/seminarios/{seminario}/inscripciones", headers=coord, json={"legajo_ids": [str(legajo.id)]})
    ahora = datetime.now(timezone.utc)
    assert cliente.patch(
        f"/api/v1/seminarios/{seminario}/fecha-limite-notas",
        headers=coord, json={"fecha_limite_notas": (ahora + timedelta(hours=47)).isoformat()},
    ).status_code == 200
    mensajes = []
    monkeypatch.setattr("src.carga_academica.aplicacion.recordatorios.enviar_mensaje_correo", mensajes.append)
    assert enviar_recordatorios(session, ahora) == 1
    assert "Metodología" in mensajes[0].get_content()
    assert "1 estudiante" in mensajes[0].get_content()
    assert "#token=" in mensajes[0].get_content()
    assert enviar_recordatorios(session, ahora + timedelta(hours=23)) == 0
    assert enviar_recordatorios(session, ahora + timedelta(hours=24)) == 1


def test_asistencia_futura_no_registra_avance_anticipado(entorno) -> None:
    cliente, session, cohorte, legajo, tokens = entorno
    seminario = _crear(cliente, cohorte, tokens)
    coord = {"Authorization": tokens["COORDINADOR"]}
    assert cliente.post(f"/api/v1/seminarios/{seminario}/inscripciones", headers=coord, json={
        "legajo_ids": [str(legajo.id)],
    }).status_code == 204
    docente = {"Authorization": f"Bearer {_enlace(cliente, seminario, tokens)['token']}"}
    clase = cliente.post(f"/api/v1/seminarios/{seminario}/clases", headers=docente, json={
        "fecha": (date.today() + timedelta(days=1)).isoformat(),
    }).json()["id"]
    assert cliente.patch(f"/api/v1/seminarios/{seminario}/asistencias", headers=docente, json={
        "asistencias": [{"clase_id": clase, "legajo_id": str(legajo.id), "presente": True}],
    }).status_code == 200
    assert session.scalar(select(InscripcionSeminario)).ultimo_avance_en is None


def test_importar_notas_desde_excel(entorno) -> None:
    from src.shared.http.excel import generar_excel

    cliente, _, cohorte, legajo, tokens = entorno
    seminario = _crear(cliente, cohorte, tokens)
    coord = {"Authorization": tokens["COORDINADOR"]}
    assert cliente.post(
        f"/api/v1/seminarios/{seminario}/inscripciones",
        headers=coord,
        json={"legajo_ids": [str(legajo.id)]},
    ).status_code == 204
    docente = {"Authorization": f"Bearer {_enlace(cliente, seminario, tokens)['token']}"}

    clase = cliente.post(
        f"/api/v1/seminarios/{seminario}/clases",
        headers=docente,
        json={"fecha": date.today().isoformat()},
    ).json()["id"]
    assert cliente.patch(
        f"/api/v1/seminarios/{seminario}/asistencias",
        headers=docente,
        json={"asistencias": [{"clase_id": clase, "legajo_id": str(legajo.id), "presente": True}]},
    ).status_code == 200

    excel_valido = generar_excel([["Email", "Nota"], [legajo.email, "8.5"]], "Notas").getvalue()
    resp = cliente.post(
        f"/api/v1/seminarios/{seminario}/importar-notas",
        headers=docente,
        files={"archivo": ("notas.xlsx", excel_valido, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert resp.status_code == 200
    est = resp.json()["estudiantes"][0]
    assert Decimal(est["nota"]) == Decimal("8.5")
    assert est["condicion"] == "Aprobado"

    excel_invalido = generar_excel([["Email", "Nota"], [legajo.email, "11"]], "Notas").getvalue()
    assert cliente.post(
        f"/api/v1/seminarios/{seminario}/importar-notas",
        headers=docente,
        files={"archivo": ("notas.xlsx", excel_invalido, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    ).status_code == 422

    assert cliente.post(
        f"/api/v1/seminarios/{seminario}/importar-notas",
        headers=docente,
        files={"archivo": ("notas.xlsx", b"no-es-un-zip", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    ).status_code == 422