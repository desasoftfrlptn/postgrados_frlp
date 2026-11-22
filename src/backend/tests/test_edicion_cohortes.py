from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from src.inscripcion.infraestructura.cohortes_repositorio import CohorteRepositorioPostgres
from src.inscripcion.presentacion.cohortes_esquemas import CohorteModificar


@pytest.fixture
def caso(db):
    anterior = dict(nombre="Cohorte 2026", anio=2026, carrera_id=uuid4(), fecha_inicio=None)
    cohorte = SimpleNamespace(id=uuid4(), abierta=False, **anterior)
    repo = CohorteRepositorioPostgres(db)
    repo.bloquear_cohorte = AsyncMock(return_value=cohorte)
    repo.obtener_carrera_activa = AsyncMock(return_value=object())
    return repo, cohorte, anterior


@pytest.mark.asyncio
async def test_edita_nombre_sin_alterar_identidad(caso, db):
    repo, cohorte, anterior = caso
    datos = CohorteModificar(**{**anterior, "nombre": "Nombre actualizado"}, anterior=anterior)
    resultado = await repo.editar_cohorte(cohorte.id, datos)
    assert resultado.nombre == "Nombre actualizado"
    assert resultado.carrera_id == anterior["carrera_id"]
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_rechaza_modificacion_concurrente(caso, db):
    repo, cohorte, anterior = caso
    cohorte.nombre = "Otro cambio"
    datos = CohorteModificar(**anterior, anterior=anterior)
    with pytest.raises(HTTPException) as error:
        await repo.editar_cohorte(cohorte.id, datos)
    assert error.value.status_code == 409
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_protege_historial(caso, db):
    repo, cohorte, anterior = caso
    db.scalar.side_effect = [uuid4(), None]
    datos = CohorteModificar(**{**anterior, "anio": 2027}, anterior=anterior)
    with pytest.raises(HTTPException) as error:
        await repo.editar_cohorte(cohorte.id, datos)
    assert error.value.status_code == 409
    assert cohorte.anio == 2026
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_no_abre_carrera_inactiva(caso, db):
    repo, cohorte, _ = caso
    repo.obtener_carrera_activa.return_value = None
    with pytest.raises(HTTPException) as error:
        await repo.modificar_inscripcion(cohorte.id, True)
    assert error.value.status_code == 409
    assert not cohorte.abierta
    db.commit.assert_not_awaited()
