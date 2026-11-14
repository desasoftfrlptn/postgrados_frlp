from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class LegajoCrear(BaseModel):
    cohorte_id: UUID
    carrera_elegida: str
    apellido: str
    nombre: str
    nacionalidad: str
    dni_pasaporte: str
    correo_electronico: EmailStr
    telefono_movil: str
    correo_alternativo: EmailStr
    domicilio: str
    pais: str
    provincia: str
    ciudad: str
    titulo_anterior: str
    universidad_anterior: str


class LegajoRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    cohorte_id: Optional[UUID] = None
    carrera_elegida: str
    apellido: str
    nombre: str
    nacionalidad: str
    dni_pasaporte: str
    telefono_movil: Optional[str] = None
    correo_electronico: EmailStr
    correo_alternativo: Optional[EmailStr] = None
    domicilio: Optional[str] = None
    estado: str
    pais: str
    provincia: str
    ciudad: str
    titulo_anterior: str
    universidad_anterior: str


class DocumentoLegajoRespuesta(BaseModel):
    """
    Datos de un documento que puede consultar
    el Equipo de Conducción.

    No expone la ruta física del archivo.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tipo: str
    fecha: datetime


class CompletitudDocumentalRespuesta(BaseModel):
    """
    Resultado de la verificación documental
    de un aspirante.
    """

    porcentaje: int
    documentos_requeridos: int
    documentos_presentados: int
    documentos_faltantes: list[str]
    completo: bool


class DocumentacionLegajoRespuesta(BaseModel):
    """
    Información documental asociada a un legajo.

    La completitud puede ser None cuando todavía
    no se conocen las condiciones particulares
    del aspirante.
    """

    legajo_id: UUID
    documentos: list[DocumentoLegajoRespuesta]
    completitud: Optional[CompletitudDocumentalRespuesta] = None


class LoginRequest(BaseModel):
    correo_electronico: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: str
