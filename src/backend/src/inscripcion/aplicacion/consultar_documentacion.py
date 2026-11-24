
# Prepara la información documental de un legajo
# para su consulta desde el Equipo de Conducción.

from uuid import UUID

from src.inscripcion.infraestructura.repositorio import (
    LegajoRepositorioPostgres,
)
from src.inscripcion.presentacion.esquemas import (
    DocumentoLegajoRespuesta,
    DocumentacionLegajoRespuesta,
)


async def consultar_documentacion_legajo(
    repositorio: LegajoRepositorioPostgres,
    legajo_id: UUID,
) -> DocumentacionLegajoRespuesta | None:
    """
    Consulta los documentos de un legajo existente.

    Devuelve None si el legajo no existe.

    La completitud queda sin calcular hasta
    disponer de los datos necesarios para
    evaluar los documentos condicionales.
    """

    legajo = await repositorio.obtener_por_id(
        legajo_id
    )

    if legajo is None:
        return None

    documentos = await repositorio.listar_documentos_por_legajo(
        legajo_id
    )

    documentos_respuesta = [
        DocumentoLegajoRespuesta.model_validate(
            documento
        )
        for documento in documentos
    ]

    return DocumentacionLegajoRespuesta(
        legajo_id=legajo_id,
        documentos=documentos_respuesta,
        completitud=None,
    )
