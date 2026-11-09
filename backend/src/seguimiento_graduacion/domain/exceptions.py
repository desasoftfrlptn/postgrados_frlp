"""Errores de negocio y persistencia del módulo de graduación."""


class GraduacionError(Exception):
    """Error base del módulo."""


class AccesoDenegado(GraduacionError):
    """El responsable no tiene permiso para registrar el trabajo."""


class LegajoNoEncontrado(GraduacionError):
    """El legajo solicitado no existe."""


class TrabajoFinalDuplicado(GraduacionError):
    """El legajo ya tiene un trabajo final registrado."""


class IntegridadTrabajoFinal(GraduacionError):
    """Los datos incumplen una restricción de integridad de la base."""
