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


async def test_eliminar_carrera_con_asociaciones(db):
    from src.carreras.servicio import borrar_carrera
    registro = SimpleNamespace(id=uuid4(), nombre="Maestría")
    db.scalar.return_value = registro
    await borrar_carrera(registro.id, db)
    sentencias = [str(llamada.args[0]) for llamada in db.execute.await_args_list]
    borrados = [sql.split()[2] for sql in sentencias if sql.startswith("DELETE FROM")]
    assert borrados.index("encuentros_tutoria") < borrados.index("tutorias") < borrados.index("legajos") < borrados.index("cohortes")
    assert borrados.index("notificaciones_conduccion") < borrados.index("documentos_legajo")
    assert borrados.index("inscripciones_seminario") < borrados.index("seminarios")
    assert "usuarios" not in borrados
    db.delete.assert_awaited_once_with(registro)
    db.commit.assert_awaited_once()


async def test_eliminacion_carrera_revierte_si_falla(db):
    from sqlalchemy.exc import IntegrityError
    from src.carreras.servicio import borrar_carrera
    registro = SimpleNamespace(id=uuid4(), nombre="Maestría")
    db.scalar.return_value = registro
    db.execute.side_effect = IntegrityError("DELETE", {}, Exception("integridad"))
    with pytest.raises(HTTPException) as exc:
        await borrar_carrera(registro.id, db)
    assert exc.value.status_code == 409
    db.rollback.assert_awaited_once()
    db.commit.assert_not_awaited()


async def test_desasociar_docente_de_seminario(db, monkeypatch):
    from src.seminarios.aplicacion import servicio
    id, carrera = uuid4(), uuid4()
    seminario = SimpleNamespace(id=id, carrera_id=carrera, docente_id=uuid4(), activo=True)
    db.scalar.return_value = seminario
    monkeypatch.setattr(servicio, "obtener_carrera", AsyncMock(return_value=object()))
    monkeypatch.setattr(servicio, "convertir_respuesta", AsyncMock(return_value=seminario))
    datos = SeminarioModificar(nombre="Seminario", carrera_id=carrera, docente_id=None, fecha_inicio=date(2026, 1, 1), fecha_fin=date(2026, 2, 1))
    await servicio.modificar_seminario(id, datos, db)
    assert seminario.docente_id is None and seminario.activo is False
    db.commit.assert_awaited_once()


async def test_rechaza_asociacion_duplicada_en_otra_cohorte(db):
    from src.carreras.asociaciones import asociar_alumno
    carrera, cohorte, origen = uuid4(), uuid4(), uuid4()
    db.get.side_effect = [SimpleNamespace(activo=True), SimpleNamespace(carrera_id=carrera), SimpleNamespace(estado="ACTIVO", dni_pasaporte="12.345")]
    db.scalar.return_value = uuid4()
    with pytest.raises(HTTPException) as exc:
        await asociar_alumno(carrera, origen, cohorte, db)
    assert exc.value.status_code == 409
    assert "carrera" in exc.value.detail
    assert "cohortes.carrera_id" in str(db.scalar.await_args.args[0])
    db.add.assert_not_called()
    db.commit.assert_not_awaited()
