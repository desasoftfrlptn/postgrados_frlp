from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from src.seminarios.aplicacion.servicio import eliminar_seminario


@pytest.mark.asyncio
async def test_eliminar_seminario_sin_historial():
    seminario = SimpleNamespace(id=uuid4())
    db = AsyncMock()
    db.scalar.side_effect = [seminario, None, None]
    await eliminar_seminario(seminario.id, db)
    db.delete.assert_awaited_once_with(seminario)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_eliminar_seminario_con_historial():
    seminario = SimpleNamespace(id=uuid4())
    db = AsyncMock()
    db.scalar.return_value = seminario
    await eliminar_seminario(seminario.id, db)
    assert db.execute.await_count == 2
    db.delete.assert_awaited_once_with(seminario)
    db.commit.assert_awaited_once()
