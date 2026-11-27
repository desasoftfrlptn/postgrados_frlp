from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from src.conduccion import servicio as conduccion
from src.usuarios import servicio as usuarios


def admin():
    return SimpleNamespace(id=uuid4(), rol=SimpleNamespace(nombre="ADMIN"))


async def test_eliminar_usuario_limpia_admisiones_antes_del_commit(db, usuario, monkeypatch):
    db.get.return_value = usuario
    limpiar = AsyncMock()
    monkeypatch.setattr(conduccion, "eliminar_admisiones_de_usuario", limpiar)
    actor = admin()
    await usuarios.eliminar_usuario(usuario.id, actor, db)
    limpiar.assert_awaited_once_with(db, usuario.dni, actor)
    db.delete.assert_awaited_once_with(usuario)
    db.commit.assert_awaited_once()


async def test_si_falla_la_limpieza_no_se_elimina_cuenta(db, usuario, monkeypatch):
    db.get.return_value = usuario
    monkeypatch.setattr(conduccion, "eliminar_admisiones_de_usuario", AsyncMock(side_effect=HTTPException(409, "Historial asociado")))
    with pytest.raises(HTTPException) as exc:
        await usuarios.eliminar_usuario(usuario.id, admin(), db)
    assert exc.value.status_code == 409
    db.delete.assert_not_awaited()
    db.commit.assert_not_awaited()
    db.rollback.assert_awaited_once()


async def test_limpia_admisiones_pero_conserva_matricula(db, monkeypatch):
    aspirante = SimpleNamespace(id=uuid4(), estado="PENDIENTE")
    matriculado = SimpleNamespace(id=uuid4(), estado="COMPLETADO")
    db.execute.return_value.scalars.return_value.all.return_value = [aspirante, matriculado]
    monkeypatch.setattr(conduccion, "obtener_gestion", AsyncMock(side_effect=[None, SimpleNamespace(fecha_matricula="2026-01-01")]))
    monkeypatch.setattr(conduccion, "tiene_actividad_academica", AsyncMock(return_value=False))
    eliminar = AsyncMock()
    monkeypatch.setattr(conduccion, "_eliminar_admision", eliminar)
    actor = admin()
    await conduccion.eliminar_admisiones_de_usuario(db, "12.345.678", actor)
    eliminar.assert_awaited_once_with(db, aspirante.id, actor)
    db.commit.assert_not_awaited()


async def test_limpieza_masiva_rechaza_otros_roles(db):
    actor = SimpleNamespace(rol=SimpleNamespace(nombre="DOCENTE"))
    with pytest.raises(HTTPException) as exc:
        await conduccion.eliminar_admisiones_de_usuario(db, "12345678", actor)
    assert exc.value.status_code == 403
    db.execute.assert_not_awaited()


@pytest.mark.parametrize("actividad", [False, True])
async def test_baja_matriculada_limpieza_segun_actividad(db, monkeypatch, actividad):
    legajo = SimpleNamespace(id=uuid4(), estado="BAJA")
    db.execute.return_value.scalars.return_value.all.return_value = [legajo]
    monkeypatch.setattr(conduccion, "obtener_gestion", AsyncMock(return_value=SimpleNamespace(fecha_matricula="2026-01-01")))
    monkeypatch.setattr(conduccion, "tiene_actividad_academica", AsyncMock(return_value=actividad))
    eliminar = AsyncMock()
    monkeypatch.setattr(conduccion, "_eliminar_admision", eliminar)
    actor = admin()
    await conduccion.eliminar_admisiones_de_usuario(db, "12345678", actor)
    if actividad:
        eliminar.assert_not_awaited()
    else:
        eliminar.assert_awaited_once_with(db, legajo.id, actor)
    db.commit.assert_not_awaited()


async def test_eliminacion_directa_baja_con_actividad_rechazada(db, monkeypatch):
    legajo = SimpleNamespace(id=uuid4(), estado="BAJA")
    monkeypatch.setattr(conduccion, "obtener_legajo", AsyncMock(return_value=legajo))
    monkeypatch.setattr(conduccion, "obtener_gestion", AsyncMock(return_value=SimpleNamespace(fecha_matricula="2026-01-01")))
    monkeypatch.setattr(conduccion, "tiene_actividad_academica", AsyncMock(return_value=True))
    with pytest.raises(HTTPException) as exc:
        await conduccion._eliminar_admision(db, legajo.id, admin())
    assert exc.value.status_code == 409
    db.delete.assert_not_awaited()
