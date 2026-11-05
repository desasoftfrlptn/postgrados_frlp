from src.inscripcion.domain.entities import Legajo, EstadoLegajo
from src.inscripcion.domain.entities import Legajo as LegajoDom


def observar_legajo(
        legajo: Legajo,
        comentario: str,
        es_coordinador: bool = False,
) -> tuple[Legajo, str | None]:
    """
    Caso de uso: coordinador observa un legajo (RF-CORE-003).
    """
    if not es_coordinador:
        return legajo, "Solo el coordinador puede marcar como observado"

    # Transición PENDIENTE → OBSERVADO o EN_REVISIÓN → OBSERVADO
    if legajo.estado == EstadoLegajo.PENDIENTE:
        legajo.estado = EstadoLegajo.OBSERVADO
    elif legajo.estado == EstadoLegajo.EN_REVISION:
        legajo.estado = EstadoLegajo.OBSERVADO
    else:
        return legajo, f"No se puede observar legajo en estado {legajo.estado.value}"

    # Nota: en un sistema completo, aquí se enviaría email automático al aspirante
    # con el texto del comentario. Por ahora solo actualizamos el estado.

    return legajo, None
