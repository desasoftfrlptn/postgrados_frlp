import re

from datetime import datetime
from uuid import UUID
from typing import Optional, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    field_validator,
    model_validator,
)


class LegajoCrear(BaseModel):
    cohorte_id: UUID
    carrera_elegida: str
    apellido: str
    nombre: str
    nacionalidad: str
    dni_pasaporte: str
    correo_electronico: EmailStr
    telefono_movil: str
    correo_alternativo: Optional[EmailStr] = None
    domicilio: str
    pais: str
    provincia: str
    ciudad: str
    titulo_anterior: str
    universidad_anterior: str
    forma_conocio_ofertas: str
    motivos_cursar: str
    solicitud_beca: Optional[Literal[30, 100]] = None

    @model_validator(mode="before")
    @classmethod
    def validar_campos_obligatorios(cls, valores):
        if not isinstance(valores, dict):
            return valores

        valores = valores.copy()

        for campo, valor in valores.items():
            if isinstance(valor, str):
                valor = valor.strip()

                if campo == "correo_alternativo" and not valor:
                    valores[campo] = None
                    continue

                if not valor and campo != "solicitud_beca":
                    raise ValueError(
                        f"El campo {campo} es obligatorio"
                    )

                valores[campo] = valor

        return valores

    @field_validator("dni_pasaporte")
    @classmethod
    def validar_dni_pasaporte(cls, valor):
        valor = re.sub(r"[.\s]", "", valor)
        if not re.fullmatch(r"\d{7,8}", valor):
            raise ValueError(
                "El DNI o pasaporte debe contener 7 u 8 dígitos"
            )
        return valor


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
    numero_seguimiento: str
    forma_conocio_ofertas: str
    motivos_cursar: str
    solicitud_beca: Optional[int] = None


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

class LegajoActualizarPerfil(BaseModel):
    telefono_movil: Optional[str] = None
    correo_alternativo: Optional[str] = None
    domicilio: Optional[str] = None
    ciudad: Optional[str] = None
    provincia: Optional[str] = None
    pais: Optional[str] = None
    nacionalidad: Optional[str] = None

class EstadoInscripcionRespuesta(BaseModel):
    numero_seguimiento: str
    estado: str
    observaciones: Optional[str] = None
    documentacion_a_corregir: list[str] = []