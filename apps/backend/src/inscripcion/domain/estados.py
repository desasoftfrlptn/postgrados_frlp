from enum import Enum
from datetime import date
from typing import Optional

from .entities import Aspirante, Legajo, EstadoLegajo, TipoCarrera


# Reglas de transición de estado explícitas (BR-003, BR-005)
# Estas reglas están en la capa de dominio, SIN imports de SQLAlchemy/FastAPI


def validar_transicion(
        estado_actual: EstadoLegajo,
        nuevo_estado: EstadoLegajo,
        es_coordinador: bool = False,
        es_aspirante: bool = False,
) -> bool:
    """
    Valida si una transición de estado es permitida.
    
    Reglas clave (BR-003, BR-005):
    - Aspirante puede guardar progreso (BORRADOR → PENDIENTE)
    - Coordinador revisa y aprueba (PENDIENTE → EN_REVISIÓN → COMPLETADO)
    - Reservas de vacante vencen a 30 días desde COMPLETADO
    - VERDE solo manual por coordinador (BR-008)
    """
    # BORRADOR → PENDIENTE: Aspirante guardando progreso
    if estado_actual == EstadoLegajo.BORRADOR and nuevo_estado == EstadoLegajo.PENDIENTE:
        return True  # Siempre permitido para aspirante

    # PENDIENTE → EN_REVISIÓN: Coordinador revisando
    if estado_actual == EstadoLegajo.PENDIENTE and nuevo_estado == EstadoLegajo.EN_REVISION:
        return es_coordinador

    # PENDIENTE → OBSERVADO: Coordinador detectando documentación faltante
    if estado_actual == EstadoLegajo.PENDIENTE and nuevo_estado == EstadoLegajo.OBSERVADO:
        return es_coordinador

    # OBSERVADO → PENDIENTE: Aspirante corrigiendo y reenviando
    if (
            estado_actual == EstadoLegajo.OBSERVADO
            and nuevo_estado == EstadoLegajo.PENDIENTE
            and es_aspirante
    ):
        return True

    # EN_REVISIÓN → COMPLETADO: Coordinador aprobando
    if (
            estado_actual == EstadoLegajo.EN_REVISION
            and nuevo_estado == EstadoLegajo.COMPLETADO
            and es_coordinador
    ):
        # BR-005: Generar número de legajo único si aún no tiene uno
        return True

    # EN_REVISIÓN → RECHAZADO: Coordinador por documentación fraudulenta
    if (
            estado_actual == EstadoLegajo.EN_REVISION
            and nuevo_estado == EstadoLegajo.RECHAZADO
            and es_coordinador
    ):
        return True

    # COMPLETADO → ACTIVO: Coordinador matricular estudiante (BR-005: reserva 30 días)
    if (
            estado_actual == EstadoLegajo.COMPLETADO
            and nuevo_estado == EstadoLegajo.ACTIVO
            and es_coordinador
    ):
        return True

    # ACTIVO → GRADUADO: Aprobación final (sistema o coordinador manual)
    if (
            estado_actual == EstadoLegajo.ACTIVO
            and nuevo_estado == EstadoLegajo.GRADUADO
    ):
        return True  # Puede ser automático o manual

    # Cualquier estado → VENCIDO: Sistema automático a los 30 días desde COMPLETADO
    if nuevo_estado == EstadoLegajo.VENCIDO:
        # Solo si el legajo está en COMPLETADO hace más de 30 días
        return True  # Validación de fecha completa en aplicación layer

    # Por defecto, transición no permitida
    return False


def es_verdesolo_manual() -> bool:
    """Indica que VERDE solo puede asignarse manualmente por coordinador (BR-008)."""
    return True  # Por decisión de diseño, nunca VERDE automático


def calcular_dias_desde_completado(fecha_completado: date, hoy: date = None) -> int:
    """
    Calcula los días corridos desde que el legajo pasó a COMPLETADO.
    Usado para BR-005: reserva de vacante vence a 30 días.
    """
    if hoy is None:
        hoy = date.today()
    return (hoy - fecha_completado).days
