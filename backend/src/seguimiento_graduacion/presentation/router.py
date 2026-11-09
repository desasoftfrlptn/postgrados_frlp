"""Entrada HTTP para registrar trabajos finales (US-C-001)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.seguimiento_graduacion.application.registrar_trabajo_final import RegistrarTrabajoFinal
from src.seguimiento_graduacion.domain.exceptions import (
    AccesoDenegado, IntegridadTrabajoFinal, LegajoNoEncontrado, TrabajoFinalDuplicado,
)
from src.seguimiento_graduacion.domain.repository import DatosTrabajoFinal
from src.seguimiento_graduacion.infrastructure.pg_repository import TrabajoFinalRepository
from src.seguimiento_graduacion.presentation.schemas import CrearTrabajoFinalRequest, TrabajoFinalResponse
from src.shared.auth.dependencies import require_role
from src.shared.auth.orm_models import Usuario
from src.shared.database.session import get_db

router = APIRouter(prefix="/legajos", tags=["Seguimiento de graduación"])


async def obtener_registrar_trabajo_final(
    db: AsyncSession = Depends(get_db),
) -> RegistrarTrabajoFinal:
    """Conecta el caso de uso con el repositorio y la sesión compartida."""
    return RegistrarTrabajoFinal(TrabajoFinalRepository(db))


@router.post(
    "/{id}/trabajo-final",
    response_model=TrabajoFinalResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        401: {"description": "Sesión inválida o vencida"},
        403: {"description": "Se requiere rol CPR"},
        404: {"description": "Legajo inexistente"},
        409: {"description": "Trabajo duplicado o conflicto de integridad"},
    },
)
async def registrar_trabajo_final(
    id: UUID,
    datos: CrearTrabajoFinalRequest,
    usuario: Usuario = Depends(require_role("cpr")),
    caso_de_uso: RegistrarTrabajoFinal = Depends(obtener_registrar_trabajo_final),
):
    """Registra el trabajo usando la identidad autenticada como responsable."""
    try:
        return await caso_de_uso.ejecutar(
            id, DatosTrabajoFinal(**datos.model_dump()),
            usuario_email=usuario.email, usuario_rol=usuario.rol,
        )
    except AccesoDenegado as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except LegajoNoEncontrado as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except (TrabajoFinalDuplicado, IntegridadTrabajoFinal) as error:
        raise HTTPException(
            status_code=409,
            detail="El legajo ya tiene un trabajo final registrado"
            if isinstance(error, TrabajoFinalDuplicado)
            else "No se pudo registrar el trabajo final por un conflicto de integridad",
        ) from error
