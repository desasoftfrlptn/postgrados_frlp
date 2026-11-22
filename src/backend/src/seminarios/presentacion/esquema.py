# Define los datos de entrada y salida para la gestión de seminarios.
from typing import Optional
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

class InscripcionSeminarioCrear(BaseModel):
    legajo_id: Optional[UUID] = None
    dni_pasaporte: Optional[str] = None

class CalificacionActualizar(BaseModel):
    nota_final: float

class AlumnoSeminarioRespuesta(BaseModel):
    inscripcion_id: UUID
    legajo_id: UUID
    dni_pasaporte: str
    apellido: str
    nombre: str
    correo_electronico: str
    carrera_elegida: str
    asistencias: int
    total_clases: int
    porcentaje_asistencia: float | None
    nota_final: Optional[float] = None
    estado: str

class AsistenciaClaseRegistrar(BaseModel):
    fecha: date
    presentes_legajo_ids: list[UUID] = []

class CursadaEstudianteRespuesta(BaseModel):
    inscripcion_id: UUID
    seminario_id: UUID
    seminario_nombre: str
    carrera_nombre: str
    fecha_inicio: date
    fecha_fin: date
    asistencias: int
    total_clases: int
    porcentaje_asistencia: float | None
    nota_final: Optional[float] = None
    estado: str

class AsistenciaFechaRespuesta(BaseModel):
    id: UUID
    seminario_id: UUID
    seminario_nombre: str
    legajo_id: UUID
    dni_pasaporte: str
    alumno: str
    carrera_elegida: str
    fecha: date
    presente: bool
    porcentaje_asistencia: float | None

class ColegaDocenteRespuesta(BaseModel):
    id: UUID
    nombre: str
    apellido: str
    correo_electronico: str
    seminarios: list[str]
