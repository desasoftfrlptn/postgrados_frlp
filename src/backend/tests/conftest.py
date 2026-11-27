import os
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

os.environ["SECRET_KEY"] = (
    "clave-exclusiva-de-pruebas-no-usar-en-produccion-123456"
)
os.environ["DATABASE_URL"] = (
    "postgresql+asyncpg://test:test@127.0.0.1:1/test_no_conectar"
)
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.compartido.conexion import get_db
from src.usuarios.seguridad import hash_password
from src.usuarios.rutas import enrutador as rutas_usuarios
from src.inscripcion.presentacion.rutas import (enrutador as rutas_inscripcion,)

from src.carreras import modelos as _carreras
from src.inscripcion.infraestructura import (
    cohortes_modelos as _cohortes,
    documentos_modelos as _documentos,
    orm_modelos as _legajos,
)

@pytest.fixture
def db():
    session = MagicMock()

    for nombre in (
        "scalar",
        "execute",
        "commit",
        "rollback",
        "get",
        "delete",
        "refresh",
    ):
        setattr(session, nombre, AsyncMock())

    session.scalar.return_value = None
    session.get.return_value = None

    resultado = MagicMock()
    resultado.scalars.return_value.all.return_value = []
    session.execute.return_value = resultado

    return session

@pytest.fixture
def usuario():
    return SimpleNamespace(
        id=uuid4(),
        nombre="Ana",
        apellido="Perez",
        dni="12345678",
        correo_electronico="ana@example.com",
        contrasena_hash=hash_password("ClavePrueba123!"),
        activo=True,
        rol_id=uuid4(),
        debe_cambiar_contrasena=True,
        rol=SimpleNamespace(
            id=uuid4(),
            nombre="ASPIRANTE",
        ),
    )

@pytest.fixture
def cliente(db):
    app = FastAPI()
    app.include_router(rutas_usuarios)
    app.include_router(rutas_inscripcion)

    async def base_simulada():
        yield db

    app.dependency_overrides[get_db] = base_simulada

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()
