import re
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class DNI:
    valor: str

    def __post_init__(self) -> None:
        if not re.match(r"^\d{7,8}$", self.valor):
            raise ValueError("DNI debe tener 7 u 8 dígitos")

    def __str__(self) -> str:
        return self.valor


@dataclass(frozen=True)
class Email:
    valor: str

    def __post_init__(self) -> None:
        if not re.match(r"[^@]+@[^@]+\.[^@]+", self.valor):
            raise ValueError("Email con formato inválido")

    def __str__(self) -> str:
        return self.valor


@dataclass(frozen=True)
class PorcentajeAsistencia:
    valor: float

    def __post_init__(self) -> None:
        if not 0 <= self.valor <= 100:
            raise ValueError("Porcentaje debe estar en 0-100")

    @property
    def formato(self) -> str:
        return f"{self.valor:.1f}%"


@dataclass(frozen=True)
class Nota:
    valor: float

    def __post_init__(self) -> None:
        if not 1 <= self.valor <= 10:
            raise ValueError("Nota debe estar en 1-10")
        # Máximo 1 decimal
        if self.valor != round(self.valor, 1):
            raise ValueError("Máximo 1 decimal")

    @property
    def es_aprobatoria(self) -> bool:
        return self.valor >= 4

    @property
    def es_desaprobatoria(self) -> bool:
        return self.valor < 4


@dataclass(frozen=True)
class Asistencia:
    presente: bool
    fecha: date

    @property
    def es_presente(self) -> bool:
        return self.presente
