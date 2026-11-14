from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.compartido.conexion import get_db
from src.inscripcion.aplicacion.cohortes_servicio import (
    crear_cohorte,
    listar_cohortes,
    modificar_inscripcion,
)
from src.inscripcion.infraestructura.cohortes_repositorio import (
    CohorteRepositorioPostgres,
)
from src.inscripcion.presentacion.cohortes_esquemas import (
    CohorteCrear,
    CohorteInscripcionModificar,
    CohorteRespuesta,
)
from src.inscripcion.presentacion.rutas import (
    coordinador_actual,
)


enrutador = APIRouter(
    prefix="/api/v1/cohortes",
    tags=["Cohortes"],
)


@enrutador.get(
    "",
    response_model=list[CohorteRespuesta],
)
async def listar_cohortes_controller(
    db: AsyncSession = Depends(get_db),
):
    repositorio = CohorteRepositorioPostgres(db)

    return await listar_cohortes(repositorio)


@enrutador.post(
    "",
    response_model=CohorteRespuesta,
    status_code=201,
)
async def crear_cohorte_controller(
    datos: CohorteCrear,
    db: AsyncSession = Depends(get_db),
    _usuario=Depends(coordinador_actual),
):
    repositorio = CohorteRepositorioPostgres(db)

    try:
        return await crear_cohorte(
            repositorio=repositorio,
            anio=datos.anio,
            nombre=datos.nombre,
            fecha_inicio=datos.fecha_inicio,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Ya existe una cohorte con ese nombre.",
        ) from exc


@enrutador.patch(
    "/{cohorte_id}/inscripcion",
    response_model=CohorteRespuesta,
)
async def modificar_inscripcion_controller(
    cohorte_id: UUID,
    datos: CohorteInscripcionModificar,
    db: AsyncSession = Depends(get_db),
    _usuario=Depends(coordinador_actual),
):
    repositorio = CohorteRepositorioPostgres(db)

    cohorte = await modificar_inscripcion(
        repositorio=repositorio,
        cohorte_id=cohorte_id,
        abierta=datos.abierta,
    )

    if cohorte is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró la cohorte.",
        )

    return cohorte
