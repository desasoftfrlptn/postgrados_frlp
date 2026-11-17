from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints, field_validator, model_validator
from pydantic.json_schema import SkipJsonSchema

TipoTrabajo = Literal["TFI", "Maestría", "Doctorado"]
Titulo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
Nombre = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Resolucion = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class DatosTrabajoFinal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tipo: TipoTrabajo
    titulo: Titulo
    director_nombre: Nombre
    director_email: EmailStr
    codirector: Nombre | None = None
    fecha_aprobacion_cpr: date
    numero_resolucion: Resolucion

    @field_validator("director_email", mode="before")
    @classmethod
    def limpiar_email(cls, valor: object) -> object:
        return valor.strip() if isinstance(valor, str) else valor


class ActualizarTrabajoFinal(BaseModel):
    @staticmethod
    def _ajustar_esquema(esquema: dict[str, object]) -> None:
        esquema["minProperties"] = 1
        propiedades = esquema.get("properties")
        if isinstance(propiedades, dict):
            for campo, definicion in propiedades.items():
                if campo != "codirector" and isinstance(definicion, dict):
                    definicion.pop("default", None)

    model_config = ConfigDict(extra="forbid", json_schema_extra=_ajustar_esquema)

    tipo: TipoTrabajo | SkipJsonSchema[None] = None
    titulo: Titulo | SkipJsonSchema[None] = None
    director_nombre: Nombre | SkipJsonSchema[None] = None
    director_email: EmailStr | SkipJsonSchema[None] = None
    codirector: Nombre | None = None
    fecha_aprobacion_cpr: date | SkipJsonSchema[None] = None
    numero_resolucion: Resolucion | SkipJsonSchema[None] = None

    @field_validator(
        "tipo", "titulo", "director_nombre", "director_email",
        "fecha_aprobacion_cpr", "numero_resolucion", mode="before",
    )
    @classmethod
    def validar_campo_obligatorio(cls, valor: object) -> object:
        if valor is None:
            raise ValueError("El campo no puede ser nulo")
        return valor.strip() if isinstance(valor, str) else valor

    @model_validator(mode="after")
    def validar_cambios(self) -> "ActualizarTrabajoFinal":
        if not self.model_fields_set:
            raise ValueError("Debe indicar al menos un campo para modificar")
        return self


class TrabajoFinalRespuesta(DatosTrabajoFinal):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    legajo_id: UUID


class ErrorRespuesta(BaseModel):
    statusCode: int
    error: str
    message: str
    field: str | None
    timestamp: str
