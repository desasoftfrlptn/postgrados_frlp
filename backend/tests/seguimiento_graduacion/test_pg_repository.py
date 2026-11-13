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


def test_crear_construye_modelo_con_responsable(componentes):
    """Conserva todos los datos recibidos y la identidad del responsable."""
    from dataclasses import asdict
    from src.seguimiento_graduacion.domain.repository import DatosTrabajoFinal

    repo, session, _, TrabajoFinal = componentes
    datos = DatosTrabajoFinal("TFI", "Trabajo", "Ana", date(2026, 11, 9), "123", "Juan")
    legajo_id = uuid4()
    trabajo = asyncio.run(repo.crear(legajo_id, datos, "cpr@example.com"))
    assert isinstance(trabajo, TrabajoFinal)
    assert trabajo.legajo_id == legajo_id
    assert trabajo.creado_por == "cpr@example.com"
    for campo, valor in asdict(datos).items():
        assert getattr(trabajo, campo) == valor
    session.add.assert_called_once_with(trabajo)
    session.flush.assert_awaited_once()
    session.commit.assert_not_awaited()


@pytest.mark.parametrize("operacion", ["crear", "confirmar"])
@pytest.mark.parametrize(
    "codigo,restriccion,duplicado",
    [("23505", "trabajos_finales_legajo_id_key", True),
     ("23505", "otra_restriccion", False),
     ("23503", "trabajos_finales_legajo_id_fkey", False)],
)
def test_traduce_integridad_sin_confundir_restricciones(componentes, operacion, codigo, restriccion, duplicado):
    """Solo el conflicto UNIQUE del legajo se informa como trabajo duplicado."""
    from src.seguimiento_graduacion.domain.exceptions import IntegridadTrabajoFinal, TrabajoFinalDuplicado
    from src.seguimiento_graduacion.domain.repository import DatosTrabajoFinal

    repo, session, _, _ = componentes
    detalle = Exception("Error simulado de PostgreSQL")
    detalle.sqlstate = codigo
    detalle.constraint_name = restriccion
    original = Exception("Error simulado del adaptador")
    original.__cause__ = detalle
    error = IntegrityError("INSERT", {}, original)
    getattr(session, "flush" if operacion == "crear" else "commit").side_effect = error
    esperado = TrabajoFinalDuplicado if duplicado else IntegridadTrabajoFinal
    with pytest.raises(esperado) as capturado:
        if operacion == "crear":
            datos = DatosTrabajoFinal("TFI", "Trabajo", "Ana", date(2026, 11, 9), "123")
            asyncio.run(repo.crear(uuid4(), datos, "cpr@example.com"))
        else:
            asyncio.run(repo.confirmar())
    assert capturado.value.__cause__ is error
    session.rollback.assert_not_awaited()


def test_confirmar_y_revertir_delegan_en_sesion(componentes):
    """El caso de uso puede controlar explícitamente la transacción."""
    repo, session, _, _ = componentes
    asyncio.run(repo.confirmar())
    session.commit.assert_awaited_once()
    asyncio.run(repo.revertir())
    session.rollback.assert_awaited_once()


@pytest.mark.parametrize("existe", [True, False])
def test_obtener_trabajo_por_id(componentes, existe):
    """Busca por el id del trabajo, no por el del legajo."""
    repo, session, _, TrabajoFinal = componentes
    trabajo_id = uuid4()
    esperado = TrabajoFinal(id=trabajo_id) if existe else None
    session.get.return_value = esperado
    assert asyncio.run(repo.obtener_por_id(trabajo_id)) is esperado
    session.get.assert_awaited_once_with(TrabajoFinal, trabajo_id)


def test_actualizar_preserva_otros_campos(componentes):
    """Aplica un cambio parcial al objeto existente sin confirmar por su cuenta."""
    repo, session, _, TrabajoFinal = componentes
    trabajo = TrabajoFinal(id=uuid4(), titulo="Anterior", director="Ana", creado_por="autor@example.com")
    assert asyncio.run(repo.actualizar(trabajo, {"titulo": "Nuevo", "codirector": None})) is trabajo
    assert trabajo.titulo == "Nuevo"
    assert trabajo.codirector is None
    assert trabajo.director == "Ana"
    assert trabajo.creado_por == "autor@example.com"
    session.flush.assert_awaited_once()
    session.commit.assert_not_awaited()


@pytest.mark.parametrize("filtrado", [True, False])
def test_listado_rojo_aplica_filtros_a_conteo_y_pagina(componentes, filtrado):
    """El WHERE exige ROJO en ambas consultas y excluye los otros colores."""
    from sqlalchemy import and_

    repo, session, Legajo, _ = componentes
    cohorte = uuid4() if filtrado else None
    tipo = "Maestria" if filtrado else None
    condiciones = [Legajo.semaforo == "ROJO"]
    if filtrado:
        condiciones += [Legajo.cohorte_id == cohorte, Legajo.tipo_carrera == tipo]
    session.scalar.return_value = 5
    fila = Legajo(id=uuid4(), semaforo="ROJO")
    session.scalars.return_value = [fila]
    assert asyncio.run(repo.listar_en_riesgo(offset=2, limit=2, cohorte_id=cohorte,
                                          tipo_carrera=tipo)) == ([fila], 5)
    conteo = session.scalar.call_args.args[0]
    listado = session.scalars.call_args.args[0]
    assert conteo.whereclause.compare(and_(*condiciones))
    assert listado.whereclause.compare(and_(*condiciones))
    for consulta in (conteo, listado):
        sql = str(consulta.compile(compile_kwargs={"literal_binds": True}))
        assert "semaforo = 'ROJO'" in sql
        assert "VERDE" not in sql and "AMARILLO" not in sql
    sql = str(listado.compile(compile_kwargs={"literal_binds": True}))
    assert "LIMIT 2 OFFSET 2" in sql
    assert "ORDER BY postgrados.legajos.apellido, postgrados.legajos.nombre, postgrados.legajos.id" in sql
    session.add.assert_not_called()
    session.flush.assert_not_awaited()
    session.commit.assert_not_awaited()


def test_listado_rojo_vacio(componentes):
    """Una consulta sin coincidencias devuelve lista vacía y total cero."""
    repo, session, _, _ = componentes
    session.scalar.return_value = 0
    session.scalars.return_value = []
    assert asyncio.run(repo.listar_en_riesgo(offset=0, limit=20)) == ([], 0)
