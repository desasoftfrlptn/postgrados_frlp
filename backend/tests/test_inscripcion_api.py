import hashlib
import json
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from src.core.config import settings
from src.db.base import Base
from src.db.session import get_db
from src.inscripcion.infrastructure.models import Cohorte, DocumentoInscripcion, Legajo
from main import app

PDF = b"%PDF-1.4\ncontenido de prueba\n%%EOF"
DOCUMENT_FIELDS = {
    "archivo_preinscripcion": "FORM_INSCRIPCION",
    "archivo_dni": "DNI",
    "archivo_titulo": "TITULO",
    "archivo_partida": "PARTIDA",
    "archivo_cuit": "CUIT",
}


@pytest.fixture
def client(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, Session, Cohorte], None, None]:
    engine = create_engine(f"sqlite:///{tmp_path / 'inscripcion.db'}")
    Base.metadata.create_all(engine)
    session = Session(engine)
    cohorte = Cohorte(anio=2026, nombre="Cohorte 2026", inscripcion_abierta=True)
    session.add(cohorte)
    session.commit()
    monkeypatch.setattr(settings, "storage_path", tmp_path / "private-storage")

    def override_get_db() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(
        "src.inscripcion.presentation.router.enviar_confirmacion_inscripcion",
        lambda email, nombre, codigo: None,
    )
    with TestClient(app) as test_client:
        yield test_client, session, cohorte
    app.dependency_overrides.clear()
    session.close()
    engine.dispose()


def valid_form(**overrides: str) -> dict[str, str]:
    form = {
        "carreras": json.dumps(["Especialización"]),
        "dni": "30123456",
        "nombre": "Ana",
        "apellido": "Pérez",
        "nacionalidad": "Argentina",
        "email": "ana@example.com",
        "email_alternativo": "ana.alt@example.com",
        "telefono_movil": "2215551234",
        "telefono_fijo": "",
        "domicilio": "Calle 1",
        "ciudad": "La Plata",
        "provincia": "Buenos Aires",
        "pais": "Argentina",
        "titulo_grado": "Ingeniería",
        "titulo_posgrado": "",
        "como_conocio": "web",
        "motivacion": "Quiero profundizar mis conocimientos en esta disciplina.",
        "solicita_beca": "false",
        "tipo_beca": "",
    }
    form.update(overrides)
    return form


def valid_files(**overrides: tuple[str, bytes, str]) -> dict[str, tuple[str, bytes, str]]:
    files = {
        field: (f"{field}.pdf", PDF, "application/pdf")
        for field in DOCUMENT_FIELDS
    }
    files.update(overrides)
    return files


def test_public_enrollment_saves_legajo_and_private_documents(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(),
        files=valid_files(),
    )

    assert response.status_code == 201
    assert response.json()["estado"] == "Pendiente"
    assert response.json()["codigo_seguimiento"]
    legajo = session.scalar(select(Legajo))
    documents = list(session.scalars(select(DocumentoInscripcion)))
    assert legajo is not None
    assert legajo.dni == "30123456"
    assert legajo.email == "ana@example.com"
    assert {documento.tipo for documento in documents} == set(DOCUMENT_FIELDS.values())
    assert all(len(documento.checksum_sha256) == 64 for documento in documents)
    assert all((settings.storage_path / documento.path_storage).is_file() for documento in documents)
    assert all(
        documento.checksum_sha256 == hashlib.sha256(PDF).hexdigest()
        for documento in documents
    )


def test_public_enrollment_sends_confirmation_email(
    client: tuple[TestClient, Session, Cohorte],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_client, _, _ = client
    sent: list[tuple[str, str, str]] = []
    monkeypatch.setattr(
        "src.inscripcion.presentation.router.enviar_confirmacion_inscripcion",
        lambda email, nombre, codigo: sent.append((email, nombre, codigo)),
    )

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(),
        files=valid_files(),
    )

    assert response.status_code == 201
    assert response.json()["estado"] == "Pendiente"
    assert "confirmación a tu email" in response.json()["mensaje"]
    assert sent == [("ana@example.com", "Ana", response.json()["codigo_seguimiento"])]


