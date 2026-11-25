"""Errores de negocio y persistencia del módulo de graduación."""


class GraduacionError(Exception):
    """Error base del módulo."""


class ActualizacionInvalida(GraduacionError):
    """Se intentó modificar un campo protegido o borrar un dato obligatorio."""


class AccesoDenegado(GraduacionError):
    """El responsable no tiene permiso para registrar el trabajo."""


class LegajoNoEncontrado(GraduacionError):
    """El legajo solicitado no existe."""


class TrabajoFinalNoEncontrado(GraduacionError):
    """El legajo no tiene un trabajo final registrado."""


class TrabajoFinalDuplicado(GraduacionError):
    """El legajo ya tiene un trabajo final registrado."""


class IntegridadTrabajoFinal(GraduacionError):
    """Los datos incumplen una restricción de integridad de la base."""
