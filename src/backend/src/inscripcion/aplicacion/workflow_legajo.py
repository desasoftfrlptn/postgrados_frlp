# Reglas de transición de estados de los legajos.
# Basadas en RF-CORE-003 del SRS.

TRANSICIONES_CONDUCCION = {
    "PENDIENTE": {"EN_REVISION"},
    "EN_REVISION": {
        "OBSERVADO",
        "COMPLETADO",
        "RECHAZADO",
    },
    "COMPLETADO": {"ACTIVO"},
    "ACTIVO": {"BAJA"},
    "EN_RIESGO": {"BAJA"},
}

TRANSICIONES_ASPIRANTE = {
    "BORRADOR": {"PENDIENTE"},
    "OBSERVADO": {"PENDIENTE"},
}

TRANSICIONES_SISTEMA = {
    "COMPLETADO": {"VENCIDO"},
    "ACTIVO": {"GRADUADO"},
}


def validar_transicion_legajo(
    estado_actual: str,
    estado_nuevo: str,
    rol: str,
) -> bool:
    """
    Verifica si un rol puede realizar una
    transición de estado determinada.

    No modifica el legajo ni la base de datos.
    """

    transiciones_por_rol = {
        "coordinador": TRANSICIONES_CONDUCCION,
        "aspirante": TRANSICIONES_ASPIRANTE,
        "sistema": TRANSICIONES_SISTEMA,
    }

    transiciones = transiciones_por_rol.get(
        rol.strip().lower()
    )

    if transiciones is None:
        return False

    estados_permitidos = transiciones.get(
        estado_actual.strip().upper(),
        set(),
    )

    return estado_nuevo.strip().upper() in estados_permitidos