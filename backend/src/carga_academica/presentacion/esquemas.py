from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class CrearSeminario(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cohorte_id: UUID
    nombre: str = Field(min_length=1, max_length=200)
    docente_nombre: str = Field(min_length=1, max_length=200)
    docente_email: EmailStr
    fecha_fin_cuatrimestre: date

    @field_validator("nombre", "docente_nombre", mode="before")
    @classmethod
    def limpiar_texto(cls, valor: object) -> object:
        return valor.strip() if isinstance(valor, str) else valor


class SeminarioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cohorte_id: UUID
    nombre: str
    docente_nombre: str
    docente_email: EmailStr
    fecha_fin_cuatrimestre: date


class InscribirEstudiantes(BaseModel):
    model_config = ConfigDict(extra="forbid")
    legajo_ids: list[UUID] = Field(min_length=1, max_length=500)


class CrearEnlace(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expira_en: datetime | None = None

    @field_validator("expira_en")
    @classmethod
    def validar_zona_horaria(cls, valor: datetime | None) -> datetime | None:
        if valor is not None and valor.utcoffset() is None:
            raise ValueError("La fecha debe incluir zona horaria")
        return valor


class EnlaceRespuesta(BaseModel):
    token: str
    expira_en: datetime
    enlace: str


class EstudianteRespuesta(BaseModel):
    legajo_id: UUID
    numero_legajo: str | None
    apellido: str
    nombre: str
    email: EmailStr
    titulo_grado: str


class PlanillaRespuesta(BaseModel):
    seminario: SeminarioRespuesta
    estudiantes: list[EstudianteRespuesta]