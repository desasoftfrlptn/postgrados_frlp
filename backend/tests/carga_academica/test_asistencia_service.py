"""Tests del service de clases y asistencia (US-B-002), con un repository falso."""

import asyncio
import uuid
from datetime import date
from types import SimpleNamespace

import pytest

from src.carga_academica.application.asistencia_service import (
    AlumnosNoInscriptos,
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
    """Imita al AsistenciaRepository con datos fijos y anota lo que se guardó."""

    def __init__(self, fechas_existentes=(), clase=CLASE, inscriptos=(ANA, LUIS),
                 presentes=None, total_clases=3):
        self.fechas_existentes = set(fechas_existentes)
        self.clase = clase
        self.inscriptos = set(inscriptos)
        self.presentes = presentes or {}
        self.total_clases = total_clases
        self.guardadas = None          # acá queda lo que el service mandó a guardar

    async def obtener_seminario(self, seminario_id):
        return SEMINARIO

    async def existe_clase_en_fecha(self, seminario_id, fecha):
        return fecha in self.fechas_existentes

    async def crear_clase(self, seminario_id, fecha):
        return SimpleNamespace(id=uuid.uuid4(), seminario_id=seminario_id, fecha=fecha)

    async def obtener_clase(self, clase_id):
        return self.clase

    async def contar_clases(self, seminario_id):
        return self.total_clases

    async def legajos_inscriptos(self, seminario_id, legajo_ids):
        return self.inscriptos & set(legajo_ids)

    async def guardar_asistencias(self, clase_id, celdas):
        self.guardadas = celdas

    async def contar_presentes(self, seminario_id, legajo_ids):
        return {k: v for k, v in self.presentes.items() if k in legajo_ids}


def usuario(rol="docente", email="juan@utn.edu.ar"):
    return SimpleNamespace(rol=rol, email=email)


# ---------- Crear clase ----------

def test_docente_del_seminario_crea_una_clase():
    # Arrange
    service = AsistenciaService(RepositorioFalso())
    # Act
    clase = asyncio.run(service.crear_clase(SEMINARIO_ID, date(2026, 3, 24), usuario()))
    # Assert
    assert clase.fecha == date(2026, 3, 24)


def test_no_se_puede_crear_dos_clases_en_la_misma_fecha():
    # Arrange
    service = AsistenciaService(RepositorioFalso(fechas_existentes=[date(2026, 3, 24)]))
    # Act + Assert
    with pytest.raises(ClaseDuplicada):
        asyncio.run(service.crear_clase(SEMINARIO_ID, date(2026, 3, 24), usuario()))


def test_otro_docente_no_puede_crear_clases():
    # Arrange
    service = AsistenciaService(RepositorioFalso())
    otro = usuario(email="ana.docente@utn.edu.ar")
    # Act + Assert
    with pytest.raises(SinPermisoPlanilla):
        asyncio.run(service.crear_clase(SEMINARIO_ID, date(2026, 3, 24), otro))


# ---------- Cargar asistencia ----------

def test_cargar_asistencia_guarda_y_devuelve_el_porcentaje():
    # Arrange: Ana estuvo en 2 de 3 clases
    repo = RepositorioFalso(presentes={ANA: 2}, total_clases=3)
    service = AsistenciaService(repo)
    # Act
    resultado = asyncio.run(
        service.cargar_asistencias(SEMINARIO_ID, CLASE.id, [(ANA, True)], usuario())
    )
    # Assert
    assert repo.guardadas == [(ANA, True)]
    assert resultado == [{"legajo_id": ANA, "porcentaje": 66.7}]


def test_alumno_sin_presentes_tiene_cero_por_ciento():
    # Arrange
    service = AsistenciaService(RepositorioFalso(presentes={}, total_clases=3))
    # Act
    resultado = asyncio.run(
        service.cargar_asistencias(SEMINARIO_ID, CLASE.id, [(LUIS, False)], usuario())
    )
    # Assert
    assert resultado == [{"legajo_id": LUIS, "porcentaje": 0.0}]


def test_clase_de_otro_seminario_lanza_no_encontrada():
    # Arrange: la clase existe pero es de otro seminario (intento de IDOR)
    clase_ajena = SimpleNamespace(id=uuid.uuid4(), seminario_id=OTRO_SEMINARIO_ID)
    service = AsistenciaService(RepositorioFalso(clase=clase_ajena))
    # Act + Assert
    with pytest.raises(ClaseNoEncontrada):
        asyncio.run(
            service.cargar_asistencias(SEMINARIO_ID, clase_ajena.id, [(ANA, True)], usuario())
        )


def test_alumno_no_inscripto_lanza_error_con_su_legajo():
    # Arrange
    intruso = uuid.uuid4()
    service = AsistenciaService(RepositorioFalso())
    # Act + Assert
    with pytest.raises(AlumnosNoInscriptos) as error:
        asyncio.run(
            service.cargar_asistencias(SEMINARIO_ID, CLASE.id, [(intruso, True)], usuario())
        )
    assert error.value.legajo_ids == {intruso}


def test_si_un_alumno_viene_repetido_gana_el_ultimo_valor():
    # Arrange: el autosave mandó a Ana dos veces (tildó y destildó)
    repo = RepositorioFalso()
    service = AsistenciaService(repo)
    # Act
    asyncio.run(
        service.cargar_asistencias(
            SEMINARIO_ID, CLASE.id, [(ANA, True), (ANA, False)], usuario()
        )
    )
    # Assert: se guarda una sola vez, con el último valor
    assert repo.guardadas == [(ANA, False)]
    