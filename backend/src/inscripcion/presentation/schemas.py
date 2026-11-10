from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

TipoCarrera = Literal["Especializacion", "Maestria", "Doctorado"]
TipoBeca = Literal["30", "100"]
EstadoLegajo = Literal[
    "BORRADOR", "PENDIENTE", "EN_REVISION", "OBSERVADO", "COMPLETADO",
    "ACTIVO", "VENCIDO", "RECHAZADO", "BAJA", "GRADUADO",
]


class CrearLegajoRequest(BaseModel):
    cohorte_id: UUID
    dni: str = Field(min_length=7, max_length=20)
    apellido: str = Field(min_length=1, max_length=100)
    nombre: str = Field(min_length=1, max_length=100)
    email: EmailStr
    email_alternativo: EmailStr | None = None
    telefono_movil: str = Field(min_length=1, max_length=30)
    domicilio_direccion: str = Field(min_length=1, max_length=200)
    domicilio_ciudad: str = Field(min_length=1, max_length=100)
    domicilio_provincia: str = Field(min_length=1, max_length=100)
    domicilio_pais: str = Field(min_length=1, max_length=60)
    titulo_grado: str = Field(min_length=1, max_length=200)
    titulo_posgrado: str | None = Field(default=None, max_length=200)
    tipo_carrera: TipoCarrera
    carrera_elegida: str = Field(min_length=1, max_length=100)
    motivacion: str = Field(min_length=50, max_length=500)
    solicita_beca: bool = False
    tipo_beca: TipoBeca | None = None

    @field_validator("dni")
    @classmethod
    def validar_dni(cls, value: str) -> str:
        value = value.strip()
        if not value.isdigit() or not 7 <= len(value) <= 8:
            raise ValueError("El DNI debe contener 7 u 8 dígitos")
        return value

    @model_validator(mode="after")
    def validar_beca(self):
        if self.solicita_beca and self.tipo_beca is None:
            raise ValueError("Debe indicar el tipo de beca solicitado")
        if not self.solicita_beca and self.tipo_beca is not None:
            raise ValueError("No debe indicar tipo de beca si no solicita beca")
        return self


class LegajoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    numero_legajo: str | None
    cohorte_id: UUID
    dni: str
    apellido: str
    nombre: str
    email: EmailStr
    email_alternativo: EmailStr | None
    telefono_movil: str
    domicilio_direccion: str
    domicilio_ciudad: str
    domicilio_provincia: str
    domicilio_pais: str
    titulo_grado: str
    titulo_posgrado: str | None
    tipo_carrera: str | None
    carrera_elegida: str
    motivacion: str
    solicita_beca: bool
    tipo_beca: str | None
    estado: str
    semaforo: str
    semaforo_manual: bool
    fecha_inscripcion: datetime | None
    fecha_activacion: datetime | None
    created_at: datetime
    updated_at: datetime


class CambioEstadoRequest(BaseModel):
    estado: EstadoLegajo
    comentario: str | None = Field(default=None, max_length=2000)


class LegajoPagina(BaseModel):
    data: list[LegajoResponse]
    page: int
    limit: int
    total: int
    pages: int
