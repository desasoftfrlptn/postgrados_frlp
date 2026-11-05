from datetime import date
from src.inscripcion.domain.entities import Aspirante, Legajo, EstadoLegajo, TipoCarrera
from src.inscripcion.domain.value_objects import DNI, Email
from src.inscripcion.domain.estados import validar_transicion, es_verdesolo_manual, calcular_dias_desde_completado


def aprobar_legajo(
        legajo: Legajo,
        es_coordinador: bool = False,
        hoy: date = None,
) -> tuple[Legajo, str | None]:
    """
    Caso de uso: coordinador aprueba un legajo (RF-CORE-003).
    """
    if not es_coordinador:
        return legajo, "Solo el coordinador puede aprobar legajos"

    # Validar transición de estado
    if not legajo.puede_transicionar_a(EstadoLegajo.COMPLETADO):
        return legajo, f"No es posible pasar del estado {legajo.estado.value} a COMPLETADO"

    # BR-005: Generar número de legajo único si aún no tiene uno
    if legajo.numero_legajo.startswith("PROVISIONAL") or legajo.numero_legajo == "":
        anyo = (hoy or date.today()).year
        import uuid
        secuencia = uuid.uuid4().int % 1000
        legajo.numero_legajo = f"{anyo}-{legajo.cohorte_id[:8]}-{secuencia:03d}"

    # Transición a COMPLETADO
    legajo.estado = EstadoLegajo.COMPLETADO
    legajo.fecha_activacion = hoy or date.today()

    # Observación: la reserva de vacante comienza ahora (30 días corridos)
    # El job vencero_reservas se encargará de pasar a VENCIDO automáticamente

    return legajo, None
