"""Controller HTTP del recurso Cohortes."""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status, HTTPException

from src.inscripcion.application.service import CohorteService
from src.inscripcion.presentation.dependencies import get_cohorte_service
from src.inscripcion.presentation.schemas import CohorteCreate, CohorteInscripcionUpdate, CohorteResponse
from src.shared.auth.dependencies import require_role

router = APIRouter(prefix="/cohortes", tags=["Cohortes"])

@router.get("", response_model=List[CohorteResponse], status_code=status.HTTP_200_OK)
async def listar_cohortes(
    service: CohorteService = Depends(get_cohorte_service)
):
    return await service.listar_cohortes()

@router.post("", response_model=CohorteResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_role("coordinador"))])
async def crear_cohorte(
    data: CohorteCreate, 
    service: CohorteService = Depends(get_cohorte_service)
):
    try:
        nueva_cohorte = await service.crear_cohorte(
            anio=data.anio,
            nombre=data.nombre,
            fecha_inicio=data.fecha_inicio
        )
        return nueva_cohorte
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{id}/inscripcion", response_model=CohorteResponse, status_code=status.HTTP_200_OK, dependencies=[Depends(require_role("coordinador"))])
async def gestionar_inscripcion_cohorte(
    id: UUID, 
    data: CohorteInscripcionUpdate, 
    service: CohorteService = Depends(get_cohorte_service)
):
    try:
        cohorte_actualizada = await service.gestionar_inscripcion(cohorte_id=id, abierta=data.abierta)
        return cohorte_actualizada
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))