"""Casos de uso: crear una clase y cargar asistencia (US-B-002).

Capa APPLICATION: aplica las reglas y coordina el repository.
No sabe de HTTP: avisa con excepciones y el router decide el código.
"""

import uuid
from datetime import date

from src.carga_academica.application.planilla_service import (
    SeminarioNoEncontrado,
    SinPermisoPlanilla,
)
from src.carga_academica.domain.asistencia import (
    calcular_porcentaje_asistencia,
    puede_ver_planilla,
)
from src.carga_academica.infrastructure.asistencia_repository import AsistenciaRepository
from src.shared.auth.orm_models import Usuario


class ClaseDuplicada(Exception):
    """Ya hay una clase de ese seminario en esa fecha. El router lo traduce a 409."""


class ClaseNoEncontrada(Exception):
    """La clase no existe o es de otro seminario. El router lo traduce a 404."""


class AlumnosNoInscriptos(Exception):
    """Algún legajo no está inscripto al seminario. El router lo traduce a 422."""

    def __init__(self, legajo_ids: set[uuid.UUID]):
        super().__init__("Hay alumnos que no están inscriptos al seminario")
        self.legajo_ids = legajo_ids


class AsistenciaService:
    def __init__(self, repo: AsistenciaRepository):
        self.repo = repo

    async def _verificar_seminario(self, seminario_id: uuid.UUID, usuario: Usuario) -> None:
        """Las dos reglas que se repiten en los dos casos de uso."""
        seminario = await self.repo.obtener_seminario(seminario_id)
        if seminario is None:
            raise SeminarioNoEncontrado()
        # Misma regla que la planilla (BR-007): el docente del seminario, o coordinador/admin
        if not puede_ver_planilla(usuario.rol, usuario.email, seminario.email_docente):
            raise SinPermisoPlanilla()

    async def crear_clase(self, seminario_id: uuid.UUID, fecha: date, usuario: Usuario):
        """Botón "Nueva clase": crea la columna con esa fecha."""
        await self._verificar_seminario(seminario_id, usuario)

        if await self.repo.existe_clase_en_fecha(seminario_id, fecha):
            raise ClaseDuplicada()

        return await self.repo.crear_clase(seminario_id, fecha)

    async def cargar_asistencias(
        self,
        seminario_id: uuid.UUID,
        clase_id: uuid.UUID,
        celdas: list[tuple[uuid.UUID, bool]],
        usuario: Usuario,
    ) -> list[dict]:
        """Autosave de los checkboxes: guarda y devuelve el % recalculado (BR-002)."""
        await self._verificar_seminario(seminario_id, usuario)

        # La clase tiene que existir Y ser de este seminario.
        # Si no, alguien podría cargar asistencia en la clase de otro seminario (IDOR).
        clase = await self.repo.obtener_clase(clase_id)
        if clase is None or clase.seminario_id != seminario_id:
            raise ClaseNoEncontrada()

        # Si el mismo alumno viene dos veces, gana el último valor.
        # (Postgres no deja actualizar la misma fila dos veces en un solo upsert.)
        celdas_unicas = dict(celdas)
        legajo_ids = list(celdas_unicas)

        # Todos tienen que estar inscriptos a este seminario.
        inscriptos = await self.repo.legajos_inscriptos(seminario_id, legajo_ids)
        faltantes = set(legajo_ids) - inscriptos
        if faltantes:
            raise AlumnosNoInscriptos(faltantes)

        await self.repo.guardar_asistencias(clase_id, list(celdas_unicas.items()))

        # % recalculado de los que cambiaron: (presentes / clases dictadas) × 100
        total_clases = await self.repo.contar_clases(seminario_id)
        presentes = await self.repo.contar_presentes(seminario_id, legajo_ids)
        return [
            {
                "legajo_id": legajo_id,
                "porcentaje": calcular_porcentaje_asistencia(
                    presentes.get(legajo_id, 0), total_clases
                ),
            }
            for legajo_id in legajo_ids
        ]