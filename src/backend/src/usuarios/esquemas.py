# Define los datos de entrada y salida del módulo de autenticación.

from uuid import UUID

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
)


class LoginPeticion(BaseModel):
    correo_electronico: EmailStr
    contrasena: str


class LoginRespuesta(BaseModel):
    id: UUID
    nombre: str
    apellido: str
    dni: str
    correo_electronico: str
    tipo_usuario: str
    token: str
    debe_cambiar_contrasena: bool


class UsuarioCrear(BaseModel):
    nombre: str
    apellido: str
    dni: str
    correo_electronico: EmailStr
    contrasena: str = Field(
        min_length=6
    )
    tipo_usuario: str


class UsuarioModificar(BaseModel):
    nombre: str
    apellido: str
    dni: str
    correo_electronico: EmailStr
    tipo_usuario: str


class UsuarioEstadoModificar(BaseModel):
    activo: bool


class UsuarioRespuesta(BaseModel):
    id: UUID
    nombre: str
    apellido: str
    dni: str
    correo_electronico: str
    tipo_usuario: str
    activo: bool
    debe_cambiar_contrasena: bool


class CambiarContrasenaPeticion(BaseModel):
    contrasena_actual: str
    contrasena_nueva: str = Field(
        min_length=6
    )
    repetir_contrasena: str = Field(
        min_length=6
    )


class CambiarContrasenaInicialPeticion(
    BaseModel
):
    contrasena_nueva: str = Field(
        min_length=6
    )
    repetir_contrasena: str = Field(
        min_length=6
    )