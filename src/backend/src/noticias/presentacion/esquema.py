# Define los datos de salida para las noticias.

from datetime import date
from uuid import UUID

from pydantic import BaseModel


class NoticiaEstadoModificar(BaseModel):
    activo: bool


class NoticiaRespuesta(BaseModel):
    id: UUID
    titulo: str
    categoria: str
    resumen: str
    contenido: str
    fecha: date
    imagen_url: str | None
    activo: bool

    class Config:
        from_attributes = True