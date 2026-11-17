"""Tests del service de la planilla, con un repository falso (sin base de datos)."""

import asyncio
import uuid
from datetime import date
from types import SimpleNamespace

import pytest

from src.carga_academica.application.planilla_service import (
    PlanillaService,
    SeminarioNoEncontrado,
    SinPermisoPlanilla,
)

# SimpleNamespace arma objetos "de mentira" con los atributos que necesitamos,
# sin crear filas reales en la base.
SEMINARIO_ID = uuid.uuid4()
CLASE_1 = SimpleNamespace(id=uuid.uuid4(), fecha=date(2026, 3, 3))
CLASE_2 = SimpleNamespace(id=uuid.uuid4(), fecha=date(2026, 3, 10))
ANA = SimpleNamespace(
    id=uuid.uuid4(), apellido="Pérez", nombre="Ana",
    email="ana@mail.com", titulo_grado="Ing. en Sistemas",
)
SEMINARIO = SimpleNamespace(nombre="Metodología", email_docente="juan@utn.edu.ar")


class RepositorioFalso:
    """Imita al PlanillaRepository pero devuelve datos fijos."""

    def __init__(self, seminario):
        self.seminario = seminario

    async def obtener_seminario(self, seminario_id):
        return self.seminario

    async def listar_alumnos(self, seminario_id):
        return [ANA]

    async def listar_clases(self, seminario_id):
        return [CLASE_1, CLASE_2]

    async def asistencias_del_seminario(self, seminario_id):
        # Ana vino a la clase 1 y faltó a la clase 2
        return {(CLASE_1.id, ANA.id): True, (CLASE_2.id, ANA.id): False}


def usuario(rol, email="juan@utn.edu.ar"):
    """Un usuario de mentira con el rol y el email que le pidamos."""
    return SimpleNamespace(rol=rol, email=email)


def test_docente_del_seminario_recibe_la_planilla_armada():
    # Arrange
    service = PlanillaService(RepositorioFalso(SEMINARIO))
    # Act
    planilla = asyncio.run(service.obtener_planilla(SEMINARIO_ID, usuario("docente")))
    # Assert
    assert planilla["seminario"] == "Metodología"
    assert planilla["fechas"] == [date(2026, 3, 3), date(2026, 3, 10)]
    fila = planilla["alumnos"][0]
    assert fila["apellido"] == "Pérez"
    assert fila["asistencias"] == ["P", "A"]
    assert fila["porcentaje"] == 50.0


def test_seminario_inexistente_lanza_no_encontrado():
    # Arrange
    service = PlanillaService(RepositorioFalso(seminario=None))
    # Act + Assert
    with pytest.raises(SeminarioNoEncontrado):
        asyncio.run(service.obtener_planilla(SEMINARIO_ID, usuario("coordinador")))


def test_docente_de_otro_seminario_lanza_sin_permiso():
    # Arrange
    service = PlanillaService(RepositorioFalso(SEMINARIO))
    otro_docente = usuario("docente", email="ana.docente@utn.edu.ar")
    # Act + Assert
    with pytest.raises(SinPermisoPlanilla):
        asyncio.run(service.obtener_planilla(SEMINARIO_ID, otro_docente))