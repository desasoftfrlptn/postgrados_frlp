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

    documentacion_a_corregir: list[str] = Field(
        default_factory=list,
    )

    @field_validator("comentario")
    @classmethod
    def normalizar_comentario(cls, valor):
        if valor is None:
            return None

        return valor.strip() or None

    @field_validator("documentacion_a_corregir")
    @classmethod
    def validar_documentacion_a_corregir(cls, documentos):
        documentos_permitidos = {
            "FORMULARIO_PREINSCRIPCION",
            "FORMULARIO_INSCRIPCION",
            "DNI_PASAPORTE",
            "PARTIDA_NACIMIENTO",
            "CONSTANCIA_CUIT_CUIL",
            "TITULO_GRADO",
            "TITULO_POSGRADO",
            "FORMULARIO_BECA",
        }

        if len(documentos) != len(set(documentos)):
            raise ValueError("No se permiten documentos duplicados.")

        documentos_invalidos = set(documentos) - documentos_permitidos

        if documentos_invalidos:
            raise ValueError("Se recibieron tipos de documentos no permitidos.")

        return documentos