@pytest.mark.parametrize(
    ("duplicate_fields", "message"),
    [
        (
            {"email": "other@example.com", "email_alternativo": "other.alt@example.com"},
            "Ya existe una preinscripción con este DNI para la cohorte actual",
        ),
        (
            {"dni": "30123457", "email_alternativo": "other.alt@example.com"},
            "Ya existe una preinscripción con este email para la cohorte actual",
        ),
    ],
)
def test_duplicate_identity_is_rejected_without_saving_a_second_legajo(
    client: tuple[TestClient, Session, Cohorte],
    duplicate_fields: dict[str, str],
    message: str,
) -> None:
    test_client, session, _ = client
    test_client.post("/api/v1/inscripciones", data=valid_form(), files=valid_files())
    duplicate = valid_form(**duplicate_fields)

    response = test_client.post(
        "/api/v1/inscripciones",
        data=duplicate,
        files=valid_files(),
    )

    assert response.status_code == 409
    assert response.json()["detail"] == message
    assert len(list(session.scalars(select(Legajo)))) == 1
    assert len(list(session.scalars(select(DocumentoInscripcion)))) == 5
    assert len(list((settings.storage_path / "inscripciones").glob("*.pdf"))) == 5


def test_invalid_pdf_is_rejected_before_persistence(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client
    files = valid_files(archivo_dni=("dni.pdf", b"no es un PDF", "application/pdf"))

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(),
        files=files,
    )

    assert response.status_code == 422
    assert "no es un PDF válido" in response.json()["detail"]
    assert session.scalar(select(Legajo)) is None


def test_invalid_email_is_rejected_before_persistence(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(email="no-es-un-email"),
        files=valid_files(),
    )

    assert response.status_code == 422
    assert session.scalar(select(Legajo)) is None


@pytest.mark.parametrize("tipo_beca", ["30%", "100%"])
def test_scholarship_request_saves_type_and_private_form(
    client: tuple[TestClient, Session, Cohorte],
    tipo_beca: str,
) -> None:
    test_client, session, _ = client

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(solicita_beca="true", tipo_beca=tipo_beca),
        files=valid_files(archivo_beca=("formulario-beca.pdf", PDF, "application/pdf")),
    )

    assert response.status_code == 201
    legajo = session.scalar(select(Legajo))
    assert legajo is not None
    assert legajo.solicita_beca is True
    assert legajo.tipo_beca == tipo_beca
    documents = list(
        session.scalars(
            select(DocumentoInscripcion).where(
                DocumentoInscripcion.legajo_id == legajo.id
            )
        )
    )
    form_beca = next(
        documento for documento in documents if documento.tipo == "FORM_BECA"
    )
    assert len(documents) == len(DOCUMENT_FIELDS) + 1
    assert form_beca.checksum_sha256 == hashlib.sha256(PDF).hexdigest()
    assert (settings.storage_path / form_beca.path_storage).is_file()


def test_scholarship_request_without_form_is_rejected_without_partial_persistence(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(solicita_beca="true", tipo_beca="30%"),
        files=valid_files(),
    )

    assert response.status_code == 422
    assert response.json()["detail"] == (
        "Falta adjuntar el documento obligatorio: FORM_BECA"
    )
    assert session.scalar(select(Legajo)) is None
    assert list(session.scalars(select(DocumentoInscripcion))) == []
    assert not (settings.storage_path / "inscripciones").exists()


def test_scholarship_request_without_percentage_is_rejected_without_partial_persistence(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(solicita_beca="true"),
        files=valid_files(
            archivo_beca=("formulario-beca.pdf", PDF, "application/pdf")
        ),
    )

    assert response.status_code == 422
    assert "Debe seleccionar el porcentaje de beca solicitado" in str(
        response.json()["detail"]
    )
    assert session.scalar(select(Legajo)) is None
    assert list(session.scalars(select(DocumentoInscripcion))) == []
    assert not (settings.storage_path / "inscripciones").exists()


def test_scholarship_type_without_request_is_rejected_without_partial_persistence(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(tipo_beca="30%"),
        files=valid_files(),
    )

    assert response.status_code == 422
    assert "No puede indicar un tipo de beca si no la solicita" in str(
        response.json()["detail"]
    )
    assert session.scalar(select(Legajo)) is None
    assert list(session.scalars(select(DocumentoInscripcion))) == []
    assert not (settings.storage_path / "inscripciones").exists()


def test_scholarship_request_rejects_unsupported_percentage(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(solicita_beca="true", tipo_beca="50%"),
        files=valid_files(
            archivo_beca=("formulario-beca.pdf", PDF, "application/pdf")
        ),
    )

    assert response.status_code == 422
    assert "30%" in str(response.json()["detail"])
    assert "100%" in str(response.json()["detail"])
    assert session.scalar(select(Legajo)) is None
    assert list(session.scalars(select(DocumentoInscripcion))) == []
    assert not (settings.storage_path / "inscripciones").exists()


def test_enrollment_requires_an_open_cohort(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, cohorte = client
    cohorte.inscripcion_abierta = False
    session.commit()

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(),
        files=valid_files(),
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "No hay una cohorte con inscripción abierta"
    assert session.scalar(select(Legajo)) is None
