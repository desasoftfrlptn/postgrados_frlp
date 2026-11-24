"""Regla de vencimiento de la reserva de vacante (US-CORE-010). Pura: sin base ni fechas del sistema."""

from datetime import datetime, timedelta

DIAS_PARA_VENCER = 30


def debe_vencer(fecha_completado: datetime, ahora: datetime) -> bool:
    """¿Pasaron 30 días corridos o más desde que el legajo quedó COMPLETADO?

    Recibe `ahora` por parámetro (no llama a datetime.now() adentro)
    para que el resultado no dependa del día en que se corre el test.
    """
    return ahora - fecha_completado >= timedelta(days=DIAS_PARA_VENCER)


def fecha_de_vencimiento(fecha_completado: datetime) -> datetime:
    """El día en que vence la reserva: va en el mail al coordinador."""
    return fecha_completado + timedelta(days=DIAS_PARA_VENCER)