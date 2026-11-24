
from datetime import date
from uuid import UUID

from src.inscripcion.infraestructura.cohortes_repositorio import (
    CohorteRepositorioPostgres,
)


async def listar_cohortes(
    repositorio: CohorteRepositorioPostgres,
):
    return await repositorio.listar_cohortes()


async def crear_cohorte(
    repositorio: CohorteRepositorioPostgres,
    anio: int,
    nombre: str,
    carrera_id: UUID,
    fecha_inicio: date | None = None,
):
    nombre_normalizado = nombre.strip()

    if not nombre_normalizado:
        raise ValueError(
            "El nombre de la cohorte es obligatorio."
        )

    if anio < 1:
        raise ValueError(
            "El año de la cohorte debe ser positivo."
        )

    carrera = await repositorio.obtener_carrera_activa(
        carrera_id
    )

    if carrera is None:
        raise ValueError(
            "La carrera seleccionada no existe o está inactiva."
        )

    return await repositorio.crear_cohorte(
        anio=anio,
        nombre=nombre_normalizado,
        carrera_id=carrera_id,
        fecha_inicio=fecha_inicio,
    )


async def modificar_inscripcion(
    repositorio: CohorteRepositorioPostgres,
    cohorte_id: UUID,
    abierta: bool,
):
    return await repositorio.modificar_inscripcion(
        cohorte_id=cohorte_id,
        abierta=abierta,
    )
