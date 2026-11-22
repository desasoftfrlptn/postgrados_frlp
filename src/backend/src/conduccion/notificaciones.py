from typing import Iterable


NOMBRES_DOCUMENTOS = {
    "FORMULARIO_PREINSCRIPCION": "Formulario de preinscripción",
    "FORMULARIO_INSCRIPCION": "Formulario de inscripción",
    "DNI_PASAPORTE": "DNI o pasaporte",
    "PARTIDA_NACIMIENTO": "Partida de nacimiento",
    "CONSTANCIA_CUIT_CUIL": "Constancia CUIT/CUIL",
    "TITULO_GRADO": "Título de grado",
    "TITULO_POSGRADO": "Título de posgrado",
    "FORMULARIO_BECA": "Formulario de beca",
}


def generar_correo_observacion(
    *,
    nombre: str,
    apellido: str,
    carrera: str,
    numero_seguimiento: str,
    comentario: str | None,
    documentos: Iterable[str],
) -> str:
    partes = [
        f"Hola, {nombre} {apellido}:",
        "Tu inscripción requiere correcciones.",
        f"Carrera: {carrera}",
        f"Número de seguimiento: {numero_seguimiento}",
    ]

    if comentario and comentario.strip():
        partes.extend([
            "Observaciones del Equipo de Conducción:",
            comentario.strip(),
        ])

    documentos_unicos = list(dict.fromkeys(documentos))

    if documentos_unicos:
        listado = "\n".join(
            f"- {NOMBRES_DOCUMENTOS.get(tipo, tipo)}"
            for tipo in documentos_unicos
        )

        partes.extend([
            "Documentación pendiente de corrección:",
            listado,
        ])

    partes.extend([
        "Consultá el estado de tu inscripción desde el "
        "sitio de Posgrados utilizando tu número de seguimiento.",
        "Equipo de Conducción\n"
        "Posgrados - UTN Facultad Regional La Plata",
    ])

    return "\n\n".join(partes)
