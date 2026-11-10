"""Tests cohortes sin base de datos"""

import asyncio
from datetime import date
from types import SimpleNamespace
import pytest

from src.inscripcion.application.service import CohorteService

class CohorteFalso:
    def __init__(self, id, anio, nombre, fecha_inicio, inscripcion_abierta=False):
        self.id = id
        self.anio = anio
        self.nombre = nombre
        self.fecha_inicio = fecha_inicio
        self.inscripcion_abierta = inscripcion_abierta

class PostgresCohorteRepositoryFalso:
    def __init__(self, cohortes_iniciales=None):
        self.cohortes = cohortes_iniciales or []

    async def obtener(self):
        return self.cohortes

    async def obtener_por_id(self, cohorte_id):
        for c in self.cohortes:
            c_id = c.get("id") if isinstance(c, dict) else getattr(c, "id", None)
            if str(c_id) == str(cohorte_id):
                return c
        return None

    async def crear(self, datos):
        nueva = CohorteFalso(
            id="uuid-generado",
            anio=datos.get("anio"),
            nombre=datos.get("nombre"),
            fecha_inicio=datos.get("fecha_inicio"),
            inscripcion_abierta=datos.get("inscripcion_abierta", False)
        )
        self.cohortes.append(nueva)
        return nueva

    async def modificar(self, cohorte):
        c_id = cohorte.get("id") if isinstance(cohorte, dict) else getattr(cohorte, "id", None)
        for i, c in enumerate(self.cohortes):
            existing_id = c.get("id") if isinstance(c, dict) else getattr(c, "id", None)
            if str(existing_id) == str(c_id):
                self.cohortes[i] = cohorte
                return cohorte
        self.cohortes.append(cohorte)
        return cohorte


def test_listar_cohortes_devuelve_todas():
    cohorte_ejemplo = CohorteFalso("123", 2026, "Cohorte 2026", date(2026, 4, 1), True)
    repo_falso = PostgresCohorteRepositoryFalso([cohorte_ejemplo])
    service = CohorteService(repo_falso)

    resultado = asyncio.run(service.listar_cohortes())

    assert len(resultado) == 1
    anio = resultado[0].get("anio") if isinstance(resultado[0], dict) else resultado[0].anio
    nombre = resultado[0].get("nombre") if isinstance(resultado[0], dict) else resultado[0].nombre
    assert anio == 2026
    assert nombre == "Cohorte 2026"


def test_crear_cohorte_agrega_exitosamente():
    repo_falso = PostgresCohorteRepositoryFalso([])
    service = CohorteService(repo_falso)

    nueva = asyncio.run(service.crear_cohorte(anio=2027, nombre="Cohorte 2027", fecha_inicio=date(2027, 4, 1)))

    anio = nueva.get("anio") if isinstance(nueva, dict) else getattr(nueva, "anio", None)
    nombre = nueva.get("nombre") if isinstance(nueva, dict) else getattr(nueva, "nombre", None)

    assert anio == 2027
    assert nombre == "Cohorte 2027"
    assert len(repo_falso.cohortes) == 1


def test_gestionar_inscripcion_cambia_estado():
    cohorte_ejemplo = CohorteFalso(id=1, anio=2026, nombre="Cohorte 2026", fecha_inicio=date(2026, 4, 1), inscripcion_abierta=True)
    repo_falso = PostgresCohorteRepositoryFalso([cohorte_ejemplo])
    service = CohorteService(repo_falso)

    actualizada = asyncio.run(service.gestionar_inscripcion(cohorte_id=1, abierta=False))

    estado = actualizada.get("inscripcion_abierta") if isinstance(actualizada, dict) else getattr(actualizada, "inscripcion_abierta", None)
    assert estado is False