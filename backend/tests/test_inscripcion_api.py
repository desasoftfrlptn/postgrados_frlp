import hashlib
import json
from collections.abc import Generator
from datetime import date, datetime, timezone
from io import BytesIO
from pathlib import Path
from uuid import UUID
from xml.etree import ElementTree
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from src.authentication.application.security import create_token_pair
from src.authentication.infrastructure.models import User
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
        lambda email, nombre, codigo, token, expira_en: None,
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


def create_auth_headers(session: Session, role: str) -> dict[str, str]:
    user = User(
        email=f"{role.lower()}@example.com",
        password_hash="x" * 60,
        role=role,
    )
    session.add(user)
    session.flush()
    access_token, _, _ = create_token_pair(session, user)
    session.commit()
    return {"Authorization": f"Bearer {access_token}"}


def create_legajo(
    *,
    cohorte_id: UUID,
    dni: str,
    apellido: str,
    solicita_beca: bool,
    tipo_beca: str | None,
    estado: str = "Pendiente",
    carreras: list[str] | None = None,
) -> Legajo:
    return Legajo(
        cohorte_id=cohorte_id,
        estado=estado,
        carreras=carreras if carreras is not None else ["Especialización"],
        dni=dni,
        apellido=apellido,
        nombre="Ana",
        nacionalidad="Argentina",
        email=f"{dni}@example.com",
        email_alternativo=f"{dni}.alt@example.com",
        telefono_movil="2215551234",
        domicilio="Calle 1",
        ciudad="La Plata",
        provincia="Buenos Aires",
        pais="Argentina",
        titulo_grado="Ingeniería",
        como_conocio="web",
        motivacion="Quiero profundizar mis conocimientos en esta disciplina.",
        solicita_beca=solicita_beca,
        tipo_beca=tipo_beca,
    )


