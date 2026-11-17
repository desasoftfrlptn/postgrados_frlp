from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

Carrera = Literal["Especialización", "Maestría", "Doctorado"]
CanalDifusion = Literal["redes", "colegas", "web", "egresados", "otro"]
TipoBeca = Literal["30%", "100%"]


class InscripcionCreate(BaseModel):
    cohorte_id: UUID | None = None
    carreras: list[Carrera] = Field(min_length=1, max_length=2)
    dni: str = Field(pattern=r"^[0-9]{7,8}$", max_length=8)
    nombre: str = Field(min_length=1, max_length=120)
    apellido: str = Field(min_length=1, max_length=120)
    nacionalidad: str = Field(min_length=1, max_length=100)
    email: EmailStr
    email_alternativo: EmailStr
    telefono_movil: str = Field(min_length=1, max_length=40)
    telefono_fijo: str | None = Field(default=None, max_length=40)
    domicilio: str = Field(min_length=1, max_length=200)
    ciudad: str = Field(min_length=1, max_length=100)
    provincia: str = Field(min_length=1, max_length=100)
    pais: str = Field(min_length=1, max_length=100)
    titulo_grado: str = Field(min_length=1, max_length=200)
    titulo_posgrado: str | None = Field(default=None, max_length=200)
    como_conocio: CanalDifusion
    motivacion: str = Field(min_length=50, max_length=5000)
    solicita_beca: bool = False
    tipo_beca: TipoBeca | None = None

    @field_validator(
        "dni",
        "nombre",
        "apellido",
        "nacionalidad",
        "telefono_movil",
        "telefono_fijo",
        "domicilio",
        "ciudad",
        "provincia",
        "pais",
        "titulo_grado",
        "titulo_posgrado",
        "motivacion",
        mode="before",
    )
    @classmethod
    def strip_text(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None if value == "" or value.isspace() else stripped
        return value

    @field_validator("carreras")
    @classmethod
    def carreras_sin_duplicados(cls, value: list[Carrera]) -> list[Carrera]:
        if len(set(value)) != len(value):
            raise ValueError("No se puede seleccionar una carrera más de una vez")
        return value

    @field_validator("email", "email_alternativo", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("cohorte_id", mode="before")
    @classmethod
    def empty_cohort_to_none(cls, value: object) -> object:
        return None if value == "" else value

    @field_validator("tipo_beca", mode="before")
    @classmethod
    def empty_beca_to_none(cls, value: object) -> object:
        return None if value == "" else value

    @model_validator(mode="after")
    def validate_beca(self) -> "InscripcionCreate":
        if self.solicita_beca and self.tipo_beca is None:
            raise ValueError("Debe seleccionar el porcentaje de beca solicitado")
        if not self.solicita_beca and self.tipo_beca is not None:
            raise ValueError("No puede indicar un tipo de beca si no la solicita")
        return self


class InscripcionResponse(BaseModel):
    codigo_seguimiento: str
    estado: str
    mensaje: str


class TransicionLegajoRequest(BaseModel):
    accion: Literal[
        "REVISAR",
        "OBSERVAR",
        "APROBAR",
        "RECHAZAR",
        "MATRICULAR",
        "DAR_DE_BAJA",
    ]
    comentario: str | None = Field(default=None, min_length=1, max_length=2000)

    @field_validator("comentario")
    @classmethod
    def limpiar_comentario(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @model_validator(mode="after")
    def validar_comentario_de_observacion(self) -> "TransicionLegajoRequest":
        if self.accion == "OBSERVAR" and not self.comentario:
            raise ValueError("Debe indicar el motivo de la observación")
        if self.accion != "OBSERVAR" and self.comentario is not None:
            raise ValueError("El comentario solo se admite al observar un legajo")
        return self


class CorreccionLegajoRequest(BaseModel):
    token: str = Field(min_length=43, max_length=128)


class LegajoEstadoResponse(BaseModel):
    id: str
    estado: str
    numero_legajo: str | None
    mensaje: str


class CohorteCreate(BaseModel):
    anio: int = Field(ge=2000, le=9999)
    nombre: str = Field(min_length=1, max_length=100)
    fecha_inicio: date | None = None
    fecha_proxima_apertura: date | None = None
    inscripcion_abierta: bool = False

    @field_validator("nombre")
    @classmethod
    def limpiar_nombre(cls, value: str) -> str:
        nombre = value.strip()
        if not nombre:
            raise ValueError("El nombre de la cohorte no puede estar vacío")
        return nombre

    @field_validator("fecha_proxima_apertura")
    @classmethod
    def validar_fecha_proxima(cls, value: date | None) -> date | None:
        if value is not None and value < date.today():
            raise ValueError("La próxima fecha de apertura no puede estar en el pasado")
        return value


class CohorteInscripcionUpdate(BaseModel):
    inscripcion_abierta: bool
    fecha_proxima_apertura: date | None = None

    @field_validator("fecha_proxima_apertura")
    @classmethod
    def validar_fecha_proxima(cls, value: date | None) -> date | None:
        if value is not None and value < date.today():
            raise ValueError("La próxima fecha de apertura no puede estar en el pasado")
        return value


class CohorteResponse(BaseModel):
    id: UUID
    anio: int
    nombre: str
    inscripcion_abierta: bool
    fecha_inicio: date | None
    fecha_proxima_apertura: date | None


class CohortePublicaResponse(BaseModel):
    id: UUID
    anio: int
    nombre: str


class ProximaAperturaResponse(BaseModel):
    fecha_proxima_apertura: date


class DocumentoResumenResponse(BaseModel):
    id: UUID
    tipo: str
    fecha_subida: datetime


class LegajoListadoResponse(BaseModel):
    id: UUID
    numero_legajo: str | None
    apellido: str
    nombre: str
    dni: str
    estado: str
    carreras: list[str]
    solicita_beca: bool
    tipo_beca: str | None
    documento_beca: dict[str, str] | None


class LegajoDetalleResponse(BaseModel):
    id: UUID
    numero_legajo: str | None
    cohorte_id: UUID
    estado: str
    carreras: list[str]
    dni: str
    apellido: str
    nombre: str
    nacionalidad: str
    email: EmailStr
    email_alternativo: EmailStr
    telefono_movil: str
    telefono_fijo: str | None
    domicilio: str
    ciudad: str
    provincia: str
    pais: str
    titulo_grado: str
    titulo_posgrado: str | None
    como_conocio: str
    motivacion: str
    solicita_beca: bool
    tipo_beca: str | None
    fecha_inscripcion: datetime
    documentos: list[DocumentoResumenResponse]
