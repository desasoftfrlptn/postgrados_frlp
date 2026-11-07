"""Tests de las reglas de asistencia (US-B-003).

Cada test describe en el nombre el comportamiento que verifica.
"""

import pytest

from src.carga_academica.domain.asistencia import (
    calcular_porcentaje_asistencia,
    marca_asistencia,
)


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


@pytest.mark.parametrize("presente, esperado", [
    (True, "P"),
    (False, "A"),
    (None, "A"),   # sin registro de esa clase cuenta como ausente
])
def test_marca_asistencia(presente, esperado):
    assert marca_asistencia(presente) == esperado