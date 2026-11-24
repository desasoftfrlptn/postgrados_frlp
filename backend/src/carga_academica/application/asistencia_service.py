"""Casos de uso: clases y carga de asistencia (US-B-002).

Capa APPLICATION: aplica las reglas y coordina el repository.
No sabe de HTTP: avisa con excepciones y el router decide el código.

Devuelve las clases con la forma que usa el front (tipo `Clase`):
{id, seminario_id, fecha, asistencias: [{legajo_id, presente}, ...]}.
El % de asistencia lo calcula el front con esos datos.
"""

import uuid
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from src.carga_academica.application.planilla_service import (
    SeminarioNoEncontrado,
    SinPermisoPlanilla,
)
from src.carga_academica.domain.asistencia import puede_ver_planilla
from src.carga_academica.infrastructure.asistencia_repository import AsistenciaRepository
from src.shared.auth.orm_models import Usuario


class CodigoSeminarioDuplicado(Exception):
    pass


class DocenteNoDisponible(Exception):
    pass


class ClaseDuplicada(Exception):
    """Ya hay una clase de ese seminario en esa fecha. El router lo traduce a 409."""


class ClaseNoEncontrada(Exception):
    """La clase no existe o es de otro seminario. El router lo traduce a 404."""


class AlumnoNoInscripto(Exception):
    """El legajo no está inscripto al seminario. El router lo traduce a 422."""


class ClaseNoDictada(Exception):
    pass


class ClaseFutura(Exception):
    pass


def armar_clase(clase, inscriptos: list[uuid.UUID], marcas: dict) -> dict:
    """Junta una clase con la asistencia de cada inscripto.

    Si una celda nunca se tocó (no está en `marcas`), va como ausente.
    """
    return {
        "id": clase.id,
        "seminario_id": clase.seminario_id,
        "fecha": clase.fecha,
        "dictada": clase.dictada,
        "asistencias": [
            {"legajo_id": legajo_id, "presente": marcas.get((clase.id, legajo_id), False)}
            for legajo_id in inscriptos
        ],
    }


class AsistenciaService:
    def __init__(self, repo: AsistenciaRepository):
        self.repo = repo

    async def crear_seminario(
        self, *, nombre: str, codigo: str, horas_catedra: int, es_obligatorio: bool,
        email_docente: str, fecha_limite_notas: date | None
    ):
        docente = await self.repo.buscar_docente_activo(email_docente)
        if docente is None:
            raise DocenteNoDisponible()
        # El nombre de usuario puede ser más largo que el campo docente del seminario.
        if len(docente.nombre) > 150:
            raise DocenteNoDisponible()
        vencimiento = (
            datetime.combine(fecha_limite_notas, time(23, 59), ZoneInfo("America/Argentina/Buenos_Aires"))
            if fecha_limite_notas else None
        )
        seminario = await self.repo.crear_seminario(
            nombre=nombre, codigo=codigo, horas_catedra=horas_catedra,
            es_obligatorio=es_obligatorio, docente=docente, fecha_limite_notas=vencimiento,
        )
        if seminario is None:
            raise CodigoSeminarioDuplicado()
        return seminario

    async def listar_seminarios(self, usuario: Usuario, nombre: str, page: int, limit: int) -> dict:
        email_docente = usuario.email if usuario.rol == "docente" else None
        seminarios = await self.repo.listar_seminarios(nombre.strip(), email_docente, page, limit)
        return {"data": seminarios[:limit], "has_more": len(seminarios) > limit}

    async def _verificar_seminario(self, seminario_id: uuid.UUID, usuario: Usuario) -> None:
        """Las dos reglas que se repiten en todos los casos de uso."""
        seminario = await self.repo.obtener_seminario(seminario_id)
        if seminario is None:
            raise SeminarioNoEncontrado()
        # Misma regla que la planilla (BR-007): el docente del seminario, o coordinador/admin
        if not puede_ver_planilla(usuario.rol, usuario.email, seminario.email_docente):
            raise SinPermisoPlanilla()

    async def listar_clases(self, seminario_id: uuid.UUID, usuario: Usuario) -> list[dict]:
        """Todas las clases del seminario con su asistencia (arma la tabla del front)."""
        await self._verificar_seminario(seminario_id, usuario)

        clases = await self.repo.listar_clases(seminario_id)
        inscriptos = await self.repo.inscriptos_del_seminario(seminario_id)
        marcas = await self.repo.asistencias_del_seminario(seminario_id)
        return [armar_clase(clase, inscriptos, marcas) for clase in clases]

    async def crear_clase(
        self, seminario_id: uuid.UUID, fecha: date, usuario: Usuario
    ) -> dict:
        """Botón "Nueva clase": crea la columna con esa fecha, con todos ausentes."""
        if usuario.rol not in ("coordinador", "admin"):
            raise SinPermisoPlanilla()
        await self._verificar_seminario(seminario_id, usuario)

        if await self.repo.existe_clase_en_fecha(seminario_id, fecha):
            raise ClaseDuplicada()

        clase = await self.repo.crear_clase(seminario_id, fecha)
        inscriptos = await self.repo.inscriptos_del_seminario(seminario_id)
        # Clase recién creada: no tiene ninguna marca todavía
        return armar_clase(clase, inscriptos, {})

    async def confirmar_clase(
        self, seminario_id: uuid.UUID, clase_id: uuid.UUID, dictada: bool, usuario: Usuario
    ) -> dict:
        await self._verificar_seminario(seminario_id, usuario)
        clase = await self.repo.obtener_clase(clase_id)
        if clase is None or clase.seminario_id != seminario_id:
            raise ClaseNoEncontrada()
        hoy = datetime.now(ZoneInfo("America/Argentina/Buenos_Aires")).date()
        if clase.fecha > hoy:
            raise ClaseFutura()
        await self.repo.guardar_estado_clase(clase, dictada)
        inscriptos = await self.repo.inscriptos_del_seminario(seminario_id)
        marcas = await self.repo.asistencias_del_seminario(seminario_id)
        return armar_clase(clase, inscriptos, marcas)

    async def cargar_asistencia(
        self,
        seminario_id: uuid.UUID,
        clase_id: uuid.UUID,
        legajo_id: uuid.UUID,
        presente: bool,
        usuario: Usuario,
    ) -> dict:
        """Autosave de un checkbox: guarda la celda y devuelve la clase actualizada."""
        await self._verificar_seminario(seminario_id, usuario)

        # La clase tiene que existir Y ser de este seminario.
        # Si no, alguien podría cargar asistencia en la clase de otro seminario (IDOR).
        clase = await self.repo.obtener_clase(clase_id)
        if clase is None or clase.seminario_id != seminario_id:
            raise ClaseNoEncontrada()

        if clase.dictada is not True:
            raise ClaseNoDictada()

        # El alumno tiene que estar inscripto a este seminario.
        if not await self.repo.legajos_inscriptos(seminario_id, [legajo_id]):
            raise AlumnoNoInscripto()

        await self.repo.guardar_asistencias(clase_id, [(legajo_id, presente)])

        inscriptos = await self.repo.inscriptos_del_seminario(seminario_id)
        marcas = await self.repo.asistencias_del_seminario(seminario_id)
        return armar_clase(clase, inscriptos, marcas)
