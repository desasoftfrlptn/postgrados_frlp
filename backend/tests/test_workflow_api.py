from collections.abc import Generator
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import hashlib
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from src.authentication.application.security import hash_password
from src.authentication.infrastructure.models import User
from src.db.base import Base
from src.db.session import get_db
from src.inscripcion.infrastructure.models import Cohorte, Legajo
from src.shared.auditoria.modelos import EventoAuditoria
from main import app


@pytest.fixture
def workflow_client(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, Session, User, User, Cohorte, list[EmailMessage]], None, None]:
    engine = create_engine(f"sqlite:///{tmp_path / 'workflow.db'}")
    Base.metadata.create_all(engine)
    session = Session(engine)
    coordinator = User(
        email="coord@example.com",
        password_hash=hash_password("Coordinator123!"),
        role="COORDINADOR",
    )
    cpr = User(
        email="cpr@example.com",
        password_hash=hash_password("CprExample123!"),
        role="CPR",
    )
    cohort = Cohorte(anio=2026, nombre="Cohorte 2026", inscripcion_abierta=True)
    session.add_all((coordinator, cpr, cohort))
    session.commit()

    emails_sent: list[EmailMessage] = []
    monkeypatch.setattr(
        "src.inscripcion.infrastructure.email.enviar_mensaje_correo",
        emails_sent.append,
    )

    def override_get_db() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client, session, coordinator, cpr, cohort, emails_sent
    app.dependency_overrides.clear()
    session.close()
    engine.dispose()


def _crear_legajo(session: Session, cohort: Cohorte, **overrides: Any) -> Legajo:
    datos: dict[str, Any] = {
        "cohorte_id": cohort.id,
        "estado": "Pendiente",
        "carreras": ["Especialización"],
        "dni": str(20_000_000 + int(uuid4().int % 70_000_000)),
        "apellido": "Pérez",
        "nombre": "Ana",
        "nacionalidad": "Argentina",
        "email": f"{uuid4().hex}@example.com",
        "email_alternativo": "alternativo@example.com",
        "telefono_movil": "2215551234",
        "domicilio": "Calle 1",
        "ciudad": "La Plata",
        "provincia": "Buenos Aires",
        "pais": "Argentina",
        "titulo_grado": "Ingeniería",
        "como_conocio": "web",
        "motivacion": "Motivación válida para la inscripción del posgrado.",
        "solicita_beca": False,
    }
    datos.update(overrides)
    legajo = Legajo(**datos)
    session.add(legajo)
    session.commit()
    return legajo


