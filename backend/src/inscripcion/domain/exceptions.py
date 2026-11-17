"""Excepciones propias del dominio de inscripción/legajos."""


class LegajoError(Exception):
    """Error base del módulo."""


class LegajoNoEncontrado(LegajoError):
    pass


class CohorteNoEncontrada(LegajoError):
    pass


class InscripcionCerrada(LegajoError):
    pass


class ConflictoLegajo(LegajoError):
    def __init__(self, message: str, field: str | None = None):
        self.message = message
        self.field = field
        super().__init__(message)


class TransicionNoPermitida(LegajoError):
    pass


class AccesoDenegado(LegajoError):
    pass


class ReglaNegocioInvalida(LegajoError):
    pass
