"""Pruebas de lectura del semáforo persistido sin base de datos."""

import asyncio
from types import SimpleNamespace
from unittest.mock import MagicMock, call
from uuid import uuid4

import pytest

from src.seguimiento_graduacion.application.consultar_semaforo import ConsultarSemaforo
from src.seguimiento_graduacion.domain.exceptions import AccesoDenegado, LegajoNoEncontrado
from src.seguimiento_graduacion.domain.repository import TrabajoFinalRepository


@pytest.mark.parametrize("color", ["VERDE", "AMARILLO", "ROJO"])
@pytest.mark.parametrize("manual", [True, False])
def test_lee_valor_sin_modificar(color, manual):
    """No depende de fechas ni progreso y conserva la asignación manual."""
    repo = MagicMock(spec=TrabajoFinalRepository)
    legajo = SimpleNamespace(semaforo=color, semaforo_manual=manual)
    repo.obtener_legajo.return_value = legajo
    legajo_id = uuid4()
    respuesta = asyncio.run(ConsultarSemaforo(repo).ejecutar(legajo_id, usuario_rol="coordinador"))
    assert respuesta == {"semaforo": color, "semaforo_manual": manual}
    assert vars(legajo) == respuesta
    assert repo.mock_calls == [call.obtener_legajo(legajo_id)]


@pytest.mark.parametrize("rol", ["cpr", "admin", "docente", "estudiante", ""])
def test_restringe_consulta_al_coordinador(rol):
    """El permiso también se controla al invocar el caso de uso directamente."""
    repo = MagicMock(spec=TrabajoFinalRepository)
    with pytest.raises(AccesoDenegado):
        asyncio.run(ConsultarSemaforo(repo).ejecutar(uuid4(), usuario_rol=rol))
    assert repo.mock_calls == []


def test_legajo_inexistente():
    """No inventa un color cuando no existe el legajo."""
    repo = MagicMock(spec=TrabajoFinalRepository)
    repo.obtener_legajo.return_value = None
    with pytest.raises(LegajoNoEncontrado):
        asyncio.run(ConsultarSemaforo(repo).ejecutar(uuid4(), usuario_rol="coordinador"))


def test_error_de_consulta_se_propaga():
    """No transforma un fallo técnico en un color válido."""
    repo = MagicMock(spec=TrabajoFinalRepository)
    repo.obtener_legajo.side_effect = RuntimeError("Error simulado")
    with pytest.raises(RuntimeError, match="Error simulado"):
        asyncio.run(ConsultarSemaforo(repo).ejecutar(uuid4(), usuario_rol="coordinador"))
    repo.confirmar.assert_not_awaited()
