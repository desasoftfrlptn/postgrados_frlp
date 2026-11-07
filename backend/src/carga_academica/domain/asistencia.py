"""Reglas de asistencia de un seminario (funciones puras, sin base de datos)."""


def calcular_porcentaje_asistencia(presentes: int, total_clases: int) -> float:
    """Porcentaje de clases a las que asistió, con un decimal. Sin clases da 0."""
    if total_clases == 0:
        return 0.0
    return round(presentes / total_clases * 100, 1)


def marca_asistencia(presente: bool | None) -> str:
    """P si estuvo, A si faltó o si no hay registro de esa clase."""
    return "P" if presente else "A"