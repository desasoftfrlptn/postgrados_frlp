from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class SolicitudInicioSesion(BaseModel):
    email: EmailStr
    contrasena: str = Field(
        alias="password",
        min_length=1,
        max_length=72,
    )

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("email", mode="before")
    @classmethod
    def normalizar_email(cls, valor: object) -> object:
        return valor.strip().lower() if isinstance(valor, str) else valor


class UsuarioRespuesta(BaseModel):
    id: UUID
    email: EmailStr
    rol: str = Field(serialization_alias="role")


class RespuestaInicioSesion(BaseModel):
    token_acceso: str = Field(serialization_alias="access_token")
    token_renovacion: str = Field(serialization_alias="refresh_token")
    tipo_token: Literal["bearer"] = Field(
        default="bearer",
        serialization_alias="token_type",
    )
    expira_en: int = Field(serialization_alias="expires_in")
    usuario: UsuarioRespuesta = Field(serialization_alias="user")


class SolicitudRenovacion(BaseModel):
    token_renovacion: str = Field(alias="refresh_token", min_length=1)

    model_config = ConfigDict(populate_by_name=True)
