"""Consultas a la base para armar la planilla de asistencia (US-B-003).

Este archivo es la capa de INFRASTRUCTURE: el único lugar del caso de uso
que habla con la base de datos. Ni el service ni el router escriben consultas;
se las piden a esta clase. Así, si mañana cambia la base, se toca solo acá.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Tablas de este módulo (carga académica)
from src.carga_academica.infrastructure.orm_models import (
    Asistencia,
    Clase,
    InscripcionSeminario,
    Seminario,
)

# Los alumnos son legajos, que viven en el módulo de inscripción
from src.inscripcion.infrastructure.orm_models import Legajo


class PlanillaRepository:
    """Agrupa todas las consultas que necesita la planilla de un seminario."""

    def __init__(self, db: AsyncSession):
        # La sesión no se crea acá: llega desde afuera (inyección de dependencias).
        # El router la obtiene con Depends(get_db) y se la pasa al repository.
        self.db = db

    async def obtener_seminario(self, seminario_id: uuid.UUID) -> Seminario | None:
        """Busca el seminario por su id.

        Lo necesitamos para el nombre del archivo Excel y para verificar
        que el docente que pide la planilla sea el del seminario (email_docente).
        """
        # db.get busca por clave primaria. Si no existe devuelve None,
        # y es el router el que decide responder 404 (el repository no sabe de HTTP).
        return await self.db.get(Seminario, seminario_id)

    async def listar_alumnos(self, seminario_id: uuid.UUID) -> list[Legajo]:
        """Los alumnos inscriptos al seminario, ordenados alfabéticamente.

        Cada uno es un Legajo: de ahí salen Apellido, Nombre, Email y
        Carrera de grado (titulo_grado), las primeras columnas del Excel.
        """
        consulta = (
            # Queremos objetos Legajo...
            select(Legajo)
            # ...unidos con la tabla intermedia que dice quién cursa qué seminario.
            # Es como el SQL: JOIN inscripciones_seminario ON legajo_id = legajos.id
            .join(InscripcionSeminario, InscripcionSeminario.legajo_id == Legajo.id)
            # ...pero solo los inscriptos a ESTE seminario.
            .where(InscripcionSeminario.seminario_id == seminario_id)
            # Orden alfabético, como una planilla en papel.
            .order_by(Legajo.apellido, Legajo.nombre)
        )
        # await: esperamos a la base sin bloquear al servidor (SQLAlchemy async).
        # scalars devuelve los objetos Legajo directamente (no tuplas).
        # list(...) los junta en una lista común de Python.
        return list(await self.db.scalars(consulta))

    async def listar_clases(self, seminario_id: uuid.UUID) -> list[Clase]:
        """Las clases del seminario, de la más vieja a la más nueva.

        Cada clase va a ser una columna del Excel, con su fecha como título.
        """
        consulta = (
            select(Clase)
            .where(Clase.seminario_id == seminario_id)
            # Ordenadas por fecha para que las columnas queden en orden cronológico.
            .order_by(Clase.fecha)
        )
        return list(await self.db.scalars(consulta))

    async def asistencias_del_seminario(
        self, seminario_id: uuid.UUID
    ) -> dict[tuple[uuid.UUID, uuid.UUID], bool]:
        """Todas las asistencias del seminario, en UNA sola consulta.

        Devuelve un diccionario con esta forma:
            {(clase_id, legajo_id): presente}

        Por ejemplo: {(clase_1, ana): True, (clase_1, juan): False, ...}

        Así, para llenar cada celda del Excel alcanza con:
            asistencias.get((clase.id, alumno.id))
        que devuelve True, False, o None si no hay registro de esa clase.

        ¿Por qué no consultar celda por celda? Con 20 alumnos y 15 clases
        serían 300 consultas a la base (problema N+1). Así es siempre 1.
        """
        consulta = (
            # Solo traemos las 3 columnas que necesitamos, no el objeto entero.
            select(Asistencia.clase_id, Asistencia.legajo_id, Asistencia.presente)
            # La tabla asistencias no tiene seminario_id: hay que pasar por clases
            # para saber a qué seminario pertenece cada asistencia.
            .join(Clase, Clase.id == Asistencia.clase_id)
            .where(Clase.seminario_id == seminario_id)
        )
        # execute devuelve filas (tuplas de 3 valores), no objetos.
        filas = await self.db.execute(consulta)

        # Armamos el diccionario recorriendo las filas:
        # la clave es la pareja (clase, alumno) y el valor si estuvo presente.
        return {
            (clase_id, legajo_id): presente
            for clase_id, legajo_id, presente in filas
        }