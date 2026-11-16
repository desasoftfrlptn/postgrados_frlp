from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from src.inscripcion.presentation.dependencies import get_periodo_service
from src.inscripcion.presentation.schemas import (
    ActualizarPeriodoRequest,
    CrearPeriodoRequest,
    PeriodoResponse,
    PeriodoVigenteResponse,
)
from src.inscripcion.application.service_periodos import (
    CohorteNoEncontrada,
    FechasPeriodoInvalidas,
    PeriodoNoEncontrado,
    PeriodoService,
)
from src.shared.auth.orm_models import Usuario
from src.shared.auth.dependencies import require_role

router = APIRouter(tags=["Períodos de inscripción"])


def _http_error(error: Exception) -> HTTPException:
    if isinstance(error, (CohorteNoEncontrada, PeriodoNoEncontrado)):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    if isinstance(error, FechasPeriodoInvalidas):
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error))
    return HTTPException(status_code=500, detail="Error interno del módulo de períodos")


@router.get("/periodos/vigente", response_model=PeriodoVigenteResponse)
async def obtener_periodo_vigente(
    service: PeriodoService = Depends(get_periodo_service),
):
    # Endpoint público: lo consulta el formulario antes de iniciar la inscripción.
    return await service.vigente()


@router.get("/cohortes/{cohorte_id}/periodos", response_model=list[PeriodoResponse])
async def listar_periodos(
    cohorte_id: UUID,
    service: PeriodoService = Depends(get_periodo_service),
    _: Usuario = Depends(require_role("coordinador")),
):
    try:
        return await service.listar(cohorte_id)
    except (CohorteNoEncontrada, PeriodoNoEncontrado) as error:
        raise _http_error(error) from error


@router.post(
    "/cohortes/{cohorte_id}/periodos",
    response_model=PeriodoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_periodo(
    cohorte_id: UUID,
    datos: CrearPeriodoRequest,
    service: PeriodoService = Depends(get_periodo_service),
    _: Usuario = Depends(require_role("coordinador")),
):
    try:
        return await service.crear(
            cohorte_id,
            fecha_abre=datos.fecha_abre,
            fecha_cierra=datos.fecha_cierra,
        )
    except (CohorteNoEncontrada, FechasPeriodoInvalidas) as error:
        raise _http_error(error) from error


@router.patch("/periodos/{periodo_id}", response_model=PeriodoResponse)
async def actualizar_periodo(
    periodo_id: UUID,
    datos: ActualizarPeriodoRequest,
    service: PeriodoService = Depends(get_periodo_service),
    _: Usuario = Depends(require_role("coordinador")),
):
    try:
        return await service.actualizar(periodo_id, fecha_cierra=datos.fecha_cierra)
    except (PeriodoNoEncontrado, FechasPeriodoInvalidas) as error:
        raise _http_error(error) from error
