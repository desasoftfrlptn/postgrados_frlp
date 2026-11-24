from types import SimpleNamespace as NS
from unittest.mock import AsyncMock
from uuid import uuid4
import pytest
from src.seminarios.aplicacion.consulta_conduccion import consultar_cursadas


@pytest.mark.asyncio
async def test_consulta_conserva_ausencia_de_nota_y_clases():
    inscripcion = NS(id=uuid4(), estado="CURSANDO", nota_final=None, asistencias=0, total_clases=0)
    seminario = NS(nombre="Seminario")
    legajo = NS(apellido="Pérez", nombre="Ana", dni_pasaporte="123")
    docente = NS(apellido="García", nombre="Luis")
    db = AsyncMock()
    db.execute.return_value = NS(all=lambda: [(inscripcion, seminario, legajo, docente)])
    filas = await consultar_cursadas(db, uuid4())
    assert filas[0]["nota"] is None
    assert filas[0]["total_clases"] == 0
    assert filas[0]["estudiante"] == "Pérez, Ana"
    db.commit.assert_not_awaited()
