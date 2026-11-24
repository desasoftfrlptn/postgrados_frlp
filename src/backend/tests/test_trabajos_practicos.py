from datetime import date
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from src.trabajos_practicos.rutas import (
    AltaTrabajo, EstadoTrabajo, ModificarTrabajo, cambiar_estado, crear, modificar,
)


def persona(rol="CPR", activo=True, debe_cambiar_contrasena=False):
    return SimpleNamespace(
        activo=activo, rol=SimpleNamespace(nombre=rol),
        debe_cambiar_contrasena=debe_cambiar_contrasena,
    )


def alta():
    return AltaTrabajo(
        legajo_id=uuid4(), titulo="Trabajo", descripcion="Descripción", fecha=date.today()
    )


@pytest.mark.parametrize("rol", ["ADMIN", "ALUMNO", "DOCENTE", "COORDINADOR", "ASPIRANTE"])
async def test_alta_exclusiva_cpr(db, rol):
    with pytest.raises(HTTPException) as exc:
        await crear(alta(), persona(rol), db)
    assert exc.value.status_code == 403
    db.commit.assert_not_awaited()


async def test_no_registra_legajo_no_habilitado(db):
    db.scalar.return_value = SimpleNamespace(estado="PENDIENTE")
    with pytest.raises(HTTPException) as exc:
        await crear(alta(), persona(), db)
    assert exc.value.status_code == 422
    db.commit.assert_not_awaited()


def test_titulo_vacio():
    with pytest.raises(ValidationError):
        AltaTrabajo(legajo_id=uuid4(), titulo="   ", descripcion="Descripción", fecha=date.today())


async def test_modificacion_rechaza_version_desactualizada(db):
    db.scalar.return_value = SimpleNamespace(version=2)
    datos = ModificarTrabajo(titulo="Nuevo", descripcion="Descripción", fecha=date.today(), version=1)
    with pytest.raises(HTTPException) as exc:
        await modificar(uuid4(), datos, persona(), db)
    assert exc.value.status_code == 409
    db.commit.assert_not_awaited()


async def test_baja_conserva_registro(db):
    trabajo = SimpleNamespace(id=uuid4(), legajo_id=uuid4(), titulo="Trabajo",
                              descripcion="Descripción", fecha=date.today(), activo=True, version=1)
    legajo = SimpleNamespace(apellido="Pérez", nombre="Ana", carrera_elegida="Maestría", estado="ACTIVO")
    db.scalar.side_effect = [trabajo, legajo]
    respuesta = await cambiar_estado(trabajo.id, EstadoTrabajo(activo=False, version=1), persona(), db)
    assert respuesta["activo"] is False
    assert respuesta["version"] == 2
    db.delete.assert_not_awaited()
    db.commit.assert_awaited_once()
