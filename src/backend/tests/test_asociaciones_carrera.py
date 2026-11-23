from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock
from datetime import date
import pytest
from fastapi import HTTPException
from src.carreras.asociaciones import consultar_asociaciones
from src.seminarios.aplicacion.servicio import modificar_seminario, desvincular_alumno_seminario
from src.seminarios.presentacion.esquema import SeminarioModificar


async def test_carrera_inexistente(db):
    with pytest.raises(HTTPException) as exc:
        await consultar_asociaciones(uuid4(), db)
    assert exc.value.status_code == 404


async def test_consulta_vacia(db):
    db.get.return_value = object()
    db.execute.return_value.all.return_value = []
    assert await consultar_asociaciones(uuid4(), db) == {"alumnos": [], "docentes": []}


async def test_protege_carrera_con_cursadas(db, monkeypatch):
    id, carrera, docente = uuid4(), uuid4(), uuid4()
    seminario = SimpleNamespace(id=id, carrera_id=carrera)
    db.scalar.side_effect = [seminario, uuid4()]
    monkeypatch.setattr("src.seminarios.aplicacion.servicio.obtener_carrera", AsyncMock(return_value=object()))
    monkeypatch.setattr("src.seminarios.aplicacion.servicio.obtener_docente", AsyncMock(return_value=object()))
    datos = SeminarioModificar(nombre="Seminario", carrera_id=uuid4(), docente_id=docente, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 2, 1))
    with pytest.raises(HTTPException) as exc:
        await modificar_seminario(id, datos, db)
    assert exc.value.status_code == 409
    assert seminario.carrera_id == carrera
    db.commit.assert_not_awaited()


async def test_no_desvincula_con_asistencia(db):
    docente = uuid4()
    db.get.return_value = SimpleNamespace(docente_id=docente)
    db.scalar.return_value = SimpleNamespace(nota_final=None, total_clases=1)
    with pytest.raises(HTTPException) as exc:
        await desvincular_alumno_seminario(uuid4(), uuid4(), docente, db)
    assert exc.value.status_code == 400
    db.delete.assert_not_awaited()
