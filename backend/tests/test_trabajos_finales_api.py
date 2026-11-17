from collections.abc import Generator
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from main import app
from src.authentication.application.security import hash_password
from src.authentication.infrastructure.models import User
from src.core.config import settings
from src.db.base import Base
from src.db.session import get_db
from src.inscripcion.application.acceso_propietario import crear_credencial_propietario
from src.inscripcion.infrastructure.models import Cohorte, Legajo
from src.seguimiento_graduacion.infraestructura.modelos import TrabajoFinal
from src.shared.auditoria.modelos import EventoAuditoria


@pytest.fixture
def entorno(tmp_path: Path) -> Generator[tuple[TestClient, Session, Legajo, dict[str, str]], None, None]:
    motor = create_engine(f"sqlite:///{tmp_path / 'graduacion.db'}")
    Base.metadata.create_all(motor)
    session = Session(motor)
    clave = "ClaveSegura123!"
    hash_clave = hash_password(clave)
    usuarios = [
        User(email=f"{rol.lower()}@example.com", password_hash=hash_clave, role=rol)
        for rol in ("CPR", "COORDINADOR", "ADMIN")
    ]
    cohorte = Cohorte(anio=2026, nombre="Cohorte 2026")
    session.add_all([*usuarios, cohorte])
    session.flush()
    legajo = Legajo(
        cohorte_id=cohorte.id,
        carreras=["Maestría"],
        dni="20123456",
        apellido="Pérez",
        nombre="Ana",
        nacionalidad="Argentina",
        email="ana@example.com",
        email_alternativo="alternativo@example.com",
        telefono_movil="2211234567",
        domicilio="Calle 1",
        ciudad="La Plata",
        provincia="Buenos Aires",
        pais="Argentina",
        titulo_grado="Ingeniería",
        como_conocio="web",
        motivacion="Motivación",
    )
    session.add(legajo)
    session.commit()

    def obtener_session() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_db] = obtener_session
    try:
        with TestClient(app) as cliente:
            credenciales = {}
            for usuario in usuarios:
                respuesta = cliente.post(
                    "/api/v1/auth/login",
                    json={"email": usuario.email, "password": clave},
                )
                assert respuesta.status_code == 200
                credenciales[usuario.role] = f"Bearer {respuesta.json()['access_token']}"
            yield cliente, session, legajo, credenciales
    finally:
        app.dependency_overrides.pop(get_db, None)
        session.close()
        motor.dispose()


def _datos() -> dict[str, object]:
    return {
        "tipo": "Maestría",
        "titulo": "  Investigación aplicada  ",
        "director_nombre": "  María Pérez  ",
        "director_email": "directora@example.com",
        "codirector": "Carlos Suárez",
        "fecha_aprobacion_cpr": "2026-10-10",
        "numero_resolucion": "123/2026",
    }


def _cabecera(credenciales: dict[str, str], rol: str) -> dict[str, str]:
    return {"Authorization": credenciales[rol]}


