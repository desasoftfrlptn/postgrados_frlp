from datetime import date
from uuid import UUID

from pydantic import BaseModel


class EventoCrear(BaseModel):
    titulo: str
    descripcion: str
    fecha: date
    tipo: str


class EventoModificar(EventoCrear):
    pass


class EventoEstadoModificar(BaseModel):
    activo: bool


class EventoRespuesta(EventoCrear):
    id: UUID
    activo: bool

    class Config:
        from_attributes = True
