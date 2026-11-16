from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from src.authentication.application.security import hash_password, require_roles
from src.authentication.infrastructure.models import User
from src.db.base import Base
from src.db.session import get_db
from main import app


@pytest.fixture
def auth_client(tmp_path: Path) -> Generator[tuple[TestClient, Session, User], None, None]:
    engine = create_engine(f"sqlite:///{tmp_path / 'auth.db'}")
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
    session.add_all((coordinator, cpr))
    session.commit()

    def override_get_db() -> Generator[Session, None, None]:
        yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client, session, coordinator
    app.dependency_overrides.clear()
    session.close()
    engine.dispose()


def test_login_issues_token_and_protected_identity_endpoint_returns_role(
    auth_client: tuple[TestClient, Session, User],
) -> None:
    client, _, coordinator = auth_client

    assert client.get("/health").status_code == 401

    response = client.post(
        "/api/v1/auth/login",
        json={"email": coordinator.email, "password": "Coordinator123!"},
    )

    assert response.status_code == 200
    result = response.json()
    assert result["token_type"] == "bearer"
    assert result["user"]["role"] == "COORDINADOR"
    assert result["expires_in"] > 0

    identity = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {result['access_token']}"},
    )
    assert identity.status_code == 200
    assert identity.json() == {
        "id": str(coordinator.id),
        "email": coordinator.email,
        "role": "COORDINADOR",
    }
    assert client.get(
        "/health",
        headers={"Authorization": f"Bearer {result['access_token']}"},
    ).status_code == 200


def test_password_hash_uses_bcrypt_cost_12() -> None:
    hashed = hash_password("ExamplePass123!")

    assert hashed.startswith("$2b$12$")


def test_login_rejects_unknown_user_and_wrong_password_with_same_response(
    auth_client: tuple[TestClient, Session, User],
) -> None:
    client, _, coordinator = auth_client

    known_user = client.post(
        "/api/v1/auth/login",
        json={"email": coordinator.email, "password": "incorrecta"},
    )
    unknown_user = client.post(
        "/api/v1/auth/login",
        json={"email": "missing@example.com", "password": "incorrecta"},
    )

    assert known_user.status_code == unknown_user.status_code == 401
    assert known_user.json() == unknown_user.json()


def test_refresh_rotates_tokens_and_logout_revokes_the_refresh_session(
    auth_client: tuple[TestClient, Session, User],
) -> None:
    client, _, coordinator = auth_client
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": coordinator.email, "password": "Coordinator123!"},
    )
    initial_tokens = login_response.json()

    refreshed = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_tokens["refresh_token"]},
    )
    assert refreshed.status_code == 200
    next_tokens = refreshed.json()
    assert next_tokens["access_token"] != initial_tokens["access_token"]
    assert next_tokens["refresh_token"] != initial_tokens["refresh_token"]

    replayed = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_tokens["refresh_token"]},
    )
    assert replayed.status_code == 401

    logged_out = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": next_tokens["refresh_token"]},
    )
    assert logged_out.status_code == 204
    after_logout = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": next_tokens["refresh_token"]},
    )
    assert after_logout.status_code == 401
    revoked_access = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {next_tokens['access_token']}"},
    )
    assert revoked_access.status_code == 401


def test_role_guard_forbids_cpr_from_coordinator_actions(
    auth_client: tuple[TestClient, Session, User],
) -> None:
    _, session, _ = auth_client
    cpr = session.query(User).filter_by(role="CPR").one()
    coordinator_guard = require_roles("COORDINADOR")

    with pytest.raises(HTTPException) as exception:
        coordinator_guard(usuario=cpr)

    assert exception.value.status_code == 403
