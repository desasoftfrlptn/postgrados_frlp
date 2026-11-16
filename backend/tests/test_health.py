from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_requires_authentication() -> None:
    response = client.get("/health")

    assert response.status_code == 401
