"""Forma de lo que entra y sale de la API de carga académica.

FastAPI usa estos modelos para validar los pedidos y las respuestas,
y para mostrar los ejemplos en Swagger (/docs).
"""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------- Planilla (US-B-003) ----------

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


# ---------- Clases (US-B-002) ----------

class ClaseCreate(BaseModel):
    """Lo que manda el front al apretar "Nueva clase"."""

    fecha: date              # por defecto el front manda la de hoy; el docente la puede cambiar


class ClaseResponse(BaseModel):
    """La clase creada: el front usa el id para la columna nueva."""

    model_config = ConfigDict(from_attributes=True)  # permite armarla desde el objeto ORM Clase

    id: UUID
    fecha: date


# ---------- Asistencias (US-B-002) ----------

class AsistenciaItem(BaseModel):
    """Una celda de la planilla: un alumno en una clase."""

    legajo_id: UUID
    presente: bool           # checkbox marcado = True (Presente), sin marcar = False (Ausente)


class AsistenciasRequest(BaseModel):
    """Lo que manda el autosave: una clase y una o más celdas."""

    clase_id: UUID
    asistencias: list[AsistenciaItem] = Field(min_length=1)  # lista vacía -> 422


class PorcentajeAlumno(BaseModel):
    legajo_id: UUID
    porcentaje: float


class AsistenciasResponse(BaseModel):
    """El % recalculado de los alumnos que cambiaron (BR-002)."""

    porcentajes: list[PorcentajeAlumno]