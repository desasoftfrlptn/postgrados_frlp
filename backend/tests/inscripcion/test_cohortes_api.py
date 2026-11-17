"""El response_model debe aceptar las cohortes ORM almacenadas realmente."""
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from src.inscripcion.infrastructure.orm_models import Cohorte
from src.inscripcion.presentation.cohortes_controller import router
from src.inscripcion.presentation.dependencies import get_cohorte_service
from src.inscripcion.presentation.schemas import CohorteResponse


@pytest.mark.asyncio
async def test_listado_serializa_inscripcion_abierta_del_orm():
    cohorte = Cohorte(id=uuid4(), anio=2026, nombre="Cohorte real", inscripcion_abierta=True,
                      fecha_inicio=date(2026, 3, 1))
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_cohorte_service] = lambda: SimpleNamespace(
        listar_cohortes=AsyncMock(return_value=[cohorte]))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/cohortes")
    assert response.status_code == 200
    assert response.json() == [{"id": str(cohorte.id), "anio": 2026, "nombre": "Cohorte real",
                                "abierta": True, "fecha_inicio": "2026-03-01"}]


def test_conserva_el_contrato_publico_abierta():
    datos = {"id": uuid4(), "anio": 2026, "nombre": "Cohorte", "abierta": False}
    assert CohorteResponse.model_validate(datos).model_dump()["abierta"] is False
