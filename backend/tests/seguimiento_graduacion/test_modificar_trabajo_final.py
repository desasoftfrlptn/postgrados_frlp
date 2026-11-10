"""Pruebas de modificación parcial y transacciones sin base real."""

import asyncio
from unittest.mock import MagicMock, call
from uuid import uuid4

import pytest

from src.seguimiento_graduacion.application.modificar_trabajo_final import ModificarTrabajoFinal
from src.seguimiento_graduacion.domain.repository import TrabajoFinalRepository
from src.seguimiento_graduacion.domain.exceptions import ActualizacionInvalida
from src.seguimiento_graduacion.presentation.schemas import ActualizarTrabajoFinalRequest


def test_omitido_es_distinto_de_null():
    """exclude_unset conserva la intención explícita de borrar el codirector."""
    assert ActualizarTrabajoFinalRequest().model_dump(exclude_unset=True) == {}
    assert ActualizarTrabajoFinalRequest(codirector=None).model_dump(exclude_unset=True) == {"codirector": None}


def test_modificacion_confirma_despues_de_guardar(caplog):
    """Verifica el orden de operaciones y los datos mínimos del logger."""
    repo = MagicMock(spec=TrabajoFinalRepository)
    trabajo_id, usuario_id = uuid4(), uuid4()
    cambios = {"titulo": "TITULO_PRIVADO"}
    with caplog.at_level("INFO", logger="seguimiento_graduacion.auditoria"):
        resultado = asyncio.run(ModificarTrabajoFinal(repo).ejecutar(
            trabajo_id, cambios, usuario_id=usuario_id, usuario_rol="cpr"))
    assert resultado is repo.actualizar.return_value
    assert repo.mock_calls == [call.obtener_por_id(trabajo_id),
                               call.actualizar(repo.obtener_por_id.return_value, cambios), call.confirmar()]
    evento = caplog.records[-1]
    assert evento.resultado == "modificado"
    assert evento.campos == ["titulo"]
    assert evento.trabajo_final_id == str(trabajo_id)
    assert "TITULO_PRIVADO" not in str(evento.__dict__)


@pytest.mark.parametrize("operacion", ["obtener_por_id", "actualizar", "confirmar"])
def test_fallo_revierte_y_no_registra_exito(operacion, caplog):
    """Los errores de consulta, escritura y commit revierten la transacción."""
    repo = MagicMock(spec=TrabajoFinalRepository)
    error = RuntimeError("Fallo simulado")
    getattr(repo, operacion).side_effect = error
    with caplog.at_level("INFO", logger="seguimiento_graduacion.auditoria"):
        with pytest.raises(RuntimeError) as capturado:
            asyncio.run(ModificarTrabajoFinal(repo).ejecutar(
                uuid4(), {"titulo": "Nuevo"}, usuario_id=uuid4(), usuario_rol="cpr"))
    assert capturado.value is error
    repo.revertir.assert_awaited_once()
    assert caplog.records[-1].resultado == "error"


@pytest.mark.parametrize("cambios", [{"creado_por": "otro"}, {"titulo": None}])
def test_caso_de_uso_protege_campos(cambios):
    """No permite modificar campos protegidos incluso sin pasar por HTTP."""
    repo = MagicMock(spec=TrabajoFinalRepository)
    with pytest.raises(ActualizacionInvalida):
        asyncio.run(ModificarTrabajoFinal(repo).ejecutar(
            uuid4(), cambios, usuario_id=uuid4(), usuario_rol="cpr"))
    repo.obtener_por_id.assert_not_awaited()
    repo.revertir.assert_awaited_once()
