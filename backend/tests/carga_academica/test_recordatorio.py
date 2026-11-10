"""Tests de la regla del recordatorio de notas (US-B-005)."""

from datetime import datetime, timezone

import pytest

from src.carga_academica.domain.recordatorio import requiere_recordatorio

AHORA = datetime(2026, 11, 10, 9, 0, tzinfo=timezone.utc)


@pytest.mark.parametrize("fecha_limite, esperado", [
    (datetime(2026, 11, 13, 9, 0, tzinfo=timezone.utc), False),  # faltan 72 hs: todavía no
    (datetime(2026, 11, 12, 9, 1, tzinfo=timezone.utc), False),  # 48 hs y 1 minuto: todavía no
    (datetime(2026, 11, 12, 9, 0, tzinfo=timezone.utc), True),   # justo 48 hs: sí
    (datetime(2026, 11, 11, 9, 0, tzinfo=timezone.utc), True),   # faltan 24 hs: sí (se repite)
    (datetime(2026, 11, 10, 8, 59, tzinfo=timezone.utc), False), # ya venció: no
    (None, False),                                               # sin fecha límite: no
])
def test_requiere_recordatorio(fecha_limite, esperado):
    assert requiere_recordatorio(fecha_limite, AHORA) is esperado