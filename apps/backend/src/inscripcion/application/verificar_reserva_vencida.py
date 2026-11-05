from datetime import date
from src.inscripcion.domain.estados import calcular_dias_desde_completado


def verificar_reserva_vencida(
        legajo: object,
        fecha_completado: date,
        hoy: date = None,
) -> bool:
    """
    Verifica si la reserva de vacante de 30 días ha vencido (BR-005).
    """
    if hoy is None:
        hoy = date.today()

    dias_transcurridos = calcular_dias_desde_completado(fecha_completado, hoy)
    return dias_transcurridos > 30
