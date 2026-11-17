"""Pruebas del caso de uso sin servidor, SQLAlchemy ni base real."""

import asyncio
from datetime import date
from unittest.mock import MagicMock, call
from uuid import uuid4

import pytest

from src.seguimiento_graduacion.application.registrar_trabajo_final import RegistrarTrabajoFinal
from src.seguimiento_graduacion.domain.exceptions import (
    AccesoDenegado, IntegridadTrabajoFinal, LegajoNoEncontrado, TrabajoFinalDuplicado,
)
from src.seguimiento_graduacion.domain.repository import DatosTrabajoFinal, TrabajoFinalRepository


@pytest.fixture
def escenario():
    """Prepara un repositorio simulado con un legajo disponible."""
    repositorio = MagicMock(spec=TrabajoFinalRepository)
    repositorio.obtener_legajo.return_value = object()
    repositorio.existe_para_legajo.return_value = False
    datos = DatosTrabajoFinal("TFI", "Trabajo final", "Ana Pérez", date(2026, 11, 9), "123/26")
    return repositorio, RegistrarTrabajoFinal(repositorio), uuid4(), datos


def ejecutar(escenario, **identidad):
    """Ejecuta una operación con identidad autenticada simulada."""
    _, caso, legajo_id, datos = escenario
    return asyncio.run(caso.ejecutar(
        legajo_id, datos,
        **({"usuario_email": "cpr@example.com", "usuario_rol": "cpr"} | identidad),
    ))


def test_registro_exitoso(escenario):
    """Verifica el orden de validación, guardado y confirmación del alta."""
    repo, _, legajo_id, datos = escenario
    esperado = object()
    repo.crear.return_value = esperado
    assert ejecutar(escenario) is esperado
    assert repo.mock_calls == [
        call.obtener_legajo(legajo_id), call.existe_para_legajo(legajo_id),
        call.crear(legajo_id, datos, "cpr@example.com"), call.confirmar(),
    ]
    repo.revertir.assert_not_awaited()


@pytest.mark.parametrize("rol", ["coordinador", "admin", "docente", "estudiante", ""])
def test_solo_cpr_puede_registrar(escenario, rol):
    """Rechaza otros roles antes de consultar datos o guardar."""
    repo, *_ = escenario
    with pytest.raises(AccesoDenegado):
        ejecutar(escenario, usuario_rol=rol)
    repo.obtener_legajo.assert_not_awaited()
    repo.crear.assert_not_awaited()
    repo.confirmar.assert_not_awaited()
    repo.revertir.assert_awaited_once()


def test_responsable_obligatorio(escenario):
    """Impide registrar un trabajo sin identificar al autor."""
    with pytest.raises(AccesoDenegado):
        ejecutar(escenario, usuario_email="   ")
    escenario[0].crear.assert_not_awaited()


def test_legajo_inexistente(escenario):
    """No comprueba duplicados ni guarda si falta el legajo."""
    repo, *_ = escenario
    repo.obtener_legajo.return_value = None
    with pytest.raises(LegajoNoEncontrado):
        ejecutar(escenario)
    repo.existe_para_legajo.assert_not_awaited()
    repo.crear.assert_not_awaited()
    repo.confirmar.assert_not_awaited()
    repo.revertir.assert_awaited_once()


def test_trabajo_duplicado(escenario):
    """Evita guardar un segundo trabajo para el mismo legajo."""
    repo, *_ = escenario
    repo.existe_para_legajo.return_value = True
    with pytest.raises(TrabajoFinalDuplicado):
        ejecutar(escenario)
    repo.crear.assert_not_awaited()
    repo.confirmar.assert_not_awaited()
    repo.revertir.assert_awaited_once()


@pytest.mark.parametrize("operacion", ["obtener_legajo", "existe_para_legajo", "crear", "confirmar"])
@pytest.mark.parametrize("tipo_error", [RuntimeError, IntegridadTrabajoFinal, TrabajoFinalDuplicado])
def test_errores_revierten_transaccion(escenario, operacion, tipo_error):
    """Conserva el error original y revierte incluso si falla el commit."""
    repo, *_ = escenario
    error = tipo_error("Error simulado")
    getattr(repo, operacion).side_effect = error
    with pytest.raises(tipo_error) as capturado:
        ejecutar(escenario)
    assert capturado.value is error
    repo.revertir.assert_awaited_once()
    if operacion != "confirmar":
        repo.confirmar.assert_not_awaited()
