"""Pruebas del repositorio con sesiones simuladas, sin acceso a PostgreSQL."""

import asyncio
from datetime import date
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from sqlalchemy.engine import Result
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def componentes(monkeypatch):
    """Configura una URL ficticia antes de importar los modelos compartidos.

    El motor se configura al importar, pero no se abre ninguna conexión:
    todas las operaciones se realizan sobre un doble de AsyncSession.
    """
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql+asyncpg://prueba:prueba@localhost/base_ficticia"
    )
    from src.inscripcion.infrastructure.orm_models import Legajo
    from src.seguimiento_graduacion.infrastructure.orm_models import TrabajoFinal
    from src.seguimiento_graduacion.infrastructure.pg_repository import (
        TrabajoFinalRepository,
    )

    session = MagicMock(spec=AsyncSession)
    # execute es asíncrono, pero el resultado obtenido tiene métodos síncronos.
    session.execute.return_value = MagicMock(spec=Result)
    return TrabajoFinalRepository(session), session, Legajo, TrabajoFinal


@pytest.mark.parametrize("encontrado", [True, False])
def test_obtener_legajo(componentes, encontrado):
    """Devuelve el legajo solicitado o None cuando no existe."""
    repositorio, session, Legajo, _ = componentes
    legajo_id = uuid4()
    esperado = Legajo(id=legajo_id) if encontrado else None
    session.get.return_value = esperado

    assert asyncio.run(repositorio.obtener_legajo(legajo_id)) is esperado
    session.get.assert_awaited_once_with(Legajo, legajo_id)
    session.commit.assert_not_called()


@pytest.mark.parametrize("encontrado", [True, False])
def test_obtener_por_legajo(componentes, encontrado):
    """Filtra por el identificador pedido y devuelve el trabajo o None."""
    repositorio, session, _, TrabajoFinal = componentes
    legajo_id = uuid4()
    esperado = TrabajoFinal(legajo_id=legajo_id) if encontrado else None
    session.execute.return_value.scalar_one_or_none.return_value = esperado

    assert asyncio.run(repositorio.obtener_por_legajo(legajo_id)) is esperado
    session.execute.assert_awaited_once()
    consulta = session.execute.call_args.args[0]
    assert consulta.column_descriptions[0]["entity"] is TrabajoFinal
    assert consulta.whereclause.compare(TrabajoFinal.legajo_id == legajo_id)
    session.commit.assert_not_called()


@pytest.mark.parametrize("registrado", [True, False])
def test_existe_para_legajo(componentes, registrado):
    """Distingue entre un trabajo registrado y un legajo sin trabajo final."""
    repositorio, session, _, TrabajoFinal = componentes
    legajo_id = uuid4()
    session.execute.return_value.scalar_one_or_none.return_value = (
        TrabajoFinal(legajo_id=legajo_id) if registrado else None
    )

    assert asyncio.run(repositorio.existe_para_legajo(legajo_id)) is registrado
    consulta = session.execute.call_args.args[0]
    assert consulta.whereclause.compare(TrabajoFinal.legajo_id == legajo_id)


def test_guardar_sin_confirmar_transaccion(componentes):
    """Agrega antes de flush y devuelve el mismo objeto con su id generado."""
    repositorio, session, _, TrabajoFinal = componentes
    trabajo = TrabajoFinal(
        legajo_id=uuid4(), tipo="TFI", titulo="Seguimiento de graduación",
        director="Ana Pérez", fecha_cpr=date(2026, 11, 9),
        numero_resolucion="123/26", creado_por="cpr@example.com",
    )
    id_generado = uuid4()

    async def simular_flush():
        session.add.assert_called_once_with(trabajo)
        trabajo.id = id_generado

    session.flush.side_effect = simular_flush
    guardado = asyncio.run(repositorio.guardar(trabajo))

    assert guardado is trabajo
    assert guardado.id == id_generado
    session.flush.assert_awaited_once_with()
    session.commit.assert_not_called()
    session.rollback.assert_not_called()
    session.close.assert_not_called()


def test_guardar_propaga_error_de_integridad(componentes):
    """El llamador recibe el error y conserva el control del rollback."""
    repositorio, session, _, TrabajoFinal = componentes
    trabajo = TrabajoFinal(legajo_id=uuid4())
    error = IntegrityError("INSERT", {}, Exception("Restricción de integridad"))
    session.flush.side_effect = error

    with pytest.raises(IntegrityError) as capturado:
        asyncio.run(repositorio.guardar(trabajo))

    assert capturado.value is error
    session.add.assert_called_once_with(trabajo)
    session.commit.assert_not_called()
    session.rollback.assert_not_called()


def test_consulta_propaga_error_de_sesion(componentes):
    """Una consulta fallida no se interpreta como ausencia de trabajo final."""
    repositorio, session, _, _ = componentes
    session.execute.side_effect = RuntimeError("Fallo simulado de consulta")

    with pytest.raises(RuntimeError, match="Fallo simulado de consulta"):
        asyncio.run(repositorio.existe_para_legajo(uuid4()))
