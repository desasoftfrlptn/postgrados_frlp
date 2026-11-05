from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import Optional
from uuid import UUID

class CohorteCreate(BaseModel):
    anio: int
    nombre: str
    fecha_inicio: Optional[date] = None

class CohorteInscripcionUpdate(BaseModel):
    abierta: bool

class CohorteResponse(BaseModel):
    id: UUID
    anio: int
    nombre: str
    abierta: bool
    fecha_inicio: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)