def test_public_enrollment_saves_legajo_and_private_documents(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client

    response = test_client.post(
        "/api/v1/legajos",
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


def test_public_enrollment_sends_confirmation_email(
    client: tuple[TestClient, Session, Cohorte],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    test_client, session, _ = client
    sent: list[tuple[str, str, str, str, datetime]] = []
    monkeypatch.setattr(
        "src.inscripcion.presentation.router.enviar_confirmacion_inscripcion",
        lambda email, nombre, codigo, token, expira_en: sent.append(
            (email, nombre, codigo, token, expira_en)
        ),
    )

    response = test_client.post(
        "/api/v1/legajos",
        data=valid_form(),
        files=valid_files(),
    )

    assert response.status_code == 201
    assert response.json()["estado"] == "Pendiente"
    assert "confirmación a tu email" in response.json()["mensaje"]
    assert len(sent) == 1
    email, nombre, codigo, token, expira_en = sent[0]
    assert (email, nombre, codigo) == (
        "ana@example.com",
        "Ana",
        response.json()["codigo_seguimiento"],
    )
    legajo = session.scalar(select(Legajo))
    assert legajo is not None
    assert legajo.token_propietario_hash == hashlib.sha256(
        token.encode("ascii")
    ).hexdigest()
    expira_en_db = legajo.token_propietario_expira_en
    assert expira_en_db is not None
    if expira_en_db.tzinfo is None:
        expira_en_db = expira_en_db.replace(tzinfo=timezone.utc)
    assert expira_en_db == expira_en
    assert token not in response.text
    assert expira_en > datetime.now(timezone.utc)


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
    test_client.post("/api/v1/legajos", data=valid_form(), files=valid_files())
    duplicate = valid_form(**duplicate_fields)

    response = test_client.post(
        "/api/v1/legajos",
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
        "/api/v1/legajos",
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
        "/api/v1/legajos",
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
        "/api/v1/legajos",
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
        "/api/v1/legajos",
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
        "/api/v1/legajos",
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
        "/api/v1/legajos",
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
            "/api/v1/legajos",
            data=valid_form(),
            files=valid_files(),
        )

    assert session.scalar(select(Legajo)) is None
    assert list(session.scalars(select(DocumentoInscripcion))) == []
    assert list((settings.storage_path / "inscripciones").glob("*.pdf")) == []


@pytest.mark.parametrize("tipo_beca", ["30%", "100%"])
def test_beca_requires_percentage_and_signed_document(
    client: tuple[TestClient, Session, Cohorte],
    tipo_beca: str,
) -> None:
    test_client, session, _ = client

    response = test_client.post(
        "/api/v1/legajos",
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
        "/api/v1/legajos",
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
        "/api/v1/legajos",
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
        "/api/v1/legajos",
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
        "/api/v1/legajos",
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
        "/api/v1/legajos",
        data=valid_form(),
        files=valid_files(),
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "No hay una cohorte con inscripción abierta"
    assert session.scalar(select(Legajo)) is None


def test_legajo_list_requires_authentication(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, _, _ = client

    response = test_client.get("/api/v1/legajos")

    assert response.status_code == 401


def test_legajo_list_rejects_non_coordinator_roles(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client
    headers = create_auth_headers(session, "CPR")

    response = test_client.get("/api/v1/legajos", headers=headers)

    assert response.status_code == 403
    assert response.json()["detail"] == "No tenés permisos para acceder a este recurso"


def test_coordinator_can_see_scholarship_types_and_form_presence(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, cohorte = client
    without_scholarship = create_legajo(
        cohorte_id=cohorte.id,
        dni="30123456",
        apellido="Aspirante",
        solicita_beca=False,
        tipo_beca=None,
    )
    scholarship_30 = create_legajo(
        cohorte_id=cohorte.id,
        dni="30123457",
        apellido="Becaria",
        solicita_beca=True,
        tipo_beca="30%",
    )
    scholarship_100 = create_legajo(
        cohorte_id=cohorte.id,
        dni="30123458",
        apellido="Becario",
        solicita_beca=True,
        tipo_beca="100%",
    )
    session.add_all((without_scholarship, scholarship_30, scholarship_100))
    session.flush()
    session.add_all(
        (
            DocumentoInscripcion(
                legajo_id=scholarship_30.id,
                tipo="FORM_BECA",
                path_storage="inscripciones/privado-30.pdf",
                checksum_sha256="a" * 64,
            ),
            DocumentoInscripcion(
                legajo_id=scholarship_100.id,
                tipo="FORM_BECA",
                path_storage="inscripciones/privado-100.pdf",
                checksum_sha256="b" * 64,
            ),
        )
    )
    headers = create_auth_headers(session, "COORDINADOR")

    response = test_client.get("/api/v1/legajos", headers=headers)

    assert response.status_code == 200
    by_dni = {legajo["dni"]: legajo for legajo in response.json()}
    assert set(by_dni["30123457"]) == {
        "id",
        "numero_legajo",
        "apellido",
        "nombre",
        "dni",
        "estado",
        "carreras",
        "solicita_beca",
        "tipo_beca",
        "documento_beca",
    }
    assert by_dni["30123456"]["solicita_beca"] is False
    assert by_dni["30123456"]["tipo_beca"] is None
    assert by_dni["30123456"]["documento_beca"] is None
    assert by_dni["30123457"]["solicita_beca"] is True
    assert by_dni["30123457"]["tipo_beca"] == "30%"
    assert by_dni["30123457"]["documento_beca"] == {"tipo": "FORM_BECA"}
    assert set(by_dni["30123457"]["documento_beca"]) == {"tipo"}
    assert by_dni["30123458"]["solicita_beca"] is True
    assert by_dni["30123458"]["tipo_beca"] == "100%"
    assert by_dni["30123458"]["documento_beca"] == {"tipo": "FORM_BECA"}
    assert "path_storage" not in response.text
    assert "checksum_sha256" not in response.text
    assert "privado-30.pdf" not in response.text
    assert "privado-100.pdf" not in response.text


def test_legajo_list_combines_documented_filters(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, cohorte = client
    otra_cohorte = Cohorte(
        anio=2025,
        nombre="Cohorte 2025",
        inscripcion_abierta=False,
    )
    session.add(otra_cohorte)
    session.flush()

    registros = {
        "30123461": create_legajo(
            cohorte_id=cohorte.id,
            dni="30123461",
            apellido="Aspirante",
            solicita_beca=False,
            tipo_beca=None,
            carreras=["Especialización"],
        ),
        "30123462": create_legajo(
            cohorte_id=cohorte.id,
            dni="30123462",
            apellido="Becaría",
            solicita_beca=True,
            tipo_beca="30%",
            carreras=["Maestría"],
        ),
        "30123463": create_legajo(
            cohorte_id=cohorte.id,
            dni="30123463",
            apellido="Becario",
            solicita_beca=True,
            tipo_beca="100%",
            estado="En Revisión",
            carreras=["Especialización", "Doctorado"],
        ),
        "30123464": create_legajo(
            cohorte_id=otra_cohorte.id,
            dni="30123464",
            apellido="Otra cohorte",
            solicita_beca=True,
            tipo_beca="100%",
            carreras=["Especialización"],
        ),
        "30123465": create_legajo(
            cohorte_id=otra_cohorte.id,
            dni="30123465",
            apellido="Sin beca",
            solicita_beca=False,
            tipo_beca=None,
            estado="En Revisión",
            carreras=["Maestría"],
        ),
        "30123466": create_legajo(
            cohorte_id=otra_cohorte.id,
            dni="30123466",
            apellido="Dato legado",
            solicita_beca=False,
            tipo_beca="30%",
            carreras=["Doctorado"],
        ),
    }
    session.add_all(registros.values())
    session.flush()
    session.add(
        DocumentoInscripcion(
            legajo_id=registros["30123466"].id,
            tipo="FORM_BECA",
            path_storage="inscripciones/legado-beca.pdf",
            checksum_sha256="c" * 64,
        )
    )
    headers = create_auth_headers(session, "COORDINADOR")

    def consultar(params: dict[str, str]) -> list[dict[str, object]]:
        response = test_client.get(
            "/api/v1/legajos",
            params=params,
            headers=headers,
        )
        assert response.status_code == 200
        return response.json()

    def dni_resultados(params: dict[str, str]) -> set[str]:
        return {str(legajo["dni"]) for legajo in consultar(params)}

    todos = set(registros)
    assert dni_resultados({}) == todos
    assert dni_resultados({"estado": "Pendiente"}) == {
        "30123461",
        "30123462",
        "30123464",
        "30123466",
    }
    assert dni_resultados({"cohorte_id": str(cohorte.id)}) == {
        "30123461",
        "30123462",
        "30123463",
    }
    assert dni_resultados({"carrera": "Doctorado"}) == {
        "30123463",
        "30123466",
    }

    becados = consultar({"tiene_beca": "true"})
    assert {str(legajo["dni"]) for legajo in becados} == {
        "30123462",
        "30123463",
        "30123464",
    }
    assert {str(legajo["tipo_beca"]) for legajo in becados} == {"30%", "100%"}
    assert dni_resultados({"tiene_beca": "false"}) == {
        "30123461",
        "30123465",
        "30123466",
    }
    assert dni_resultados(
        {
            "estado": "Pendiente",
            "cohorte_id": str(cohorte.id),
            "carrera": "Maestría",
            "tiene_beca": "true",
        }
    ) == {"30123462"}
    assert dni_resultados({"dni": "30123462"}) == {"30123462"}
    assert dni_resultados({"apellido": "bec"}) == {
        "30123462",
        "30123463",
        "30123465",
    }
    assert dni_resultados({"apellido": "BECARÍA"}) == {"30123462"}
    assert test_client.get(
        "/api/v1/legajos",
        params={"apellido": "ab"},
        headers=headers,
    ).status_code == 422


def test_inscripcion_puede_seleccionar_cohorte_abierta(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, _ = client
    cohorte_seleccionada = Cohorte(
        anio=2027,
        nombre="Cohorte 2027",
        inscripcion_abierta=True,
    )
    session.add(cohorte_seleccionada)
    session.commit()

    response = test_client.post(
        "/api/v1/legajos",
        data=valid_form(cohorte_id=str(cohorte_seleccionada.id)),
        files=valid_files(),
    )

    assert response.status_code == 201
    assert session.scalar(select(Legajo)).cohorte_id == cohorte_seleccionada.id


def test_cohortes_publicas_y_gestion_de_coordinacion(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, cohorte_abierta = client
    respuesta_publica = test_client.get("/api/v1/cohortes")

    assert respuesta_publica.status_code == 200
    assert [item["id"] for item in respuesta_publica.json()] == [
        str(cohorte_abierta.id)
    ]
    assert respuesta_publica.headers["X-Content-Type-Options"] == "nosniff"
    assert test_client.get("/api/v1/cohortes/gestion").status_code == 401

    headers = create_auth_headers(session, "COORDINADOR")
    sin_fecha = test_client.patch(
        f"/api/v1/cohortes/{cohorte_abierta.id}/inscripcion",
        json={"inscripcion_abierta": False},
        headers=headers,
    )
    assert sin_fecha.status_code == 422

    cierre = test_client.patch(
        f"/api/v1/cohortes/{cohorte_abierta.id}/inscripcion",
        json={
            "inscripcion_abierta": False,
            "fecha_proxima_apertura": "2027-03-01",
        },
        headers=headers,
    )
    assert cierre.status_code == 200
    assert cierre.json()["fecha_proxima_apertura"] == "2027-03-01"
    assert test_client.get("/api/v1/cohortes").json() == []
    proxima_apertura = test_client.get("/api/v1/cohortes/proxima-apertura")
    assert proxima_apertura.status_code == 200
    assert proxima_apertura.json() == {"fecha_proxima_apertura": "2027-03-01"}

    creacion = test_client.post(
        "/api/v1/cohortes",
        json={
            "anio": 2027,
            "nombre": "Cohorte nueva",
            "fecha_proxima_apertura": "2027-04-01",
        },
        headers=headers,
    )
    assert creacion.status_code == 201
    gestion = test_client.get("/api/v1/cohortes/gestion", headers=headers)
    assert gestion.status_code == 200
    assert {item["nombre"] for item in gestion.json()} == {
        "Cohorte 2026",
        "Cohorte nueva",
    }


def test_exportacion_xlsx_aplica_encabezado_negrita_y_filtros(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, cohorte = client
    session.add(
        create_legajo(
            cohorte_id=cohorte.id,
            dni="30123456",
            apellido="Pérez",
            solicita_beca=False,
            tipo_beca=None,
        )
    )
    session.commit()
    headers = create_auth_headers(session, "COORDINADOR")

    response = test_client.get(
        "/api/v1/legajos/exportar",
        params={"cohorte_id": str(cohorte.id)},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert (
        f"inscriptos-cohorte{cohorte.anio}-{date.today().isoformat()}.xlsx"
        in response.headers["content-disposition"]
    )
    with ZipFile(BytesIO(response.content)) as archivo:
        assert archivo.testzip() is None
        for nombre in archivo.namelist():
            if nombre.endswith((".xml", ".rels")):
                ElementTree.fromstring(archivo.read(nombre))
        hoja = ElementTree.fromstring(archivo.read("xl/worksheets/sheet1.xml"))
        estilos = ElementTree.fromstring(archivo.read("xl/styles.xml"))
    ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    assert hoja.find("x:autoFilter", ns).attrib["ref"] == "A1:H2"
    assert hoja.find("x:sheetData/x:row/x:c", ns).attrib["s"] == "1"
    assert hoja.find("x:cols/x:col", ns).attrib["customWidth"] == "1"
    assert estilos.find("x:fonts/x:font[2]/x:b", ns) is not None


def test_exportacion_rechaza_mas_de_500_legajos(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, session, cohorte = client
    session.add_all(
        [
            create_legajo(
                cohorte_id=cohorte.id,
                dni=str(31000000 + indice),
                apellido=f"Aspirante {indice}",
                solicita_beca=False,
                tipo_beca=None,
            )
            for indice in range(501)
        ]
    )
    session.commit()
    headers = create_auth_headers(session, "COORDINADOR")

    response = test_client.get("/api/v1/legajos/exportar", headers=headers)

    assert response.status_code == 413
    assert response.json()["detail"] == "La exportación admite hasta 500 legajos"


def test_inscripcion_rechaza_el_decimo_primer_envio_por_ip(
    client: tuple[TestClient, Session, Cohorte],
) -> None:
    test_client, _, _ = client
    respuestas = [
        test_client.post(
            "/api/v1/legajos",
            data=valid_form(),
            files=valid_files(),
        )
        for _ in range(11)
    ]

    assert respuestas[0].status_code == 201
    assert all(respuesta.status_code == 409 for respuesta in respuestas[1:10])
    assert respuestas[10].status_code == 429
    assert 1 <= int(respuestas[10].headers["Retry-After"]) <= 3600
