# Define los datos de entrada y salida para la gestión de seminarios.

from datetime import date
from uuid import UUID

from pydantic import BaseModel


class SeminarioCrear(BaseModel):
    nombre: str
    carrera_id: UUID
    docente_id: UUID
    fecha_inicio: date
    fecha_fin: date


class SeminarioModificar(BaseModel):
    nombre: str
    carrera_id: UUID
    docente_id: UUID
    fecha_inicio: date
    fecha_fin: date


class SeminarioEstadoModificar(BaseModel):
    activo: bool


class SeminarioRespuesta(BaseModel):
    id: UUID
    nombre: str

    carrera_id: UUID
    carrera_nombre: str

    docente_id: UUID
    docente_nombre: str

    fecha_inicio: date
    fecha_fin: date

    activo: bool