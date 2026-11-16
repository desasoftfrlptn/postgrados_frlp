from collections.abc import Generator
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from main import app
from src.autenticacion.aplicacion.seguridad import cifrar_contrasena
from src.autenticacion.infraestructura.modelos import SesionAutenticacion, Usuario
from src.core.config import settings
from src.db.base import Base
from src.db.session import get_db
from src.inscripcion.infrastructure.models import (
    Cohorte,
    DocumentoInscripcion,
    Legajo,
)

CONTRASENA_PRUEBA = "ContrasenaSegura123!"


@pytest.fixture
def contexto_api(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, Session], None, None]:
    motor = create_engine(f"sqlite:///{tmp_path / 'documentos.db'}")
    Base.metadata.create_all(motor)
    sesion = Session(motor)
    monkeypatch.setattr(settings, "storage_path", tmp_path / "archivos_privados")

    def obtener_sesion() -> Generator[Session, None, None]:
        yield sesion

    app.dependency_overrides[get_db] = obtener_sesion
    with TestClient(app) as cliente:
        yield cliente, sesion
    app.dependency_overrides.pop(get_db, None)
    sesion.close()
    motor.dispose()


def crear_usuario(
    sesion: Session,
    *,
    email: str = "coordinador@example.com",
    rol: str = "COORDINADOR",
) -> Usuario:
    usuario = Usuario(
        email=email,
        hash_contrasena=cifrar_contrasena(CONTRASENA_PRUEBA),
        rol=rol,
    )
    sesion.add(usuario)
    sesion.commit()
    return usuario


def iniciar_sesion(
    cliente: TestClient,
    sesion: Session,
    *,
    email: str = "coordinador@example.com",
    rol: str = "COORDINADOR",
) -> dict[str, str]:
    crear_usuario(sesion, email=email, rol=rol)
    respuesta = cliente.post(
        "/api/v1/auth/login",
        json={"email": email, "password": CONTRASENA_PRUEBA},
    )
    assert respuesta.status_code == 200
    return {"Authorization": f"Bearer {respuesta.json()['access_token']}"}


def crear_legajo(sesion: Session) -> Legajo:
    cohorte = Cohorte(
        anio=2026,
        nombre=f"Cohorte {uuid4()}",
        inscripcion_abierta=True,
    )
    sesion.add(cohorte)
    sesion.flush()
    legajo = Legajo(
        cohorte_id=cohorte.id,
        estado="Pendiente",
        carreras=["Maestría"],
        dni="30123456",
        apellido="Pérez",
        nombre="Ana",
        nacionalidad="Argentina",
        email="aspirante@example.com",
        email_alternativo="alternativo@example.com",
        telefono_movil="2215551234",
        domicilio="Calle 1",
        ciudad="La Plata",
        provincia="Buenos Aires",
        pais="Argentina",
        titulo_grado="Ingeniería",
        como_conocio="web",
        motivacion="Quiero profundizar mis conocimientos en esta disciplina.",
        solicita_beca=False,
    )
    sesion.add(legajo)
    sesion.commit()
    return legajo


def test_login_emite_tokens_y_perfil_autenticado(
    contexto_api: tuple[TestClient, Session],
) -> None:
    cliente, sesion = contexto_api
    crear_usuario(sesion)

    respuesta = cliente.post(
        "/api/v1/auth/login",
        json={"email": "COORDINADOR@example.com", "password": CONTRASENA_PRUEBA},
    )

    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["token_type"] == "bearer"
    assert datos["expires_in"] > 0
    assert datos["user"]["email"] == "coordinador@example.com"
    assert datos["user"]["role"] == "COORDINADOR"
    assert "token_acceso" not in datos
    assert "token_renovacion" not in datos
    assert sesion.scalar(select(SesionAutenticacion)) is not None

    perfil = cliente.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {datos['access_token']}"},
    )
    assert perfil.status_code == 200
    assert perfil.json()["role"] == "COORDINADOR"


def test_login_rechaza_contrasena_incorrecta(
    contexto_api: tuple[TestClient, Session],
) -> None:
    cliente, sesion = contexto_api
    crear_usuario(sesion)

    respuesta = cliente.post(
        "/api/v1/auth/login",
        json={"email": "coordinador@example.com", "password": "incorrecta"},
    )

    assert respuesta.status_code == 401
    assert respuesta.json()["detail"] == "Email o contraseña incorrectos"


def test_refresh_rotacion_y_cierre_revocan_sesion(
    contexto_api: tuple[TestClient, Session],
) -> None:
    cliente, sesion = contexto_api
    crear_usuario(sesion)
    inicio = cliente.post(
        "/api/v1/auth/login",
        json={"email": "coordinador@example.com", "password": CONTRASENA_PRUEBA},
    )
    tokens_iniciales = inicio.json()

    renovacion = cliente.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens_iniciales["refresh_token"]},
    )

    assert renovacion.status_code == 200
    tokens_renovados = renovacion.json()
    assert tokens_renovados["refresh_token"] != tokens_iniciales["refresh_token"]
    assert tokens_renovados["access_token"] != tokens_iniciales["access_token"]

    cierre = cliente.post(
        "/api/v1/auth/logout",
        json={"refresh_token": tokens_renovados["refresh_token"]},
    )
    assert cierre.status_code == 204
    perfil = cliente.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens_renovados['access_token']}"},
    )
    assert perfil.status_code == 401


def test_listado_documental_requiere_autenticacion(
    contexto_api: tuple[TestClient, Session],
) -> None:
    cliente, sesion = contexto_api
    legajo = crear_legajo(sesion)

    respuesta = cliente.get(f"/api/v1/legajos/{legajo.id}/documentos")

    assert respuesta.status_code == 401


def test_listado_documental_requiere_rol_coordinador(
    contexto_api: tuple[TestClient, Session],
) -> None:
    cliente, sesion = contexto_api
    legajo = crear_legajo(sesion)
    encabezados = iniciar_sesion(
        cliente,
        sesion,
        email="cpr@example.com",
        rol="CPR",
    )

    respuesta = cliente.get(
        f"/api/v1/legajos/{legajo.id}/documentos",
        headers=encabezados,
    )

    assert respuesta.status_code == 403


def test_coordinador_obtiene_solo_metadatos_documentales(
    contexto_api: tuple[TestClient, Session],
) -> None:
    cliente, sesion = contexto_api
    legajo = crear_legajo(sesion)
    documento = DocumentoInscripcion(
        legajo_id=legajo.id,
        tipo="DNI",
        path_storage="inscripciones/identificador-privado.pdf",
        checksum_sha256="a" * 64,
    )
    sesion.add(documento)
    sesion.commit()
    sesion.refresh(documento)
    encabezados = iniciar_sesion(cliente, sesion)

    respuesta = cliente.get(
        f"/api/v1/legajos/{legajo.id}/documentos",
        headers=encabezados,
    )

    assert respuesta.status_code == 200
    assert respuesta.json() == [
        {
            "id": str(documento.id),
            "tipo": "DNI",
            "fecha_subida": documento.fecha_subida.isoformat(),
        }
    ]
    assert "path_storage" not in respuesta.text
    assert "checksum_sha256" not in respuesta.text
    assert "identificador-privado.pdf" not in respuesta.text


def test_listado_documental_devuelve_404_para_legajo_inexistente(
    contexto_api: tuple[TestClient, Session],
) -> None:
    cliente, sesion = contexto_api
    encabezados = iniciar_sesion(cliente, sesion)

    respuesta = cliente.get(
        f"/api/v1/legajos/{uuid4()}/documentos",
        headers=encabezados,
    )

    assert respuesta.status_code == 404
