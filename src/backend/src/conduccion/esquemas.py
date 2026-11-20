from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)

from src.conduccion.reglas import AccionLegajo

EstadoLegajo = Literal[
    "BORRADOR",
    "PENDIENTE",
    "EN_REVISION",
    "OBSERVADO",
    "COMPLETADO",
    "ACTIVO",
    "EN_RIESGO",
    "VENCIDO",
    "RECHAZADO",
    "BAJA",
    "GRADUADO",
]

class VerificacionLegajoPeticion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    datos_verificados: bool
    tiene_titulo_posgrado: bool

class AccionLegajoPeticion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    accion: AccionLegajo

    estado_esperado: EstadoLegajo

    comentario: str | None = Field(
        default=None,
        max_length=4000,
    )
    @field_validator("comentario")
    @classmethod
    def normalizar_comentario(cls, valor):
        if valor is None:
            return None

        return valor.strip() or None