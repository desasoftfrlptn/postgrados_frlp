"""Contrato de persistencia independiente de SQLAlchemy y FastAPI."""

from dataclasses import dataclass
from datetime import date
from typing import Any, Protocol
from uuid import UUID


@dataclass(frozen=True)
class DatosTrabajoFinal:
    """Datos ya validados por la entrada; el responsable se recibe por separado."""

    tipo: str
    titulo: str
    director: str
    fecha_cpr: date
    numero_resolucion: str
    codirector: str | None = None


class TrabajoFinalRepository(Protocol):
    """Operaciones que necesita el alta; infraestructura aporta los objetos ORM."""

    async def obtener_legajo(self, legajo_id: UUID) -> Any | None: ...
    async def existe_para_legajo(self, legajo_id: UUID) -> bool: ...
    async def crear(self, legajo_id: UUID, datos: DatosTrabajoFinal, creado_por: str) -> Any: ...
    async def confirmar(self) -> None: ...
    async def revertir(self) -> None: ...
