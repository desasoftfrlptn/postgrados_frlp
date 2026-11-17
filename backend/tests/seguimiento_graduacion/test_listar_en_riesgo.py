"""Pruebas del listado de riesgo sin dependencias HTTP ni base real."""

import asyncio
from unittest.mock import MagicMock, call
from uuid import uuid4

import pytest

from src.seguimiento_graduacion.application.listar_estudiantes_en_riesgo import ListarEstudiantesEnRiesgo
from src.seguimiento_graduacion.domain.exceptions import AccesoDenegado
from src.seguimiento_graduacion.domain.repository import TrabajoFinalRepository


@pytest.mark.parametrize("total,page,limite,paginas", [(0, 1, 20, 0), (21, 2, 20, 2), (20, 1, 20, 1)])
def test_listado_paginado(total, page, limite, paginas):
    """Propaga filtros y calcula el total de páginas sin escribir."""
    repo = MagicMock(spec=TrabajoFinalRepository)
    filas = [object()] if total else []
    repo.listar_en_riesgo.return_value = filas, total
    cohorte = uuid4()
    respuesta = asyncio.run(ListarEstudiantesEnRiesgo(repo).ejecutar(
        usuario_rol="coordinador", page=page, limit=limite, cohorte_id=cohorte, tipo_carrera="Maestria"))
    assert respuesta == dict(data=filas, total=total, page=page, limit=limite, pages=paginas)
    assert repo.mock_calls == [call.listar_en_riesgo(offset=(page - 1) * limite, limit=limite,
                                                  cohorte_id=cohorte, tipo_carrera="Maestria")]


@pytest.mark.parametrize("rol", ["cpr", "admin", "docente", "estudiante"])
def test_permiso_del_caso_de_uso(rol):
    """Deniega acceso antes de ejecutar consultas."""
    repo = MagicMock(spec=TrabajoFinalRepository)
    with pytest.raises(AccesoDenegado):
        asyncio.run(ListarEstudiantesEnRiesgo(repo).ejecutar(usuario_rol=rol))
    assert repo.mock_calls == []


@pytest.mark.parametrize("page,limit", [(0, 20), (1, 0), (1, 101)])
def test_paginacion_invalida(page, limit):
    """Protege el caso de uso incluso si se invoca fuera del endpoint."""
    repo = MagicMock(spec=TrabajoFinalRepository)
    with pytest.raises(ValueError):
        asyncio.run(ListarEstudiantesEnRiesgo(repo).ejecutar(usuario_rol="coordinador", page=page, limit=limit))
    repo.listar_en_riesgo.assert_not_awaited()
