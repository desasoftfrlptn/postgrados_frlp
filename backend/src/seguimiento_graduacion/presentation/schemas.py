"""Datos de entrada y salida del alta de trabajo final (US-C-001)."""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
