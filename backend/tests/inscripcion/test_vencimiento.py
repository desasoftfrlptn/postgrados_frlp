"""Tests de la regla de vencimiento de reservas (US-CORE-010)."""

from datetime import datetime, timezone

import pytest

from src.inscripcion.domain.vencimiento import debe_vencer, fecha_de_vencimiento

COMPLETADO = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)


@pytest.mark.parametrize("ahora, esperado", [
    (datetime(2026, 10, 30, 12, 0, tzinfo=timezone.utc), False),  # 29 días: todavía no
    (datetime(2026, 10, 31, 11, 59, tzinfo=timezone.utc), False), # un minuto antes de los 30
    (datetime(2026, 10, 31, 12, 0, tzinfo=timezone.utc), True),   # justo 30 días: vence
    (datetime(2026, 11, 15, 9, 0, tzinfo=timezone.utc), True),    # 45 días: vencido
])
def test_debe_vencer_a_los_30_dias(ahora, esperado):
    assert debe_vencer(COMPLETADO, ahora) is esperado


def test_fecha_de_vencimiento_es_30_dias_despues():
    # Act
    vence = fecha_de_vencimiento(COMPLETADO)
    # Assert
    assert vence == datetime(2026, 10, 31, 12, 0, tzinfo=timezone.utc)
    