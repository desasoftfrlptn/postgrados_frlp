"""Datos de entrada y salida del alta de trabajo final (US-C-001)."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SemaforoResponse(BaseModel):
    """Valor almacenado del semáforo; no expresa un recálculo en tiempo real."""

    semaforo: Literal["VERDE", "AMARILLO", "ROJO"]
    semaforo_manual: bool


class EstudianteEnRiesgoResponse(BaseModel):
    """Datos disponibles del legajo, sin métricas de avance inferidas."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    numero_legajo: str | None
    nombre: str
    apellido: str
    carrera_elegida: str
    tipo_carrera: Literal["Especializacion", "Maestria", "Doctorado"] | None
    cohorte_id: UUID
    fecha_inscripcion: datetime | None
    semaforo: Literal["ROJO"]


class EstudiantesEnRiesgoPagina(BaseModel):
    """Paginación compatible con los listados existentes del backend."""

    data: list[EstudianteEnRiesgoResponse]
    page: int
    limit: int
    total: int
    pages: int


class CrearTrabajoFinalRequest(BaseModel):
    """El legajo se indica en la URL y el autor se obtiene de la sesión."""

    model_config = ConfigDict(str_strip_whitespace=True)

    tipo: Literal["TFI", "Maestria", "Doctorado"]
    titulo: str = Field(min_length=1, max_length=300)
    director: str = Field(min_length=1, max_length=150)
    codirector: str | None = Field(default=None, min_length=1, max_length=150)
    fecha_cpr: date
    numero_resolucion: str = Field(min_length=1, max_length=50)


class TrabajoFinalResponse(CrearTrabajoFinalRequest):
    """Incluye los datos generados por el servidor y admite objetos ORM."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    legajo_id: UUID
    creado_por: str
    created_at: datetime


class ActualizarTrabajoFinalRequest(BaseModel):
    """Omitir conserva el valor; solo codirector admite null explícito."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    tipo: Literal["TFI", "Maestria", "Doctorado"] | None = None
    titulo: str | None = Field(default=None, min_length=1, max_length=300)
    director: str | None = Field(default=None, min_length=1, max_length=150)
    codirector: str | None = Field(default=None, min_length=1, max_length=150)
    fecha_cpr: date | None = None
    numero_resolucion: str | None = Field(default=None, min_length=1, max_length=50)

    @field_validator("tipo", "titulo", "director", "fecha_cpr", "numero_resolucion")
    @classmethod
    def rechazar_null(cls, valor):
        """Se ejecuta para valores enviados, sin validar los omitidos por defecto."""
        if valor is None:
            raise ValueError("El campo no admite null")
        return valor
