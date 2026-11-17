from datetime import date
from decimal import Decimal


def calcular_porcentaje_asistencia(
    fechas_clases: list[date], fechas_presentes: set[date], hoy: date
) -> Decimal:
    dictadas = [fecha for fecha in fechas_clases if fecha <= hoy]
    if not dictadas:
        return Decimal("0")
    presentes = sum(fecha in fechas_presentes for fecha in dictadas)
    return Decimal(presentes) * 100 / len(dictadas)


def calcular_condicion(nota: Decimal | None, porcentaje: Decimal) -> str:
    if nota is None:
        return "Pendiente"
    if nota < 4:
        return "Desaprobado"
    return "Libre" if porcentaje < 75 else "Aprobado"