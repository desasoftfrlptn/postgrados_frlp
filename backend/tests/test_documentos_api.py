from collections.abc import Generator
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from pathlib import Path
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from main import app
from src.authentication.infrastructure.models import AuthRefreshSession, User
from src.core.config import settings
from src.db.base import Base
from src.db.session import get_db
from src.inscripcion.infrastructure.models import (
    Cohorte,
    DocumentoInscripcion,
    Legajo,
)

PDF_PRUEBA = b"%PDF-1.4\ncontenido privado\n%%EOF"


@pytest.fixture
def documentos_api(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, Session, DocumentoInscripcion, Path], None, None]:
    motor = create_engine(f"sqlite:///{tmp_path / 'documentos.db'}")
    Base.metadata.create_all(motor)
    sesion = Session(motor)
    cohorte = Cohorte(anio=2026, nombre="Cohorte documental")
    sesion.add(cohorte)
    sesion.flush()
    legajo = Legajo(
        cohorte_id=cohorte.id,
        estado="Pendiente",
        carreras=["Maestría"],
        dni="30123456",
        apellido="Aspirante",
        nombre="Ana",
        nacionalidad="Argentina",
        email="ana@example.com",
        email_alternativo="ana.alternativo@example.com",
        telefono_movil="2215551234",
        domicilio="Calle 1",
        ciudad="La Plata",
        provincia="Buenos Aires",
        pais="Argentina",
        titulo_grado="Ingeniería",
        como_conocio="web",
        motivacion="Quiero profundizar mis conocimientos en esta disciplina.",
    )
    sesion.add(legajo)
    sesion.flush()
    coordinador = User(
        email="coordinador@example.com",
        password_hash="test-password-hash",
        role="COORDINADOR",
    )
    cpr = User(
        email="cpr@example.com",
        password_hash="test-password-hash",
        role="CPR",
    )
    sesion.add_all((coordinador, cpr))
    sesion.flush()

    raiz_almacenamiento = tmp_path / "archivos_privados"
    monkeypatch.setattr(settings, "storage_path", raiz_almacenamiento)
    ruta_documento = raiz_almacenamiento / "inscripciones" / "documento.pdf"
    ruta_documento.parent.mkdir(parents=True)
    ruta_documento.write_bytes(PDF_PRUEBA)
    documento = DocumentoInscripcion(
        legajo_id=legajo.id,
        tipo="DNI",
        path_storage="inscripciones/documento.pdf",
        checksum_sha256="a" * 64,
    )
    sesion.add(documento)
    sesion.commit()

    def sobreescribir_sesion() -> Generator[Session, None, None]:
        yield sesion

    dependencias_previas = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = sobreescribir_sesion
    with TestClient(app) as cliente:
        yield cliente, sesion, documento, raiz_almacenamiento
    app.dependency_overrides.clear()
    app.dependency_overrides.update(dependencias_previas)
    sesion.close()
    motor.dispose()


def crear_token(
    sesion: Session,
    rol: str,
    *,
    expira_en: datetime | None = None,
) -> str:
    ahora = datetime.now(timezone.utc)
    usuario = sesion.scalar(select(User).where(User.role == rol))
    assert usuario is not None
    id_sesion = uuid4()
    sesion.add(
        AuthRefreshSession(
            id=id_sesion,
            family_id=uuid4(),
            user_id=usuario.id,
            token_hash=sha256(uuid4().bytes).hexdigest(),
            expires_at=ahora + timedelta(days=7),
        )
    )
    sesion.commit()
    return jwt.encode(
        {
            "sub": str(usuario.id),
            "sid": str(id_sesion),
            "role": rol,
            "type": "access",
            "iss": settings.jwt_issuer,
            "iat": int(ahora.timestamp()),
            "exp": int((expira_en or ahora + timedelta(minutes=5)).timestamp()),
        },
        settings.jwt_secret,
        algorithm="HS256",
    )


def encabezados_autorizacion(
    sesion: Session,
    rol: str = "COORDINADOR",
) -> dict[str, str]:
    return {"Authorization": f"Bearer {crear_token(sesion, rol)}"}


def test_coordinador_descarga_pdf_en_linea_sin_exponer_ruta(
    documentos_api: tuple[TestClient, Session, DocumentoInscripcion, Path],
) -> None:
    cliente, sesion, documento, raiz_almacenamiento = documentos_api

    respuesta = cliente.get(
        f"/api/v1/documentos/{documento.id}/download",
        headers=encabezados_autorizacion(sesion),
    )

    assert respuesta.status_code == 200
    assert respuesta.content == PDF_PRUEBA
    assert respuesta.headers["content-type"] == "application/pdf"
    assert respuesta.headers["content-disposition"] == (
        f'inline; filename="{documento.id}.pdf"'
    )
    assert respuesta.headers["cache-control"] == "private, no-store"
    assert respuesta.headers["x-content-type-options"] == "nosniff"
    assert str(raiz_almacenamiento) not in respuesta.text


def test_descarga_requiere_token(
    documentos_api: tuple[TestClient, Session, DocumentoInscripcion, Path],
) -> None:
    cliente, _, documento, _ = documentos_api

    respuesta = cliente.get(f"/api/v1/documentos/{documento.id}/download")

    assert respuesta.status_code == 401
    assert respuesta.headers["www-authenticate"] == "Bearer"


def test_descarga_rechaza_token_invalido_o_vencido(
    documentos_api: tuple[TestClient, Session, DocumentoInscripcion, Path],
) -> None:
    cliente, sesion, documento, _ = documentos_api
    token_vencido = crear_token(
        sesion,
        "COORDINADOR",
        expira_en=datetime.now(timezone.utc) - timedelta(minutes=1),
    )

    respuestas = [
        cliente.get(
            f"/api/v1/documentos/{documento.id}/download",
            headers={"Authorization": "Bearer token-invalido"},
        ),
        cliente.get(
            f"/api/v1/documentos/{documento.id}/download",
            headers={"Authorization": f"Bearer {token_vencido}"},
        ),
    ]

    assert [respuesta.status_code for respuesta in respuestas] == [401, 401]


def test_descarga_rechaza_rol_sin_permiso(
    documentos_api: tuple[TestClient, Session, DocumentoInscripcion, Path],
) -> None:
    cliente, sesion, documento, _ = documentos_api

    respuesta = cliente.get(
        f"/api/v1/documentos/{documento.id}/download",
        headers=encabezados_autorizacion(sesion, "CPR"),
    )

    assert respuesta.status_code == 403


def test_descarga_no_revela_existencia_de_documento_ni_ruta(
    documentos_api: tuple[TestClient, Session, DocumentoInscripcion, Path],
) -> None:
    cliente, sesion, documento, raiz_almacenamiento = documentos_api
    documento.path_storage = "../archivo-fuera.pdf"

    respuesta = cliente.get(
        f"/api/v1/documentos/{documento.id}/download",
        headers=encabezados_autorizacion(sesion),
    )

    assert respuesta.status_code == 404
    assert str(raiz_almacenamiento) not in respuesta.text


def test_descarga_retorna_404_si_falta_el_archivo(
    documentos_api: tuple[TestClient, Session, DocumentoInscripcion, Path],
) -> None:
    cliente, sesion, documento, _ = documentos_api
    documento.path_storage = "inscripciones/ausente.pdf"

    respuesta = cliente.get(
        f"/api/v1/documentos/{documento.id}/download",
        headers=encabezados_autorizacion(sesion),
    )

    assert respuesta.status_code == 404