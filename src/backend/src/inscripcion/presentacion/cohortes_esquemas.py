from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CohorteCrear(BaseModel):
    anio: int = Field(ge=1)
    nombre: str = Field(min_length=1, max_length=50)
    carrera_id: UUID
    fecha_inicio: date | None = None


class CohorteInscripcionModificar(BaseModel):
    abierta: bool


class CohorteRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    anio: int
    nombre: str
    carrera_id: UUID | None = None
    abierta: bool
    fecha_inicio: date | None = None
    created_at: datetime | None = None


class CohorteDisponible(BaseModel):
    id: UUID
    nombre: str
    anio: int
    carrera_id: UUID
    carrera_nombre: str
