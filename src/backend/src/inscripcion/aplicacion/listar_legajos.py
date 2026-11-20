from uuid import UUID

from src.inscripcion.puertos import LegajoRepositorio


async def listar_legajos(
    repositorio: LegajoRepositorio,
    dni: str | None = None,
    apellido: str | None = None,
    carrera: str | None = None,
    estado: str | None = None,
    cohorte_id: UUID | None = None,
):
    """
    Consulta los legajos aplicando los filtros
    recibidos desde el Equipo de Conducción.
    """

    return await repositorio.listar_legajos(
        dni=dni,
        apellido=apellido,
        carrera=carrera,
        estado=estado,
        cohorte_id=cohorte_id,
    )
