from uuid import UUID
from pydantic import BaseModel, Field
from typing import Literal

class CrearEnlaceRequest(BaseModel):
    tipo: Literal["INSCRIPCION", "SEGUIMIENTO"]
    cohorte_id: UUID | None = None
    periodo_id: UUID | None = None
    legajo_id: UUID | None = None
    duracion_dias: int = Field(default=7, ge=1, le=90)
    usos_maximos: int | None = Field(default=None, ge=1, le=10000)

class TokenRequest(BaseModel): token: str = Field(min_length=20, max_length=200)
class EnlaceCreadoResponse(BaseModel): id: UUID; tipo: str; expira_at: object; url: str
