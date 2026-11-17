from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints, field_validator, model_validator
from pydantic.json_schema import SkipJsonSchema
from src.inscripcion.presentation.schemas import Carrera

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


class ConfirmarPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")
    cohorte_id: UUID
    carrera: Carrera
    confirmar: Literal[True]


class PlanRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    cohorte_id: UUID
    carrera: Carrera
    confirmado: bool


class CrearAsignacion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    carrera: Carrera
    usuario_id: UUID


class AsignacionRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    carrera: Carrera
    usuario_id: UUID


class CrearAvance(BaseModel):
    model_config = ConfigDict(extra="forbid")
    carrera: Carrera
    fecha: date
    descripcion: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]

    @field_validator("fecha")
    @classmethod
    def validar_fecha(cls, valor: date) -> date:
        if valor > date.today():
            raise ValueError("La fecha de avance no puede estar en el futuro")
        return valor


class AvanceRespuesta(CrearAvance):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    legajo_id: UUID


class SemaforoRespuesta(BaseModel):
    legajo_id: UUID
    carrera: Carrera
    estado: Literal["SIN_DATOS", "SIN_EVALUAR", "VERDE", "AMARILLO", "ROJO"]
    motivo: str | None = None
    seminarios_adeudados: int | None = None
    fecha_ultimo_avance: date | None = None
    dias_sin_avance: int | None = None
    fecha_cambio: datetime | None = None
    dias_en_rojo: int | None = None
    recalculado_en: datetime | None = None


class MarcarVerde(BaseModel):
    model_config = ConfigDict(extra="forbid")
    carrera: Carrera
    estado: Literal["VERDE"]


class RiesgoRespuesta(BaseModel):
    legajo_id: UUID
    nombre: str
    apellido: str
    carrera: Carrera
    fecha_inscripcion: datetime
    seminarios_adeudados: int
    dias_sin_avance: int
    dias_en_rojo: int
    motivo: str


class RecalculoRespuesta(BaseModel):
    cambios: int
    alertas_enviadas: int
    alertas_pendientes: int
