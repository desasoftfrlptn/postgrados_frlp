"""Tests del service de clases y asistencia (US-B-002), con un repository falso."""

import asyncio
import uuid
from datetime import date
from types import SimpleNamespace

import pytest

from src.carga_academica.application.asistencia_service import (
    AlumnoNoInscripto,
    AsistenciaService,
    ClaseDuplicada,
    ClaseNoEncontrada,
)
from src.carga_academica.application.planilla_service import SinPermisoPlanilla

SEMINARIO_ID = uuid.uuid4()
OTRO_SEMINARIO_ID = uuid.uuid4()
SEMINARIO = SimpleNamespace(nombre="Metodología", email_docente="juan@utn.edu.ar")
CLASE = SimpleNamespace(id=uuid.uuid4(), seminario_id=SEMINARIO_ID, fecha=date(2026, 3, 3))
ANA = uuid.uuid4()
LUIS = uuid.uuid4()


class RepositorioFalso:
    """Imita al AsistenciaRepository con datos en memoria."""

    def __init__(self, clases=(CLASE,), inscriptos=(ANA, LUIS), marcas=None):
        self.clases = list(clases)
        self.inscriptos = list(inscriptos)
        self.marcas = dict(marcas or {})   # {(clase_id, legajo_id): presente}

    async def obtener_seminario(self, seminario_id):
        return SEMINARIO

    async def listar_clases(self, seminario_id):
        return self.clases

    async def existe_clase_en_fecha(self, seminario_id, fecha):
        return any(clase.fecha == fecha for clase in self.clases)

    async def crear_clase(self, seminario_id, fecha):
        clase = SimpleNamespace(id=uuid.uuid4(), seminario_id=seminario_id, fecha=fecha)
        self.clases.append(clase)
        return clase

    async def obtener_clase(self, clase_id):
        return next((clase for clase in self.clases if clase.id == clase_id), None)

    async def inscriptos_del_seminario(self, seminario_id):
        return self.inscriptos

    async def legajos_inscriptos(self, seminario_id, legajo_ids):
        return set(self.inscriptos) & set(legajo_ids)

    async def asistencias_del_seminario(self, seminario_id):
        return self.marcas

    async def guardar_asistencias(self, clase_id, celdas):
        for legajo_id, presente in celdas:
            self.marcas[(clase_id, legajo_id)] = presente


def usuario(rol="docente", email="juan@utn.edu.ar"):
    return SimpleNamespace(rol=rol, email=email)


# ---------- Listar clases ----------

def test_listar_clases_trae_la_asistencia_de_cada_inscripto():
    # Arrange: Ana está presente; a Luis nunca lo tocaron
    repo = RepositorioFalso(marcas={(CLASE.id, ANA): True})
    service = AsistenciaService(repo)
    # Act
    clases = asyncio.run(service.listar_clases(SEMINARIO_ID, usuario()))
    # Assert: la celda sin tocar va como ausente
    assert clases == [
        {
            "id": CLASE.id,
            "seminario_id": SEMINARIO_ID,
            "fecha": date(2026, 3, 3),
            "asistencias": [
                {"legajo_id": ANA, "presente": True},
                {"legajo_id": LUIS, "presente": False},
            ],
        }
    ]


def test_otro_docente_no_puede_ver_las_clases():
    # Arrange
    service = AsistenciaService(RepositorioFalso())
    otro = usuario(email="ana.docente@utn.edu.ar")
    # Act + Assert
    with pytest.raises(SinPermisoPlanilla):
        asyncio.run(service.listar_clases(SEMINARIO_ID, otro))


# ---------- Crear clase ----------

def test_nueva_clase_arranca_con_todos_ausentes():
    # Arrange
    service = AsistenciaService(RepositorioFalso())
    # Act
    clase = asyncio.run(service.crear_clase(SEMINARIO_ID, date(2026, 3, 24), usuario()))
    # Assert
    assert clase["fecha"] == date(2026, 3, 24)
    assert clase["asistencias"] == [
        {"legajo_id": ANA, "presente": False},
        {"legajo_id": LUIS, "presente": False},
    ]


def test_no_se_puede_crear_dos_clases_en_la_misma_fecha():
    # Arrange: ya existe CLASE el 3/3
    service = AsistenciaService(RepositorioFalso())
    # Act + Assert
    with pytest.raises(ClaseDuplicada):
        asyncio.run(service.crear_clase(SEMINARIO_ID, date(2026, 3, 3), usuario()))


def test_otro_docente_no_puede_crear_clases():
    # Arrange
    service = AsistenciaService(RepositorioFalso())
    otro = usuario(email="ana.docente@utn.edu.ar")
    # Act + Assert
    with pytest.raises(SinPermisoPlanilla):
        asyncio.run(service.crear_clase(SEMINARIO_ID, date(2026, 3, 24), otro))


# ---------- Cargar asistencia ----------

def test_cargar_asistencia_guarda_y_devuelve_la_clase_actualizada():
    # Arrange
    repo = RepositorioFalso()
    service = AsistenciaService(repo)
    # Act
    clase = asyncio.run(
        service.cargar_asistencia(SEMINARIO_ID, CLASE.id, ANA, True, usuario())
    )
    # Assert: se guardó la celda y la respuesta ya la trae marcada
    assert repo.marcas == {(CLASE.id, ANA): True}
    assert {"legajo_id": ANA, "presente": True} in clase["asistencias"]


def test_destildar_cambia_presente_a_ausente():
    # Arrange: Ana estaba presente
    repo = RepositorioFalso(marcas={(CLASE.id, ANA): True})
    service = AsistenciaService(repo)
    # Act
    clase = asyncio.run(
        service.cargar_asistencia(SEMINARIO_ID, CLASE.id, ANA, False, usuario())
    )
    # Assert
    assert {"legajo_id": ANA, "presente": False} in clase["asistencias"]


def test_clase_de_otro_seminario_lanza_no_encontrada():
    # Arrange: la clase existe pero es de otro seminario (intento de IDOR)
    clase_ajena = SimpleNamespace(
        id=uuid.uuid4(), seminario_id=OTRO_SEMINARIO_ID, fecha=date(2026, 3, 3)
    )
    service = AsistenciaService(RepositorioFalso(clases=[clase_ajena]))
    # Act + Assert
    with pytest.raises(ClaseNoEncontrada):
        asyncio.run(
            service.cargar_asistencia(SEMINARIO_ID, clase_ajena.id, ANA, True, usuario())
        )


def test_alumno_no_inscripto_no_se_puede_cargar():
    # Arrange
    intruso = uuid.uuid4()
    repo = RepositorioFalso()
    service = AsistenciaService(repo)
    # Act + Assert
    with pytest.raises(AlumnoNoInscripto):
        asyncio.run(
            service.cargar_asistencia(SEMINARIO_ID, CLASE.id, intruso, True, usuario())
        )
    assert repo.marcas == {}   # no se guardó nada
