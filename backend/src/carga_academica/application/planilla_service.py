"""Caso de uso: armar la planilla de asistencia de un seminario (US-B-003).

Capa APPLICATION: coordina las piezas.
- Le pide los datos al repository (infrastructure).
- Aplica las reglas puras (domain).
- No sabe nada de HTTP: los problemas los avisa con excepciones
  y el router decide qué código responder (404, 403).
"""

import uuid

from src.carga_academica.domain.asistencia import (
    calcular_porcentaje_asistencia,
    marca_asistencia,
    puede_ver_planilla,
)
from src.carga_academica.infrastructure.planilla_repository import PlanillaRepository
from src.shared.auth.orm_models import Usuario


class SeminarioNoEncontrado(Exception):
    """El seminario pedido no existe. El router lo traduce a 404."""


class SinPermisoPlanilla(Exception):
    """El usuario no puede ver este seminario (BR-007). El router lo traduce a 403."""


class PlanillaService:
    def __init__(self, repo: PlanillaRepository):
        # El repository llega desde afuera (inyección de dependencias).
        # En los tests le pasamos uno falso que no usa la base.
        self.repo = repo

    async def obtener_planilla(self, seminario_id: uuid.UUID, usuario: Usuario) -> dict:
        # 1. ¿Existe el seminario?
        seminario = await self.repo.obtener_seminario(seminario_id)
        if seminario is None:
            raise SeminarioNoEncontrado()

        # 2. ¿Este usuario lo puede ver? (regla pura del dominio)
        if not puede_ver_planilla(usuario.rol, usuario.email, seminario.email_docente):
            raise SinPermisoPlanilla()

        # 3. Traemos todo de una vez: 3 consultas, sin importar cuántos alumnos haya.
        alumnos = await self.repo.listar_alumnos(seminario_id)
        clases = await self.repo.listar_clases(seminario_id)
        asistencias = await self.repo.asistencias_del_seminario(seminario_id)

        # 4. Armamos una fila por alumno.
        filas = []
        for alumno in alumnos:
            # Una marca P/A por clase, en el mismo orden que las fechas.
            # .get devuelve None si no hay registro, y marca_asistencia lo pasa a "A".
            marcas = [
                marca_asistencia(asistencias.get((clase.id, alumno.id)))
                for clase in clases
            ]
            filas.append({
                "legajo_id": alumno.id,
                "apellido": alumno.apellido,
                "nombre": alumno.nombre,
                "email": alumno.email,
                "carrera_grado": alumno.titulo_grado,
                "asistencias": marcas,
                "porcentaje": calcular_porcentaje_asistencia(marcas.count("P"), len(clases)),
            })

        # 5. La planilla completa: el front la usa para mostrarla y para el Excel.
        return {
            "seminario": seminario.nombre,
            "fechas": [clase.fecha for clase in clases],
            "alumnos": filas,
        }