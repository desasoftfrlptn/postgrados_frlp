"""Pruebas de consulta sin FastAPI, SQLAlchemy ni base de datos."""

import asyncio
from unittest.mock import MagicMock, call
from uuid import uuid4

import pytest

from src.seguimiento_graduacion.application.consultar_trabajo_final import ConsultarTrabajoFinal
from src.seguimiento_graduacion.domain.exceptions import (
    AccesoDenegado, LegajoNoEncontrado, TrabajoFinalNoEncontrado,
)
from src.seguimiento_graduacion.domain.repository import TrabajoFinalRepository


@pytest.fixture
def escenario():
    """Proporciona un repositorio simulado y el caso de uso real."""
    repo = MagicMock(spec=TrabajoFinalRepository)
    repo.obtener_legajo.return_value = object()
    repo.obtener_por_legajo.return_value = object()
    return repo, ConsultarTrabajoFinal(repo), uuid4()


@pytest.mark.parametrize("rol", ["cpr", "coordinador"])
def test_consulta_exitosa(escenario, rol):
    """Consulta en orden y devuelve el objeto sin confirmar transacciones."""
    repo, caso, legajo_id = escenario
    assert asyncio.run(caso.ejecutar(legajo_id, usuario_rol=rol)) is repo.obtener_por_legajo.return_value
    assert repo.mock_calls == [call.obtener_legajo(legajo_id), call.obtener_por_legajo(legajo_id)]


@pytest.mark.parametrize("rol", ["admin", "docente", "estudiante", ""])
def test_consulta_sin_permiso(escenario, rol):
    """Deniega el acceso incluso cuando se invoca sin pasar por HTTP."""
    repo, caso, legajo_id = escenario
    with pytest.raises(AccesoDenegado):
        asyncio.run(caso.ejecutar(legajo_id, usuario_rol=rol))
    assert repo.mock_calls == []


def test_legajo_inexistente(escenario):
    """No busca trabajos de un legajo que no existe."""
    repo, caso, legajo_id = escenario
    repo.obtener_legajo.return_value = None
    with pytest.raises(LegajoNoEncontrado):
        asyncio.run(caso.ejecutar(legajo_id, usuario_rol="cpr"))
    repo.obtener_por_legajo.assert_not_awaited()


def test_trabajo_inexistente(escenario):
    """Distingue el trabajo ausente del legajo ausente."""
    repo, caso, legajo_id = escenario
    repo.obtener_por_legajo.return_value = None
    with pytest.raises(TrabajoFinalNoEncontrado):
        asyncio.run(caso.ejecutar(legajo_id, usuario_rol="cpr"))


def test_error_de_consulta_no_se_confunde_con_ausencia(escenario):
    """Un fallo técnico se propaga y no se convierte en no encontrado."""
    repo, caso, legajo_id = escenario
    repo.obtener_por_legajo.side_effect = RuntimeError("Error simulado")
    with pytest.raises(RuntimeError, match="Error simulado"):
        asyncio.run(caso.ejecutar(legajo_id, usuario_rol="cpr"))
    repo.confirmar.assert_not_awaited()