def test_creacion_modificacion_y_consulta_persistente(entorno) -> None:
    cliente, session, legajo, credenciales = entorno
    ruta = f"/api/v1/legajos/{legajo.id}/trabajo-final"
    respuesta = cliente.post(ruta, json=_datos(), headers=_cabecera(credenciales, "CPR"))
    assert respuesta.status_code == 201
    creado = respuesta.json()
    assert creado["legajo_id"] == str(legajo.id)
    assert creado["titulo"] == "Investigación aplicada"
    assert creado["director_nombre"] == "María Pérez"
    assert creado["director_email"] == "directora@example.com"

    modificacion = cliente.patch(
        f"/api/v1/trabajos-finales/{creado['id']}",
        json={"titulo": "Nuevo título", "codirector": None, "tipo": "Doctorado"},
        headers=_cabecera(credenciales, "CPR"),
    )
    assert modificacion.status_code == 200
    assert modificacion.json()["codirector"] is None
    assert modificacion.json()["director_nombre"] == "María Pérez"

    segundo = cliente.post(ruta, json=_datos(), headers=_cabecera(credenciales, "CPR"))
    assert segundo.status_code == 201
    for rol in ("CPR", "COORDINADOR"):
        lista = cliente.get(ruta, headers=_cabecera(credenciales, rol))
        assert lista.status_code == 200
        assert {item["id"] for item in lista.json()} == {creado["id"], segundo.json()["id"]}

    session.expire_all()
    registro = session.get(TrabajoFinal, UUID(creado["id"]))
    assert registro.titulo == "Nuevo título"
    assert registro.tipo == "Doctorado"
    eventos = list(session.scalars(select(EventoAuditoria).order_by(EventoAuditoria.creado_en)))
    assert [evento.accion for evento in eventos].count("trabajo_final_creado") == 2
    cambio = next(evento for evento in eventos if evento.accion == "trabajo_final_modificado")
    assert cambio.rol_actor == "CPR"
    assert cambio.detalles["campos"] == ["codirector", "tipo", "titulo"]


@pytest.mark.parametrize("rol", ["COORDINADOR", "ADMIN"])
def test_operaciones_denegadas_quedan_auditadas(entorno, rol: str) -> None:
    cliente, session, legajo, credenciales = entorno
    id_trabajo = str(uuid4())
    crear = cliente.post(
        f"/api/v1/legajos/{legajo.id}/trabajo-final",
        json=_datos(),
        headers=_cabecera(credenciales, rol),
    )
    editar = cliente.patch(
        f"/api/v1/trabajos-finales/{id_trabajo}",
        json={"titulo": "No autorizado"},
        headers=_cabecera(credenciales, rol),
    )
    assert crear.status_code == editar.status_code == 403
    assert session.scalar(select(TrabajoFinal)) is None
    eventos = list(
        session.scalars(
            select(EventoAuditoria).where(
                EventoAuditoria.accion == "trabajo_final_acceso_denegado"
            )
        )
    )
    assert len(eventos) == 2
    assert all(evento.rol_actor == rol and evento.id_actor is not None for evento in eventos)
    assert {evento.detalles["metodo"] for evento in eventos} == {"POST", "PATCH"}
    assert any(evento.id_recurso == id_trabajo for evento in eventos)
    assert any(evento.detalles["legajo_id"] == str(legajo.id) for evento in eventos)


def test_autenticacion_validaciones_y_recursos_inexistentes(entorno) -> None:
    cliente, session, legajo, credenciales = entorno
    ruta = f"/api/v1/legajos/{legajo.id}/trabajo-final"
    cpr = _cabecera(credenciales, "CPR")
    no_autenticado = cliente.post(ruta, json=_datos())
    assert no_autenticado.status_code == 401
    assert no_autenticado.headers["www-authenticate"] == "Bearer"
    assert no_autenticado.json()["error"] == "UNAUTHORIZED"
    assert no_autenticado.json()["statusCode"] == 401
    assert no_autenticado.json()["timestamp"].endswith("Z")
    assert cliente.post(ruta, json=_datos(), headers={"Authorization": "Bearer invalido"}).status_code == 401
    assert cliente.get(ruta, headers=_cabecera(credenciales, "ADMIN")).status_code == 403
    assert cliente.post(f"/api/v1/legajos/{uuid4()}/trabajo-final", json=_datos(), headers=cpr).status_code == 404
    assert cliente.get(f"/api/v1/legajos/{uuid4()}/trabajo-final", headers=cpr).status_code == 404
    assert cliente.patch(f"/api/v1/trabajos-finales/{uuid4()}", json={"titulo": "T"}, headers=cpr).status_code == 404

    for cambios in (
        {"tipo": "Tesis"},
        {"titulo": "   "},
        {"director_email": "invalido"},
        {"fecha_aprobacion_cpr": "no es fecha"},
        {"numero_resolucion": None},
        {"otro": "valor"},
    ):
        assert cliente.post(ruta, json={**_datos(), **cambios}, headers=cpr).status_code == 422
    error = cliente.post(ruta, json={**_datos(), "titulo": " "}, headers=cpr).json()
    assert error["error"] == "VALIDATION_ERROR"
    assert error["field"] == "titulo"
    creado = cliente.post(ruta, json=_datos(), headers=cpr).json()
    ruta_edicion = f"/api/v1/trabajos-finales/{creado['id']}"
    for cambios in ({}, {"titulo": None}, {"titulo": " "}, {"director_email": None}, {"legajo_id": str(uuid4())}):
        assert cliente.patch(ruta_edicion, json=cambios, headers=cpr).status_code == 422
    assert session.get(TrabajoFinal, UUID(creado["id"])).titulo == "Investigación aplicada"


