from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy.dialects import postgresql

from src.inscripcion.aplicacion.validar_duplicados import validar_inscripcion_no_duplicada


def base(respuestas):
    db = AsyncMock()
    db.get.return_value = SimpleNamespace(anio=2026, carrera_id=uuid4())
    db.scalar.side_effect = respuestas
    return db


async def validar(db):
    return await validar_inscripcion_no_duplicada(db, "matias@example.com", "12345678", uuid4())


@pytest.mark.asyncio
async def test_rechaza_correo_duplicado():
    db = base([uuid4()])
    with pytest.raises(HTTPException, match="correo electrónico") as error:
        await validar(db)
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_rechaza_dni_duplicado_en_cohorte():
    db = base([None, uuid4()])
    with pytest.raises(HTTPException, match="documento") as error:
        await validar(db)
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_acepta_inscripcion_sin_duplicados():
    db = base([None, None, None, 0])
    assert await validar(db) is None


@pytest.mark.asyncio
async def test_consulta_excluye_bajas_para_reinscripcion():
    db = base([None, None, None, 0])
    await validar(db)
    consulta = db.scalar.await_args_list[1].args[0]
    sql = str(consulta.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
    assert "legajos.estado != 'BAJA'" in sql


@pytest.mark.asyncio
async def test_rechaza_otra_cohorte_de_misma_carrera_vigente():
    db = base([None, None, uuid4()])
    with pytest.raises(HTTPException) as error:
        await validar(db)
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_rechaza_tercera_carrera_vigente():
    db = base([None, None, None, 2])
    with pytest.raises(HTTPException) as error:
        await validar(db)
    assert error.value.status_code == 409
