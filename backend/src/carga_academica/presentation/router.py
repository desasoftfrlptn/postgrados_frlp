"""Endpoints de carga académica (capa PRESENTATION).

Es la única capa que sabe de HTTP: recibe el pedido, chequea el login y el rol,
llama al service y traduce sus errores a códigos (404, 403).
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.carga_academica.application.planilla_service import (
    PlanillaService,
    SeminarioNoEncontrado,
    SinPermisoPlanilla,
)
from src.carga_academica.infrastructure.planilla_repository import PlanillaRepository
from src.carga_academica.presentation.schemas import PlanillaResponse
from src.shared.auth.dependencies import require_role
from src.shared.auth.orm_models import Usuario
from src.shared.database.session import get_db

# Todas las rutas de este archivo empiezan con /seminarios.
# tags agrupa los endpoints bajo un título en Swagger.
router = APIRouter(prefix="/seminarios", tags=["Carga académica"])


def get_planilla_service(db: AsyncSession = Depends(get_db)) -> PlanillaService:
    """Arma la cadena: sesión de la base -> repository -> service.

    Es la inyección de dependencias del módulo 03 del profe:
    FastAPI la ejecuta sola en cada request.
    """
    return PlanillaService(PlanillaRepository(db))


@router.get("/{seminario_id}/estudiantes", response_model=PlanillaResponse)
async def listar_estudiantes(
    seminario_id: UUID,
    # 401 si no está logueado, 403 si su rol no es ninguno de estos
    usuario: Usuario = Depends(require_role("docente", "coordinador", "admin")),
    service: PlanillaService = Depends(get_planilla_service),
):
    """Planilla de asistencia del seminario (US-B-003).

    El front la usa para mostrarla y para descargarla en Excel.
    Un docente solo puede ver la de sus seminarios (BR-007).
    """
    try:
        return await service.obtener_planilla(seminario_id, usuario)
    except SeminarioNoEncontrado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seminario no encontrado",
        )
    except SinPermisoPlanilla:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo podés ver la planilla de tus seminarios",
        )