def test_aspirante_autenticado_no_puede_modificar_y_se_audita(entorno) -> None:
    cliente, session, legajo, credenciales = entorno
    credencial = crear_credencial_propietario()
    legajo.token_propietario_hash = credencial.token_hash
    legajo.token_propietario_expira_en = credencial.expira_en
    session.commit()
    ruta = f"/api/v1/legajos/{legajo.id}/trabajo-final"
    creado = cliente.post(ruta, json=_datos(), headers=_cabecera(credenciales, "CPR")).json()
    cabecera = {"Authorization": f"Bearer {credencial.token}"}
    assert cliente.post(ruta, json=_datos(), headers=cabecera).status_code == 403
    assert cliente.patch(
        f"/api/v1/trabajos-finales/{creado['id']}",
        json={"titulo": "No autorizado"},
        headers=cabecera,
    ).status_code == 403
    eventos = list(
        session.scalars(
            select(EventoAuditoria).where(
                EventoAuditoria.accion == "trabajo_final_acceso_denegado",
                EventoAuditoria.rol_actor == "ASPIRANTE",
            )
        )
    )
    assert len(eventos) == 2
    assert all(evento.id_actor is None for evento in eventos)
    assert all(evento.detalles["legajo_actor_id"] == str(legajo.id) for evento in eventos)


def test_identificador_invalido_no_impide_auditar_denegacion(entorno) -> None:
    cliente, session, _, credenciales = entorno
    respuesta = cliente.patch(
        f"/api/v1/trabajos-finales/{'x' * 200}",
        json={"titulo": "No autorizado"},
        headers=_cabecera(credenciales, "ADMIN"),
    )
    assert respuesta.status_code == 403
    evento = session.scalar(
        select(EventoAuditoria).where(EventoAuditoria.accion == "trabajo_final_acceso_denegado")
    )
    assert evento.id_recurso is None


def test_openapi_refleja_campos_opcionales_y_no_anulables_del_patch(entorno) -> None:
    cliente, _, _, _ = entorno
    esquema = cliente.get("/api/openapi.json").json()["components"]["schemas"]["ActualizarTrabajoFinal"]
    assert "required" not in esquema
    assert esquema["minProperties"] == 1
    for campo, definicion in esquema["properties"].items():
        if campo == "codirector":
            assert {"type": "null"} in definicion["anyOf"]
        else:
            assert "default" not in definicion
            assert {"type": "null"} not in definicion.get("anyOf", [])


def test_preflight_cors_para_operaciones_del_modulo(entorno) -> None:
    cliente, _, legajo, _ = entorno
    for metodo, ruta in (
        ("POST", f"/api/v1/legajos/{legajo.id}/trabajo-final"),
        ("PATCH", f"/api/v1/trabajos-finales/{uuid4()}"),
        ("GET", f"/api/v1/legajos/{legajo.id}/trabajo-final"),
    ):
        respuesta = cliente.options(
            ruta,
            headers={
                "Origin": settings.cors_origin,
                "Access-Control-Request-Method": metodo,
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        assert respuesta.status_code == 200
        assert respuesta.headers["access-control-allow-origin"] == settings.cors_origin
        assert respuesta.headers["access-control-allow-credentials"] == "true"
