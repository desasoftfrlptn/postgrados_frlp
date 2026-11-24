from datetime import date, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from src.tutorias.rutas import (
    Encuentro,
    Asignacion,
    asignar,
    registrar,
    exigir,
    listar,
)


def persona(rol, activo=True, debe_cambiar_contrasena=False):
    return SimpleNamespace(
        id=uuid4(),
        rol=SimpleNamespace(nombre=rol),
        activo=activo,
        debe_cambiar_contrasena=debe_cambiar_contrasena,
    )


def test_rechaza_encuentro_futuro_realizado():
    with pytest.raises(ValidationError):
        Encuentro(
            fecha=date.today() + timedelta(days=30),
            estado="REALIZADA",
            observaciones="Acuerdo",
        )


def test_rechaza_observacion_vacia():
    with pytest.raises(ValidationError):
        Encuentro(
            fecha=date.today(),
            estado="PENDIENTE",
            observaciones="   ",
        )


@pytest.mark.parametrize(
    "rol",
    ["ASPIRANTE", "ALUMNO", "COORDINADOR", "DOCENTE"],
)
async def test_no_asigna_sin_permiso(db, rol):
    with pytest.raises(HTTPException) as exc:
        await asignar(
            Asignacion(
                legajo_id=uuid4(),
                tutor_id=uuid4(),
            ),
            persona(rol),
            db,
        )

    assert exc.value.status_code == 403
    db.commit.assert_not_awaited()


@pytest.mark.parametrize("rol", ["ADMIN", "CPR"])
async def test_no_asigna_aspirante(db, rol):
    db.scalar.side_effect = [
        None,
        SimpleNamespace(estado="PENDIENTE"),
    ]

    with pytest.raises(HTTPException) as exc:
        await asignar(
            Asignacion(
                legajo_id=uuid4(),
                tutor_id=uuid4(),
            ),
            persona(rol),
            db,
        )

    assert exc.value.status_code == 422
    db.commit.assert_not_awaited()


async def test_cpr_puede_asignar_tutoria(db):
    tutor_id = uuid4()
    legajo_id = uuid4()

    db.scalar.side_effect = [
        None,
        SimpleNamespace(estado="ACTIVO"),
        SimpleNamespace(id=tutor_id),
    ]

    resultado = await asignar(
        Asignacion(
            legajo_id=legajo_id,
            tutor_id=tutor_id,
        ),
        persona("CPR"),
        db,
    )

    assert "id" in resultado
    db.add.assert_called_once()
    tutoria = db.add.call_args.args[0]

    assert tutoria.legajo_id == legajo_id
    assert tutoria.tutor_id == tutor_id

    db.commit.assert_awaited_once()


async def test_docente_no_registra_en_tutoria_ajena(db):
    db.scalar.return_value = None

    with pytest.raises(HTTPException) as exc:
        await registrar(
            uuid4(),
            Encuentro(
                fecha=date.today(),
                estado="PENDIENTE",
                observaciones="Acuerdo",
            ),
            persona("DOCENTE"),
            db,
        )

    assert exc.value.status_code == 404
    db.commit.assert_not_awaited()


async def test_conduccion_consulta_vacia(db):
    db.execute.return_value.all.return_value = []

    assert await listar(persona("COORDINADOR"), db) == []


@pytest.mark.parametrize("rol", ["ADMIN", "CPR"])
def test_usuario_inactivo_no_tiene_permiso(rol):
    with pytest.raises(HTTPException) as exc:
        exigir(
            persona(rol, activo=False),
            "ADMIN",
            "CPR",
        )

    assert exc.value.status_code == 403


@pytest.mark.parametrize("rol", ["ADMIN", "CPR"])
def test_usuario_con_cambio_de_contrasena_pendiente(rol):
    with pytest.raises(HTTPException) as exc:
        exigir(
            persona(
                rol,
                debe_cambiar_contrasena=True,
            ),
            "ADMIN",
            "CPR",
        )

    assert exc.value.status_code == 403