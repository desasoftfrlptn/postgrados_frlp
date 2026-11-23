"""Contratos publicos de carga, listado y revision documental."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

TipoDocumento = Literal["DNI", "TITULO_GRADO", "PARTIDA", "CUIT_CUIL", "FORM_INSCRIPCION", "FORM_BECA", "TITULO_POSGRADO"]
EstadoDocumento = Literal["PENDIENTE_REVISION", "APROBADO", "OBSERVADO", "FALTANTE"]


class DocumentoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    legajo_id: UUID
    tipo: TipoDocumento
    nombre_original: str
    tamanio_bytes: int
    fecha_subida: datetime
    estado: EstadoDocumento
    motivo_observacion: str | None = None


class RevisarDocumentoRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    accion: Literal["APROBAR", "OBSERVAR", "MARCAR_FALTANTE"]
    motivo: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def motivo_obligatorio(self):
        if self.accion != "APROBAR" and not self.motivo:
            raise ValueError("Debe indicar el motivo de la observación o del faltante")
        return self
