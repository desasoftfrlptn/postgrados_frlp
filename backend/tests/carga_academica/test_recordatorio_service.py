"""Tests del recordatorio de notas (US-B-005), sin base ni SMTP."""

import asyncio
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

from src.carga_academica.application.recordatorio_service import RecordatorioNotasService

AHORA = datetime(2026, 11, 10, 12, 0, tzinfo=timezone.utc)   # 09:00 en Argentina


def seminario(nombre, fecha_limite):
    return SimpleNamespace(
        id=uuid.uuid4(), nombre=nombre, docente="Juan Docente",
        email_docente="juan@utn.edu.ar", fecha_limite_notas=fecha_limite,
    )


class RepositorioFalso:
    def __init__(self, filas):
        self.filas = filas

    async def seminarios_con_notas_pendientes(self):
        return self.filas


def test_recuerda_solo_los_que_vencen_en_48_hs_o_menos():
    # Arrange: uno vence mañana, otro en una semana
    pronto = seminario("Metodología", datetime(2026, 11, 11, 12, 0, tzinfo=timezone.utc))
    lejos = seminario("Arquitectura", datetime(2026, 11, 17, 12, 0, tzinfo=timezone.utc))
    enviados = []

    async def enviar(destinatario, asunto, plantilla, datos):
        enviados.append(datos["nombre_seminario"])

    service = RecordatorioNotasService(RepositorioFalso([(pronto, 3), (lejos, 5)]), enviar, "http://front")
    # Act
    cantidad = asyncio.run(service.enviar_recordatorios(AHORA))
    # Assert
    assert cantidad == 1
    assert enviados == ["Metodología"]


def test_el_mail_lleva_cantidad_link_y_hora_argentina():
    # Arrange: vence el 11/11 a las 23:00 UTC = 20:00 en Argentina
    sem = seminario("Metodología", datetime(2026, 11, 11, 23, 0, tzinfo=timezone.utc))
    recibido = {}

    async def enviar(destinatario, asunto, plantilla, datos):
        recibido.update(destinatario=destinatario, plantilla=plantilla, **datos)

    service = RecordatorioNotasService(RepositorioFalso([(sem, 4)]), enviar, "http://front/")
    # Act
    asyncio.run(service.enviar_recordatorios(AHORA))
    # Assert
    assert recibido["destinatario"] == "juan@utn.edu.ar"
    assert recibido["plantilla"] == "recordatorio-notas.html"
    assert recibido["alumnos_sin_nota"] == 4
    assert recibido["fecha_limite"] == "11/11/2026 20:00"
    assert recibido["link_planilla"] == f"http://front/seminarios/{sem.id}/planilla"


def test_si_un_mail_falla_sigue_con_los_demas():
    # Arrange
    a = seminario("A", datetime(2026, 11, 11, 12, 0, tzinfo=timezone.utc))
    b = seminario("B", datetime(2026, 11, 11, 12, 0, tzinfo=timezone.utc))
    intentos = []

    async def enviar(destinatario, asunto, plantilla, datos):
        intentos.append(datos["nombre_seminario"])
        if datos["nombre_seminario"] == "A":
            raise ConnectionError("SMTP caído")

    service = RecordatorioNotasService(RepositorioFalso([(a, 1), (b, 1)]), enviar, "http://front")
    # Act
    cantidad = asyncio.run(service.enviar_recordatorios(AHORA))
    # Assert: intentó los dos y contó solo el que salió
    assert intentos == ["A", "B"]
    assert cantidad == 1
    