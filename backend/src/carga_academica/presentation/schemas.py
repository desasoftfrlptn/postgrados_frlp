"""Forma de las respuestas de la API de carga académica.

FastAPI usa estos modelos para validar lo que devolvemos
y para mostrar el ejemplo de respuesta en Swagger (/docs).
"""

from datetime import date
from uuid import UUID

from pydantic import BaseModel


class AlumnoPlanilla(BaseModel):
    """Una fila de la planilla: un alumno con su asistencia."""

    legajo_id: UUID
    apellido: str
    nombre: str
    email: str
    carrera_grado: str
    asistencias: list[str]   # "P" o "A", una por fecha, en el mismo orden que `fechas`
    porcentaje: float        # % de asistencia, va en la última columna del Excel


class PlanillaResponse(BaseModel):
    """La planilla completa de un seminario."""

    seminario: str
    fechas: list[date]       # fechas de las clases: son los títulos de las columnas
    alumnos: list[AlumnoPlanilla]