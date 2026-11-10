"""Regla del recordatorio de carga de notas (US-B-005). Pura: sin base ni reloj del sistema."""

from datetime import datetime, timedelta

HORAS_DE_AVISO = 48


def requiere_recordatorio(fecha_limite: datetime | None, ahora: datetime) -> bool:
    """¿Corresponde recordar hoy? Sí, si la fecha límite está entre ahora y 48 horas.

    - Sin fecha límite cargada: no.
    - Faltan más de 48 hs: todavía no.
    - Ya pasó la fecha límite: no (el plazo venció, el recordatorio no sirve).
    La tarea corre una vez por día, así que mientras se cumpla esto,
    el recordatorio se repite cada 24 hs.
    """
    if fecha_limite is None:
        return False
    falta = fecha_limite - ahora
    return timedelta(0) < falta <= timedelta(hours=HORAS_DE_AVISO)
