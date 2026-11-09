"""Entrada HTTP para registrar y consultar trabajos finales (US-C-001)."""

from uuid import UUID
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.seguimiento_graduacion.application.registrar_trabajo_final import RegistrarTrabajoFinal
from src.seguimiento_graduacion.application.consultar_trabajo_final import ConsultarTrabajoFinal
from src.seguimiento_graduacion.application.consultar_semaforo import ConsultarSemaforo
from src.seguimiento_graduacion.application.listar_estudiantes_en_riesgo import ListarEstudiantesEnRiesgo
from src.seguimiento_graduacion.application.modificar_trabajo_final import ModificarTrabajoFinal
from src.seguimiento_graduacion.domain.exceptions import (
    AccesoDenegado, IntegridadTrabajoFinal, LegajoNoEncontrado, TrabajoFinalDuplicado,
    TrabajoFinalNoEncontrado,
    ActualizacionInvalida,
)
from src.seguimiento_graduacion.domain.repository import DatosTrabajoFinal
from src.seguimiento_graduacion.infrastructure.pg_repository import TrabajoFinalRepository
from src.seguimiento_graduacion.presentation.schemas import CrearTrabajoFinalRequest, TrabajoFinalResponse, ActualizarTrabajoFinalRequest
from src.seguimiento_graduacion.presentation.schemas import SemaforoResponse
from src.seguimiento_graduacion.presentation.schemas import EstudiantesEnRiesgoPagina
from src.shared.auth.dependencies import require_role, get_current_user
from src.shared.auth.orm_models import Usuario
from src.shared.database.session import get_db

router = APIRouter(tags=["Seguimiento de graduación"])


async def obtener_listar_en_riesgo(
    db: AsyncSession = Depends(get_db),
) -> ListarEstudiantesEnRiesgo:
    """Conecta el listado con la sesión compartida y el repositorio existente."""
    return ListarEstudiantesEnRiesgo(TrabajoFinalRepository(db))


@router.get(
    "/graduacion/en-riesgo", response_model=EstudiantesEnRiesgoPagina,
    responses={401: {"description": "Sesión inválida o vencida"},
               403: {"description": "Se requiere rol coordinador"}},
)
async def listar_en_riesgo(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    cohorte_id: UUID | None = None,
    tipo_carrera: Literal["Especializacion", "Maestria", "Doctorado"] | None = None,
    usuario: Usuario = Depends(require_role("coordinador")),
    caso_de_uso: ListarEstudiantesEnRiesgo = Depends(obtener_listar_en_riesgo),
):
    """Lista exclusivamente semáforos ROJO almacenados; no evalúa criticidad."""
    try:
        return await caso_de_uso.ejecutar(
            usuario_rol=usuario.rol, page=page, limit=limit,
            cohorte_id=cohorte_id, tipo_carrera=tipo_carrera,
        )
    except AccesoDenegado as error:
        raise HTTPException(status_code=403, detail=str(error)) from error


async def obtener_consultar_semaforo(
    db: AsyncSession = Depends(get_db),
) -> ConsultarSemaforo:
    """Conecta la lectura con el repositorio existente y la sesión compartida."""
    return ConsultarSemaforo(TrabajoFinalRepository(db))


@router.get(
    "/legajos/{id}/semaforo", response_model=SemaforoResponse,
    responses={401: {"description": "Sesión inválida o vencida"},
               403: {"description": "Se requiere rol coordinador"},
               404: {"description": "Legajo inexistente"}},
)
async def consultar_semaforo(
    id: UUID,
    usuario: Usuario = Depends(require_role("coordinador")),
    caso_de_uso: ConsultarSemaforo = Depends(obtener_consultar_semaforo),
):
    """Consulta el valor persistido sin calcularlo ni modificar el legajo."""
    try:
        return await caso_de_uso.ejecutar(id, usuario_rol=usuario.rol)
    except AccesoDenegado as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except LegajoNoEncontrado as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


async def obtener_consultar_trabajo_final(
    db: AsyncSession = Depends(get_db),
) -> ConsultarTrabajoFinal:
    """Conecta la consulta con el repositorio existente y la sesión compartida."""
    return ConsultarTrabajoFinal(TrabajoFinalRepository(db))


@router.get(
    "/legajos/{id}/trabajo-final",
    response_model=TrabajoFinalResponse,
    responses={
        401: {"description": "Sesión inválida o vencida"},
        403: {"description": "Se requiere rol CPR o coordinador"},
        404: {"description": "Legajo o trabajo final inexistente"},
    },
)
async def consultar_trabajo_final(
    id: UUID,
    usuario: Usuario = Depends(require_role("cpr", "coordinador")),
    caso_de_uso: ConsultarTrabajoFinal = Depends(obtener_consultar_trabajo_final),
):
    """Devuelve el trabajo final del legajo para los roles autorizados."""
    try:
        return await caso_de_uso.ejecutar(id, usuario_rol=usuario.rol)
    except AccesoDenegado as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except (LegajoNoEncontrado, TrabajoFinalNoEncontrado) as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


async def obtener_registrar_trabajo_final(
    db: AsyncSession = Depends(get_db),
) -> RegistrarTrabajoFinal:
    """Conecta el caso de uso con el repositorio y la sesión compartida."""
    return RegistrarTrabajoFinal(TrabajoFinalRepository(db))


@router.post(
    "/legajos/{id}/trabajo-final",
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


async def obtener_modificar_trabajo_final(
    db: AsyncSession = Depends(get_db),
) -> ModificarTrabajoFinal:
    """Reutiliza la sesión compartida para la operación completa."""
    return ModificarTrabajoFinal(TrabajoFinalRepository(db))


@router.patch(
    "/trabajos-finales/{id}", response_model=TrabajoFinalResponse,
    responses={401: {"description": "Sesión inválida o vencida"},
               403: {"description": "Se requiere rol CPR"},
               404: {"description": "Trabajo final inexistente"},
               409: {"description": "Conflicto de integridad"}},
)
async def modificar_trabajo_final(
    id: UUID, datos: ActualizarTrabajoFinalRequest,
    usuario: Usuario = Depends(get_current_user),
    caso_de_uso: ModificarTrabajoFinal = Depends(obtener_modificar_trabajo_final),
):
    """La autorización de CPR se realiza en el caso de uso y registra el rechazo."""
    try:
        return await caso_de_uso.ejecutar(
            id, datos.model_dump(exclude_unset=True),
            usuario_id=usuario.id, usuario_rol=usuario.rol,
        )
    except AccesoDenegado as error:
        raise HTTPException(status_code=403, detail=str(error)) from error
    except TrabajoFinalNoEncontrado as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ActualizacionInvalida as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except (IntegridadTrabajoFinal, TrabajoFinalDuplicado) as error:
        raise HTTPException(status_code=409, detail="No se pudo modificar el trabajo final por un conflicto de integridad") from error
