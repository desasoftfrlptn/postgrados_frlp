from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from src.inscripcion.presentation.schemas import Carrera


class CrearSeminario(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cohorte_id: UUID
    nombre: str = Field(min_length=1, max_length=200)
    docente_nombre: str = Field(min_length=1, max_length=200)
    docente_email: EmailStr
    fecha_fin_cuatrimestre: date
    carrera: Carrera | None = None
    es_obligatorio: bool = False
    fecha_limite_notas: datetime | None = None

    @field_validator("nombre", "docente_nombre", mode="before")
    @classmethod
    def limpiar_texto(cls, valor: object) -> object:
        return valor.strip() if isinstance(valor, str) else valor

    @field_validator("fecha_limite_notas")
    @classmethod
    def validar_zona_limite(cls, valor: datetime | None) -> datetime | None:
        if valor is not None and valor.utcoffset() is None:
            raise ValueError("La fecha debe incluir zona horaria")
        return valor

    @model_validator(mode="after")
    def validar_plan(self) -> "CrearSeminario":
        if self.es_obligatorio and self.carrera is None:
            raise ValueError("Un seminario obligatorio debe indicar la carrera")
        return self


class SeminarioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cohorte_id: UUID
    nombre: str
    docente_nombre: str
    docente_email: EmailStr
    fecha_fin_cuatrimestre: date
    carrera: Carrera | None
    es_obligatorio: bool
    fecha_limite_notas: datetime | None


class ActualizarPlanSeminario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    carrera: Carrera
    es_obligatorio: bool


class ActualizarFechaLimite(BaseModel):
    model_config = ConfigDict(extra="forbid")
    fecha_limite_notas: datetime | None

    @field_validator("fecha_limite_notas")
    @classmethod
    def validar_zona(cls, valor: datetime | None) -> datetime | None:
        if valor is not None and valor.utcoffset() is None:
            raise ValueError("La fecha debe incluir zona horaria")
        return valor


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
    asistencias: list["CeldaAsistencia"]
    porcentaje_asistencia: Decimal
    nota: Decimal | None
    condicion: str


class CrearClase(BaseModel):
    fecha: date = Field(default_factory=date.today)


class CambiarFechaClase(BaseModel):
    fecha: date


class ClaseRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    fecha: date


class RegistroAsistencia(BaseModel):
    clase_id: UUID
    legajo_id: UUID
    presente: bool = Field(strict=True)


class LoteAsistencias(BaseModel):
    asistencias: list[RegistroAsistencia] = Field(min_length=1, max_length=1000)


class RegistroNota(BaseModel):
    legajo_id: UUID
    nota: Decimal = Field(ge=1, le=10, decimal_places=1, allow_inf_nan=False)

    @field_validator("nota", mode="before")
    @classmethod
    def validar_numero(cls, valor: object) -> object:
        if isinstance(valor, (bool, str)):
            raise ValueError("La nota debe ser un número entre 1 y 10 con hasta un decimal")
        return valor


class LoteNotas(BaseModel):
    notas: list[RegistroNota] = Field(min_length=1, max_length=500)


class CeldaAsistencia(BaseModel):
    clase_id: UUID
    presente: bool


class PlanillaRespuesta(BaseModel):
    seminario: SeminarioRespuesta
    clases: list[ClaseRespuesta]
    estudiantes: list[EstudianteRespuesta]


class ResultadoSeminario(BaseModel):
    seminario_id: UUID
    nombre: str
    porcentaje_asistencia: Decimal
    nota: Decimal | None
    condicion: str