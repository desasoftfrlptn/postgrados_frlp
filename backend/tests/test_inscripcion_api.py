import hashlib
import json
from collections.abc import Generator
from pathlib import Path
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.exc import SQLAlchemyError
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
    assert all(
        documento.checksum_sha256 == hashlib.sha256(PDF).hexdigest()
        for documento in documents
    )
    assert all(
        Path(documento.path_storage).parent == Path("inscripciones")
        and Path(documento.path_storage).suffix == ".pdf"
        and UUID(Path(documento.path_storage).stem)
        for documento in documents
    )
    assert str(settings.storage_path) not in response.text
    assert all(
        f"{field}.pdf" not in response.text
        for field in DOCUMENT_FIELDS
    )
    assert all(
        (settings.storage_path / documento.path_storage).is_file()
        for documento in documents
    )


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


def test_rechaza_mime_incorrecto_sin_persistir(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client
    files = valid_files(archivo_dni=("dni.pdf", PDF, "application/octet-stream"))

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(),
        files=files,
    )

    assert response.status_code == 422
    assert "debe tener formato PDF" in response.json()["detail"]
    assert session.scalar(select(Legajo)) is None
    assert list(session.scalars(select(DocumentoInscripcion))) == []
    assert not (settings.storage_path / "inscripciones").exists()


def test_rechaza_archivo_mayor_a_5_mb_sin_persistir(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    contenido = b"%PDF-" + b"x" * (max_bytes - len(b"%PDF-") + 1)
    files = valid_files(archivo_dni=("dni.pdf", contenido, "application/pdf"))

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(),
        files=files,
    )

    assert response.status_code == 413
    assert "supera el máximo" in response.json()["detail"]
    assert session.scalar(select(Legajo)) is None
    assert list(session.scalars(select(DocumentoInscripcion))) == []
    assert not (settings.storage_path / "inscripciones").exists()


def test_acepta_archivo_del_tamano_maximo(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    contenido = b"%PDF-" + b"x" * (max_bytes - len(b"%PDF-"))
    files = valid_files(archivo_dni=("dni.pdf", contenido, "application/pdf"))

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(),
        files=files,
    )

    assert response.status_code == 201
    documento = session.scalar(
        select(DocumentoInscripcion).where(DocumentoInscripcion.tipo == "DNI")
    )
    assert documento is not None
    assert (settings.storage_path / documento.path_storage).stat().st_size == max_bytes
    assert documento.checksum_sha256 == hashlib.sha256(contenido).hexdigest()


@pytest.mark.parametrize(
    ("campo", "tipo"),
    [
        ("archivo_preinscripcion", "FORM_INSCRIPCION"),
        ("archivo_dni", "DNI"),
        ("archivo_titulo", "TITULO"),
        ("archivo_partida", "PARTIDA"),
        ("archivo_cuit", "CUIT"),
    ],
)
def test_requiere_cada_documento_obligatorio(
    client: tuple[TestClient, Session, Cohorte],
    campo: str,
    tipo: str,
) -> None:
    test_client, session, _ = client
    files = valid_files()
    files.pop(campo)

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(),
        files=files,
    )

    assert response.status_code == 422
    assert f"documento obligatorio: {tipo}" in response.json()["detail"]
    assert session.scalar(select(Legajo)) is None
    assert list(session.scalars(select(DocumentoInscripcion))) == []
    assert not (settings.storage_path / "inscripciones").exists()


@pytest.mark.parametrize(
    ("campos_formulario", "campo_archivo", "tipo"),
    [
        ({"titulo_posgrado": "Doctorado"}, "archivo_posgrado", "TITULO_POSGRADO"),
        (
            {"solicita_beca": "true", "tipo_beca": "30%"},
            "archivo_beca",
            "FORM_BECA",
        ),
    ],
)
def test_requiere_documentos_segun_condiciones_de_inscripcion(
    client: tuple[TestClient, Session, Cohorte],
    campos_formulario: dict[str, str],
    campo_archivo: str,
    tipo: str,
) -> None:
    test_client, session, _ = client
    files = valid_files()
    files.pop(campo_archivo, None)

    response = test_client.post(
        "/api/v1/inscripciones",
        data=valid_form(**campos_formulario),
        files=files,
    )

    assert response.status_code == 422
    assert f"documento obligatorio: {tipo}" in response.json()["detail"]
    assert session.scalar(select(Legajo)) is None
    assert list(session.scalars(select(DocumentoInscripcion))) == []
    assert not (settings.storage_path / "inscripciones").exists()


def test_rechaza_falla_de_base_de_datos_sin_persistencia_parcial(
    client: tuple[TestClient, Session, Cohorte],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_client, session, _ = client

    def fallar_commit() -> None:
        raise SQLAlchemyError("Falla simulada al confirmar la inscripcion")

    monkeypatch.setattr(session, "commit", fallar_commit)

    with pytest.raises(SQLAlchemyError, match="Falla simulada"):
        test_client.post(
            "/api/v1/inscripciones",
            data=valid_form(),
            files=valid_files(),
        )

    assert session.scalar(select(Legajo)) is None
    assert list(session.scalars(select(DocumentoInscripcion))) == []
    assert list((settings.storage_path / "inscripciones").glob("*.pdf")) == []


def test_beca_requires_percentage_and_signed_document(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client
    form = valid_form(solicita_beca="true")

    response = test_client.post(
        "/api/v1/inscripciones",
        data=form,
        files=valid_files(),
    )

    assert response.status_code == 422
    assert "porcentaje de beca" in str(response.json()["detail"])
    assert session.scalar(select(Legajo)) is None


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
