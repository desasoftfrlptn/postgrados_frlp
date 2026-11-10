from collections.abc import Iterable
from dataclasses import dataclass


DOCUMENTOS_OBLIGATORIOS = {
    "FORMULARIO_PREINSCRIPCION": "Formulario de preinscripción firmado",
    "DNI_PASAPORTE": "Copia de DNI o pasaporte",
    "TITULO_GRADO": "Copia del título de grado",
    "PARTIDA_NACIMIENTO": "Partida de nacimiento",
    "CONSTANCIA_CUIT_CUIL": "Constancia CUIT/CUIL",
}

DOCUMENTOS_CONDICIONALES = {
    "TITULO_POSGRADO": "Copia del título de posgrado",
    "FORMULARIO_BECA": "Formulario de beca firmado",
}


@dataclass
class ResultadoCompletitud:
    porcentaje: int
    documentos_requeridos: int
    documentos_presentados: int
    documentos_faltantes: list[str]
    completo: bool


def calcular_completitud_documental(
    tipos_presentados: Iterable[str],
    tiene_titulo_posgrado: bool = False,
    solicito_beca: bool = False,
) -> ResultadoCompletitud:
    documentos_requeridos = DOCUMENTOS_OBLIGATORIOS.copy()

    if tiene_titulo_posgrado:
        documentos_requeridos["TITULO_POSGRADO"] = (
            DOCUMENTOS_CONDICIONALES["TITULO_POSGRADO"]
        )

    if solicito_beca:
        documentos_requeridos["FORMULARIO_BECA"] = (
            DOCUMENTOS_CONDICIONALES["FORMULARIO_BECA"]
        )

    presentes = set(tipos_presentados)

    faltantes = [
        descripcion
        for tipo, descripcion in documentos_requeridos.items()
        if tipo not in presentes
    ]

    cantidad_requerida = len(documentos_requeridos)
    cantidad_presentada = cantidad_requerida - len(faltantes)

    porcentaje = round(
        cantidad_presentada / cantidad_requerida * 100
    )

    return ResultadoCompletitud(
        porcentaje=porcentaje,
        documentos_requeridos=cantidad_requerida,
        documentos_presentados=cantidad_presentada,
        documentos_faltantes=faltantes,
        completo=len(faltantes) == 0,
    )