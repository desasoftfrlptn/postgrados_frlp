"""Estadisticas reales de cohortes para el dashboard de coordinacion."""
from fastapi import APIRouter, Depends

from src.inscripcion.application.service import CohorteService
from src.inscripcion.presentation.dependencies import get_cohorte_service
from src.inscripcion.presentation.schemas import (
    DesgranamientoCohorteResponse,
    EstadisticasCohorteResponse,
    TipoCarrera,
)
from src.shared.auth.dependencies import require_role

router = APIRouter(prefix="/estadisticas", tags=["Estadisticas"],
                   dependencies=[Depends(require_role("coordinador"))])


@router.get("/cohortes", response_model=list[EstadisticasCohorteResponse])
async def estadisticas_cohortes(
    tipo_carrera: TipoCarrera | None = None,
    service: CohorteService = Depends(get_cohorte_service),
):
    return await service.estadisticas(tipo_carrera)

@router.get("/desgranamiento", response_model=list[DesgranamientoCohorteResponse])
async def desgranamiento(
    service: CohorteService = Depends(get_cohorte_service),
):
    return await service.desgranamiento()