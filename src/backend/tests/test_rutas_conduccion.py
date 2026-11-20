from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.compartido.conexion import get_db
from src.conduccion.rutas import enrutador
from src.usuarios.rutas import usuario_actual


@pytest.fixture
def app_conduccion():
    app = FastAPI()
    app.include_router(enrutador)
    return app


@pytest.fixture
def db_conduccion():
    db = MagicMock()
    db.scalar = AsyncMock(return_value=None)
    db.get = AsyncMock(return_value=None)
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    return db


@pytest.fixture
def cliente_conduccion(app_conduccion, db_conduccion):
    async def base_simulada():
        yield db_conduccion

    app_conduccion.dependency_overrides[get_db] = base_simulada

    with TestClient(app_conduccion) as cliente:
        yield cliente

    app_conduccion.dependency_overrides.clear()


def autenticar(app, rol="COORDINADOR", activo=True):
    async def usuario_simulado():
        return SimpleNamespace(
            id=uuid4(),
            activo=activo,
            rol=SimpleNamespace(nombre=rol),
        )

    app.dependency_overrides[usuario_actual] = usuario_simulado


@pytest.mark.parametrize(
    "ruta",
    ["/gestion", "/completitud", "/auditoria"],
)
def test_consultas_rechazan_anonimo(
    ruta,
    cliente_conduccion,
):
    respuesta = cliente_conduccion.get(
        f"/api/v1/conduccion/legajos/{uuid4()}{ruta}"
    )

    assert respuesta.status_code in (401, 403)


@pytest.mark.parametrize(
    "rol",
    ["ADMIN", "DOCENTE", "CPR", "ASPIRANTE"],
)
def test_acciones_rechazan_rol_no_autorizado(
    rol,
    app_conduccion,
    cliente_conduccion,
    db_conduccion,
):
    autenticar(app_conduccion, rol=rol)

    respuesta = cliente_conduccion.post(
        f"/api/v1/conduccion/legajos/{uuid4()}/acciones",
        json={
            "accion": "REVISAR",
            "estado_esperado": "PENDIENTE",
        },
    )

    assert respuesta.status_code == 403
    db_conduccion.scalar.assert_not_awaited()
    db_conduccion.commit.assert_not_awaited()


def test_coordinador_inactivo_rechazado(
    app_conduccion,
    cliente_conduccion,
    db_conduccion,
):
    autenticar(app_conduccion, activo=False)

    respuesta = cliente_conduccion.get(
        f"/api/v1/conduccion/legajos/{uuid4()}/gestion"
    )

    assert respuesta.status_code == 403
    db_conduccion.scalar.assert_not_awaited()


def test_legajo_inexistente(
    app_conduccion,
    cliente_conduccion,
):
    autenticar(app_conduccion)

    respuesta = cliente_conduccion.get(
        f"/api/v1/conduccion/legajos/{uuid4()}/gestion"
    )

    assert respuesta.status_code == 404


def test_accion_desconocida(
    app_conduccion,
    cliente_conduccion,
):
    autenticar(app_conduccion)

    respuesta = cliente_conduccion.post(
        f"/api/v1/conduccion/legajos/{uuid4()}/acciones",
        json={
            "accion": "ACCION_INEXISTENTE",
            "estado_esperado": "PENDIENTE",
        },
    )

    assert respuesta.status_code == 422


def test_consulta_gestion(
    app_conduccion,
    cliente_conduccion,
    db_conduccion,
):
    autenticar(app_conduccion)
    legajo_id = uuid4()

    db_conduccion.scalar.return_value = SimpleNamespace(
        id=legajo_id,
        estado="PENDIENTE",
    )

    respuesta = cliente_conduccion.get(
        f"/api/v1/conduccion/legajos/{legajo_id}/gestion"
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["legajo_id"] == str(legajo_id)
    assert respuesta.json()["estado"] == "PENDIENTE"
    assert respuesta.json()["datos_verificados"] is False