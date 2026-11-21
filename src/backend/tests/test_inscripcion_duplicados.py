
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from src.inscripcion.aplicacion.validar_duplicados import (
    validar_inscripcion_no_duplicada,
)


@pytest.mark.asyncio
async def test_rechaza_correo_duplicado():
    db = AsyncMock()
    db.scalar.return_value = uuid4()

    with pytest.raises(HTTPException) as error:
        await validar_inscripcion_no_duplicada(
            db=db,
            correo_electronico="matias@example.com",
            dni_pasaporte="12345678",
            cohorte_id=uuid4(),
        )

    assert error.value.status_code == 409
    assert "correo electrónico" in error.value.detail
    db.scalar.assert_awaited_once()


@pytest.mark.asyncio
async def test_rechaza_dni_duplicado_en_cohorte():
    db = AsyncMock()
    db.scalar.side_effect = [None, uuid4()]

    with pytest.raises(HTTPException) as error:
        await validar_inscripcion_no_duplicada(
            db=db,
            correo_electronico="matias@example.com",
            dni_pasaporte="12345678",
            cohorte_id=uuid4(),
        )

    assert error.value.status_code == 409
    assert "documento" in error.value.detail
    assert db.scalar.await_count == 2


@pytest.mark.asyncio
async def test_acepta_inscripcion_sin_duplicados():
    db = AsyncMock()
    db.scalar.side_effect = [None, None]

    resultado = await validar_inscripcion_no_duplicada(
        db=db,
        correo_electronico="matias@example.com",
        dni_pasaporte="12345678",
        cohorte_id=uuid4(),
    )

    assert resultado is None
    assert db.scalar.await_count == 2
