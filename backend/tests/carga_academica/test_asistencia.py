"""Tests de las reglas de asistencia (US-B-003).

Cada test describe en el nombre el comportamiento que verifica.
"""

import pytest

from src.carga_academica.domain.asistencia import (
    calcular_porcentaje_asistencia,
    marca_asistencia,
    puede_ver_planilla,
)


# ---------- % de asistencia ----------

def test_porcentaje_con_todas_las_clases_da_100():
    # Arrange
    presentes, total = 4, 4
    # Act
    resultado = calcular_porcentaje_asistencia(presentes, total)
    # Assert
    assert resultado == 100.0


def test_porcentaje_con_3_de_4_clases_da_75():
    # Arrange
    presentes, total = 3, 4
    # Act
    resultado = calcular_porcentaje_asistencia(presentes, total)
    # Assert
    assert resultado == 75.0


def test_porcentaje_sin_clases_da_0_y_no_divide_por_cero():
    # Arrange
    presentes, total = 0, 0
    # Act
    resultado = calcular_porcentaje_asistencia(presentes, total)
    # Assert
    assert resultado == 0.0


def test_porcentaje_se_redondea_a_un_decimal():
    # Arrange
    presentes, total = 2, 3
    # Act
    resultado = calcular_porcentaje_asistencia(presentes, total)
    # Assert
    assert resultado == 66.7


# ---------- Marca P / A ----------

@pytest.mark.parametrize("presente, esperado", [
    (True, "P"),
    (False, "A"),
    (None, "A"),   # sin registro de esa clase cuenta como ausente
])
def test_marca_asistencia(presente, esperado):
    assert marca_asistencia(presente) == esperado


# ---------- Quién puede ver la planilla (BR-007) ----------

def test_docente_puede_ver_su_seminario():
    # Arrange
    rol, email_usuario, email_docente = "docente", "juan@utn.edu.ar", "juan@utn.edu.ar"
    # Act
    resultado = puede_ver_planilla(rol, email_usuario, email_docente)
    # Assert
    assert resultado is True


def test_docente_no_puede_ver_seminario_ajeno():
    # Arrange
    rol, email_usuario, email_docente = "docente", "juan@utn.edu.ar", "ana@utn.edu.ar"
    # Act
    resultado = puede_ver_planilla(rol, email_usuario, email_docente)
    # Assert
    assert resultado is False




def test_docente_con_mayusculas_en_el_email_igual_puede():
    # Arrange
    rol, email_usuario, email_docente = "docente", "Juan@UTN.edu.ar", "juan@utn.edu.ar"
    # Act
    resultado = puede_ver_planilla(rol, email_usuario, email_docente)
    # Assert
    assert resultado is True


@pytest.mark.parametrize("rol, esperado", [
    ("coordinador", True),
    ("admin", True),
    ("estudiante", False),
    ("cpr", False),
])
def test_otros_roles_ver_planilla_ajena(rol, esperado):
    assert puede_ver_planilla(rol, "otro@utn.edu.ar", "ana@utn.edu.ar") == esperado