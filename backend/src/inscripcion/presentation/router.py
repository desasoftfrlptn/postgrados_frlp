from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.shared.database.session import get_db
from src.inscripcion.infrastructure.pg_repository import PostgresCohorteRepository
from src.inscripcion.application.listar_cohortes import ListarCohortesUseCase
from src.inscripcion.application.crear_cohorte import CrearCohorteUseCase
from src.inscripcion.application.gestionar_inscripcion import GestionarInscripcionUseCase
from src.inscripcion.presentation.schemas import CohorteCreate, CohorteInscripcionUpdate, CohorteResponse

router = APIRouter(prefix="/cohortes", tags=["Cohortes"])

@router.get("", response_model=List[CohorteResponse], status_code=status.HTTP_200_OK)
async def listar_cohortes(db: AsyncSession = Depends(get_db)):
    repo = PostgresCohorteRepository(db)
    use_case = ListarCohortesUseCase(repo)
    return await use_case.execute()

@router.post("", response_model=CohorteResponse, status_code=status.HTTP_201_CREATED) #dependencies=[Depends(require_role("COORDINADOR"))]
async def crear_cohorte(data: CohorteCreate, db: AsyncSession = Depends(get_db)):
    repo = PostgresCohorteRepository(db)
    use_case = CrearCohorteUseCase(repo)
    try:
        nueva_cohorte = await use_case.execute(
            anio=data.anio,
            nombre=data.nombre,
            fecha_inicio=data.fecha_inicio
        )
        return nueva_cohorte
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{id}/inscripcion", response_model=CohorteResponse, status_code=status.HTTP_200_OK) #dependencies=[Depends(require_role("COORDINADOR"))]
async def gestionar_inscripcion_cohorte(
    id: UUID, 
    data: CohorteInscripcionUpdate, 
    db: AsyncSession = Depends(get_db)
):
    repo = PostgresCohorteRepository(db)
    use_case = GestionarInscripcionUseCase(repo)
    try:
        cohorte_actualizada = await use_case.execute(cohorte_id=id, abierta=data.abierta)
        return cohorte_actualizada
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))