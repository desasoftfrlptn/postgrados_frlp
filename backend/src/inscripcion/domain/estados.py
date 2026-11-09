"""Reglas puras del ciclo de vida del legajo."""

TRANSICIONES = {
    "COORDINADOR": {
        "PENDIENTE": {"EN_REVISION"},
        "EN_REVISION": {"OBSERVADO", "COMPLETADO", "RECHAZADO"},
        "COMPLETADO": {"ACTIVO"},
        "ACTIVO": {"BAJA"},
    },
    "SISTEMA": {
        "COMPLETADO": {"VENCIDO"},
        "ACTIVO": {"GRADUADO"},
    },
}


def transicion_permitida(rol: str, estado_actual: str, estado_nuevo: str) -> bool:
    return estado_nuevo in TRANSICIONES.get(rol.upper(), {}).get(estado_actual, set())