def _token(client: TestClient, email: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_coordinador_observa_y_aspirante_corrige_con_token_de_un_solo_uso(
    workflow_client: tuple[
        TestClient, Session, User, User, Cohorte, list[EmailMessage]
    ],
) -> None:
    client, session, coordinator, _, cohort, emails_sent = workflow_client
    legajo = _crear_legajo(session, cohort)
    headers = {
        "Authorization": f"Bearer {_token(client, coordinator.email, 'Coordinator123!')}"
    }

    revisar = client.post(
        f"/api/v1/legajos/{legajo.id}/transiciones",
        json={"accion": "REVISAR"},
        headers=headers,
    )
    assert revisar.status_code == 200
    assert revisar.json()["estado"] == "En Revisión"

    observar = client.post(
        f"/api/v1/legajos/{legajo.id}/transiciones",
        json={"accion": "OBSERVAR", "comentario": "Falta el título"},
        headers=headers,
    )
    assert observar.status_code == 200
    assert observar.json()["estado"] == "Observado"
    assert len(emails_sent) == 1
    mensaje = emails_sent[0]
    texto_correo = mensaje.get_body(preferencelist=("plain",)).get_content()
    token_correccion = texto_correo.split("token de un solo uso ", 1)[1].split(".", 1)[0]

    corregir = client.post(
        f"/api/v1/legajos/{legajo.id}/correccion",
        json={"token": token_correccion},
    )
    assert corregir.status_code == 200
    assert corregir.json()["estado"] == "Pendiente"
    assert session.get(Legajo, legajo.id).token_correccion_hash is None

    repetido = client.post(
        f"/api/v1/legajos/{legajo.id}/correccion",
        json={"token": token_correccion},
    )
    assert repetido.status_code == 401
    auditoria = list(
        session.scalars(
            select(EventoAuditoria)
            .where(EventoAuditoria.tipo_recurso == "legajo")
        )
    )
    transiciones = {
        (evento.detalles["estado_anterior"], evento.detalles["estado_nuevo"])
        for evento in auditoria
    }
    assert transiciones == {
        ("Pendiente", "En Revisión"),
        ("En Revisión", "Observado"),
        ("Observado", "Pendiente"),
    }
    assert all(evento.creado_en is not None for evento in auditoria)
    assert any(evento.rol_actor == "ASPIRANTE" for evento in auditoria)


def test_aprobar_genera_numero_legajo_secuencial(
    workflow_client: tuple[
        TestClient, Session, User, User, Cohorte, list[EmailMessage]
    ],
) -> None:
    client, session, coordinator, _, cohort, _ = workflow_client
    headers = {
        "Authorization": f"Bearer {_token(client, coordinator.email, 'Coordinator123!')}"
    }
    legajos = [
        _crear_legajo(session, cohort, estado="En Revisión"),
        _crear_legajo(session, cohort, estado="En Revisión"),
    ]

    numeros: list[str] = []
    for legajo in legajos:
        response = client.post(
            f"/api/v1/legajos/{legajo.id}/transiciones",
            json={"accion": "APROBAR"},
            headers=headers,
        )
        assert response.status_code == 200
        assert response.json()["estado"] == "Completado"
        numeros.append(response.json()["numero_legajo"])

    assert numeros == ["26-001-001", "26-001-002"]


def test_solo_coordinador_puede_transicionar_y_no_se_permiten_saltos(
    workflow_client: tuple[
        TestClient, Session, User, User, Cohorte, list[EmailMessage]
    ],
) -> None:
    client, session, coordinator, cpr, cohort, _ = workflow_client
    legajo = _crear_legajo(session, cohort)
    cpr_headers = {
        "Authorization": f"Bearer {_token(client, cpr.email, 'CprExample123!')}"
    }

    denegado = client.post(
        f"/api/v1/legajos/{legajo.id}/transiciones",
        json={"accion": "REVISAR"},
        headers=cpr_headers,
    )
    assert denegado.status_code == 403

    salto_headers = {
        "Authorization": (
            f"Bearer {_token(client, coordinator.email, 'Coordinator123!')}"
        )
    }
    salto = client.post(
        f"/api/v1/legajos/{legajo.id}/transiciones",
        json={"accion": "APROBAR"},
        headers=salto_headers,
    )
    assert salto.status_code == 409

    assert session.get(Legajo, legajo.id).estado == "Pendiente"


def test_no_se_puede_aprobar_sin_pasar_por_revision(
    workflow_client: tuple[
        TestClient, Session, User, User, Cohorte, list[EmailMessage]
    ],
) -> None:
    client, session, coordinator, _, cohort, _ = workflow_client
    legajo = _crear_legajo(session, cohort)
    headers = {
        "Authorization": f"Bearer {_token(client, coordinator.email, 'Coordinator123!')}"
    }

    response = client.post(
        f"/api/v1/legajos/{legajo.id}/transiciones",
        json={"accion": "APROBAR"},
        headers=headers,
    )

    assert response.status_code == 409
    assert session.get(Legajo, legajo.id).estado == "Pendiente"


def test_observar_exige_motivo(
    workflow_client: tuple[
        TestClient, Session, User, User, Cohorte, list[EmailMessage]
    ],
) -> None:
    client, session, coordinator, _, cohort, _ = workflow_client
    legajo = _crear_legajo(
        session,
        cohort,
        estado="En Revisión",
    )
    headers = {
        "Authorization": f"Bearer {_token(client, coordinator.email, 'Coordinator123!')}"
    }

    response = client.post(
        f"/api/v1/legajos/{legajo.id}/transiciones",
        json={"accion": "OBSERVAR"},
        headers=headers,
    )

    assert response.status_code == 422


def test_token_de_correccion_vencido_no_cambia_el_estado(
    workflow_client: tuple[
        TestClient, Session, User, User, Cohorte, list[EmailMessage]
    ],
) -> None:
    client, session, _, _, cohort, _ = workflow_client
    token = "x" * 43
    legajo = _crear_legajo(
        session,
        cohort,
        estado="Observado",
        token_correccion_hash=hashlib.sha256(token.encode("ascii")).hexdigest(),
        token_correccion_expira_en=(
            datetime.now(timezone.utc) - timedelta(minutes=1)
        ),
    )

    response = client.post(
        f"/api/v1/legajos/{legajo.id}/correccion",
        json={"token": token},
    )

    assert response.status_code == 401
    assert session.get(Legajo, legajo.id).estado == "Observado"