"""Tests del vencimiento automático de reservas (US-CORE-010), sin base ni SMTP."""

import asyncio
import uuid
from datetime import datetime, timezone
from types import SimpleNamespace

from src.inscripcion.application.vencimiento_service import VencimientoService

AHORA = datetime(2026, 11, 10, 3, 0, tzinfo=timezone.utc)
HACE_40_DIAS = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)
HACE_10_DIAS = datetime(2026, 10, 31, 12, 0, tzinfo=timezone.utc)


def legajo(nombre):
    return SimpleNamespace(
        id=uuid.uuid4(), nombre=nombre, apellido="Pérez", estado="COMPLETADO",
        carrera_elegida="Maestría", numero_legajo=f"26-001-{nombre[:3]}",
    )


class RepositorioFalso:
    def __init__(self, candidatos, coordinadores=(("Coordinadora", "coord@utn.edu.ar"),)):
        self.candidatos = candidatos
        self._coordinadores = list(coordinadores)
        self.vencidos = []
        self.consulto_coordinadores = False

    async def legajos_completados(self):
        return self.candidatos

    async def vencer(self, legajo):
        legajo.estado = "VENCIDO"
        self.vencidos.append(legajo.nombre)

    async def coordinadores(self):
        self.consulto_coordinadores = True
        return self._coordinadores


def test_vence_solo_los_de_30_dias_o_mas():
    # Arrange: Ana lleva 40 días en COMPLETADO, Luis solo 10
    ana, luis = legajo("Ana"), legajo("Luis")
    repo = RepositorioFalso([(ana, HACE_40_DIAS), (luis, HACE_10_DIAS)])
    enviados = []

    async def enviar(*args):
        enviados.append(args)

    # Act
    cantidad = asyncio.run(VencimientoService(repo, enviar).vencer_reservas(AHORA))
    # Assert
    assert cantidad == 1
    assert repo.vencidos == ["Ana"]
    assert luis.estado == "COMPLETADO"


def test_avisa_a_cada_coordinador_con_la_plantilla_de_vencido():
    # Arrange: dos coordinadores
    repo = RepositorioFalso(
        [(legajo("Ana"), HACE_40_DIAS)],
        coordinadores=[("Coord 1", "c1@utn.edu.ar"), ("Coord 2", "c2@utn.edu.ar")],
    )
    enviados = []

    async def enviar(destinatario, asunto, plantilla, datos):
        enviados.append((destinatario, plantilla, datos["nombre_coordinador"], datos["fecha_vencimiento"]))

    # Act
    asyncio.run(VencimientoService(repo, enviar).vencer_reservas(AHORA))
    # Assert: un mail por coordinador, personalizado; vence 30 días después del 01/10
    assert enviados == [
        ("c1@utn.edu.ar", "vencido.html", "Coord 1", "31/10/2026"),
        ("c2@utn.edu.ar", "vencido.html", "Coord 2", "31/10/2026"),
    ]


def test_si_no_hay_nada_para_vencer_no_hace_nada():
    repo = RepositorioFalso([(legajo("Luis"), HACE_10_DIAS)])

    async def enviar(*args):
        raise AssertionError("No debería mandar mails")

    cantidad = asyncio.run(VencimientoService(repo, enviar).vencer_reservas(AHORA))

    assert cantidad == 0
    assert repo.consulto_coordinadores is False


def test_si_un_mail_falla_igual_vence_los_demas():
    # Arrange: el servidor de correo está caído
    repo = RepositorioFalso([(legajo("Ana"), HACE_40_DIAS), (legajo("Eva"), HACE_40_DIAS)])

    async def enviar_que_falla(*args):
        raise ConnectionError("SMTP caído")

    # Act
    cantidad = asyncio.run(VencimientoService(repo, enviar_que_falla).vencer_reservas(AHORA))
    # Assert: los dos quedaron vencidos aunque ningún mail salió
    assert cantidad == 2
    assert repo.vencidos == ["Ana", "Eva"]