from dataclasses import dataclass
from datetime import date
from typing import Optional
from uuid import UUID

@dataclass
class Cohorte:
    id: Optional[UUID]
    anio: int
    nombre: str
    abierta: bool = False
    fecha_inicio: Optional[date] = None

    def abrir_inscripcion(self) -> None:
        """Regla de negocio: abre la inscripción a la cohorte."""
        self.abierta = True

    def cerrar_inscripcion(self) -> None:
        """Regla de negocio: cierra la inscripción a la cohorte."""
        self.abierta = False