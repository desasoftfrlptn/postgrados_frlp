from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class CrearSeminario(BaseModel):
    cohorte_id: UUID
    nombre: str = Field(min_length=1, max_length=200)
    docente_nombre: str = Field(min_length=1, max_length=200)
    docente_email: EmailStr
    fecha_limite_notas: datetime | None = None

    @field_validator("nombre", "docente_nombre")
    @classmethod
    def validar_texto(cls, valor: str) -> str:
        valor = valor.strip()
        if not valor:
            raise ValueError("El campo no puede estar vacío")
        return valor

    @field_validator("fecha_limite_notas")
    @classmethod
    def validar_zona_horaria(cls, valor: datetime | None) -> datetime | None:
        if valor is not None and valor.utcoffset() is None:
            raise ValueError("La fecha debe incluir zona horaria")
        return valor


class SeminarioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    cohorte_id: UUID
    nombre: str
    docente_nombre: str
    docente_email: EmailStr
    fecha_limite_notas: datetime | None


class InscribirEstudiantes(BaseModel):
    legajo_ids: list[UUID] = Field(min_length=1, max_length=500)


class CrearEnlace(BaseModel):
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


class EstudianteRespuesta(BaseModel):
    legajo_id: UUID
    numero_legajo: str | None
    apellido: str
    nombre: str
    email: str
    titulo_grado: str
    asistencias: list[CeldaAsistencia]
    porcentaje_asistencia: Decimal
    nota: Decimal | None
    condicion: str


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
