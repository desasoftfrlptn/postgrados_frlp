# Define los datos de entrada y salida para la gestión de carreras.

from uuid import UUID

from pydantic import BaseModel


class CarreraCrear(BaseModel):
    nombre: str
    tipo: str
    duracion: str
    descripcion: str


class CarreraModificar(BaseModel):
    nombre: str
    tipo: str
    duracion: str
    descripcion: str


class CarreraEstadoModificar(BaseModel):
    activo: bool


class CarreraRespuesta(BaseModel):
    id: UUID
    nombre: str
    tipo: str
    duracion: str
    descripcion: str
    activo: bool

    class Config:
        from_attributes = True