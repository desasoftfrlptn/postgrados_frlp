from dataclasses import dataclass
from typing import Literal

EstadoDocumento = Literal["CARGADO", "PENDIENTE", "NO_APLICA"]


@dataclass(frozen=True)
class RequisitoDocumental:
    tipo: str
    descripcion: str
    obligatorio: bool
    estado: EstadoDocumento


def calcular_estado_documental(
    *,
    solicita_beca: bool,
    titulo_posgrado: str | None,
    tipos_cargados: set[str],
) -> list[RequisitoDocumental]:
    requiere_titulo_posgrado = bool(titulo_posgrado and titulo_posgrado.strip())
    requisitos = [
        ("FORM_INSCRIPCION", "Formulario de preinscripción firmado", True, True),
        ("DNI", "Copia de DNI o pasaporte", True, True),
        ("TITULO", "Copia del título de grado", True, True),
        ("PARTIDA", "Partida de nacimiento", True, True),
        ("CUIT", "Constancia CUIT/CUIL", True, True),
        (
            "TITULO_POSGRADO",
            "Título de posgrado",
            requiere_titulo_posgrado,
            requiere_titulo_posgrado,
        ),
        (
            "FORM_BECA",
            "Formulario de beca firmado",
            solicita_beca,
            solicita_beca,
        ),
    ]

    estados = []
    for tipo, descripcion, aplica, obligatorio in requisitos:
        if not aplica:
            estado: EstadoDocumento = "NO_APLICA"
        elif tipo in tipos_cargados:
            estado = "CARGADO"
        else:
            estado = "PENDIENTE"
        estados.append(
            RequisitoDocumental(
                tipo=tipo,
                descripcion=descripcion,
                obligatorio=obligatorio,
                estado=estado,
            )
        )
    return estados
