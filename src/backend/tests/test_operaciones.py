from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4
import pytest
from fastapi import HTTPException
from src.inscripcion.aplicacion.cambiar_estado_legajo import (
    cambiar_estado_legajo,
)

@pytest.fixture
def repositorio():
    return SimpleNamespace(
        obtener_por_id=AsyncMock(
            return_value=SimpleNamespace(estado="PENDIENTE"),
        ),
        actualizar_estado_legajo=AsyncMock(
            return_value=SimpleNamespace(estado="EN_REVISION"),
        ),
    )

async def test_coordinador_inicia_revision(
    repositorio,
    usuario,
):
    usuario.rol.nombre = "COORDINADOR"
    legajo_id = uuid4()

    resultado = await cambiar_estado_legajo(
        repositorio,
        legajo_id,
        "EN_REVISION",
        usuario,
    )
    assert resultado.estado == "EN_REVISION"
    repositorio.actualizar_estado_legajo.assert_awaited_once_with(
        legajo_id=legajo_id,
        estado_actual="PENDIENTE",
        estado_nuevo="EN_REVISION",
    )

@pytest.mark.parametrize(
    "rol",
    ["ASPIRANTE", "DOCENTE", "CPR", "ADMIN"],
)
async def test_otros_roles_no_cambian_estado(
    rol,
    repositorio,
    usuario,
):
    usuario.rol.nombre = rol

    with pytest.raises(HTTPException) as error:
        await cambiar_estado_legajo(
            repositorio,
            uuid4(),
            "EN_REVISION",
            usuario,
        )

    assert error.value.status_code == 403
    repositorio.actualizar_estado_legajo.assert_not_awaited()

async def test_usuario_inactivo_no_cambia_estado(
    repositorio,
    usuario,
):
    usuario.rol.nombre = "COORDINADOR"
    usuario.activo = False

    with pytest.raises(HTTPException) as error:
        await cambiar_estado_legajo(
            repositorio,
            uuid4(),
            "EN_REVISION",
            usuario,
        )

    assert error.value.status_code == 403
    repositorio.actualizar_estado_legajo.assert_not_awaited()

async def test_legajo_inexistente(repositorio, usuario):
    usuario.rol.nombre = "COORDINADOR"
    repositorio.obtener_por_id.return_value = None

    with pytest.raises(HTTPException) as error:
        await cambiar_estado_legajo(
            repositorio,
            uuid4(),
            "EN_REVISION",
            usuario,
        )

    assert error.value.status_code == 404

async def test_transicion_no_permitida(repositorio, usuario):
    usuario.rol.nombre = "COORDINADOR"

    with pytest.raises(HTTPException) as error:
        await cambiar_estado_legajo(
            repositorio,
            uuid4(),
            "ACTIVO",
            usuario,
        )

    assert error.value.status_code == 400
    repositorio.actualizar_estado_legajo.assert_not_awaited()

async def test_conflicto_por_modificacion_concurrente(
    repositorio,
    usuario,
):
    usuario.rol.nombre = "COORDINADOR"
    repositorio.actualizar_estado_legajo.return_value = None
    with pytest.raises(HTTPException) as error:
        await cambiar_estado_legajo(
            repositorio,
            uuid4(),
            "EN_REVISION",
            usuario,
        )
    assert error.value.status_code == 409