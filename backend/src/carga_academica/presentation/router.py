"""Endpoints de carga académica (capa PRESENTATION).

Es la única capa que sabe de HTTP: recibe el pedido, chequea el login y el rol,
llama al service y traduce sus errores a códigos (403, 404, 409, 422).

Los endpoints de US-B-002 siguen el contrato del front
(frontend/src/modulo-docente/hooks/useAsistencia.ts): JSON en camelCase.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.carga_academica.application.asistencia_service import (
    AlumnoNoInscripto,
    AsistenciaService,
    ClaseDuplicada,
    ClaseNoEncontrada,
)
from src.carga_academica.application.planilla_service import (
    PlanillaService,
    SeminarioNoEncontrado,
    SinPermisoPlanilla,
)
from src.carga_academica.infrastructure.asistencia_repository import AsistenciaRepository
from src.carga_academica.infrastructure.planilla_repository import PlanillaRepository
from src.carga_academica.presentation.schemas import (
    AsistenciaUpdate,
    ClaseCreate,
    ClaseResponse,
    PlanillaResponse,
)
from src.shared.auth.dependencies import require_role
from src.shared.auth.orm_models import Usuario
from src.shared.database.session import get_db

# Todas las rutas de este archivo empiezan con /seminarios.
# tags agrupa los endpoints bajo un título en Swagger.
router = APIRouter(prefix="/seminarios", tags=["Carga académica"])

# Quién puede usar estos endpoints. Después, el service chequea
# que el docente sea el de ESE seminario (BR-007).
rol_permitido = require_role("docente", "coordinador", "admin")


# ---------- Dependencias: arman la cadena sesión -> repository -> service ----------

def get_planilla_service(db: AsyncSession = Depends(get_db)) -> PlanillaService:
    return PlanillaService(PlanillaRepository(db))


def get_asistencia_service(db: AsyncSession = Depends(get_db)) -> AsistenciaService:
    return AsistenciaService(AsistenciaRepository(db))


# Los errores que comparten todos los endpoints del seminario
NO_ENCONTRADO = HTTPException(status.HTTP_404_NOT_FOUND, "Seminario no encontrado")
SIN_PERMISO = HTTPException(status.HTTP_403_FORBIDDEN, "Solo podés gestionar tus seminarios")


# ---------- US-B-003: planilla ----------

@router.get("/{seminario_id}/estudiantes", response_model=PlanillaResponse)
async def listar_estudiantes(
    seminario_id: UUID,
    usuario: Usuario = Depends(rol_permitido),
    service: PlanillaService = Depends(get_planilla_service),
):
    """Planilla de asistencia del seminario (US-B-003).

    El front la usa para mostrarla y para descargarla en Excel.
    Un docente solo puede ver la de sus seminarios (BR-007).
    """
    try:
        return await service.obtener_planilla(seminario_id, usuario)
    except SeminarioNoEncontrado:
        raise NO_ENCONTRADO
    except SinPermisoPlanilla:
        raise SIN_PERMISO


# ---------- US-B-002: clases ----------

@router.get("/{seminario_id}/clases", response_model=list[ClaseResponse])
async def listar_clases(
    seminario_id: UUID,
    usuario: Usuario = Depends(rol_permitido),
    service: AsistenciaService = Depends(get_asistencia_service),
):
    """Las clases del seminario con la asistencia de cada alumno (US-B-002)."""
    try:
        return await service.listar_clases(seminario_id, usuario)
    except SeminarioNoEncontrado:
        raise NO_ENCONTRADO
    except SinPermisoPlanilla:
        raise SIN_PERMISO


@router.post(
    "/{seminario_id}/clases",
    response_model=ClaseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_clase(
    seminario_id: UUID,
    datos: ClaseCreate,
    usuario: Usuario = Depends(rol_permitido),
    service: AsistenciaService = Depends(get_asistencia_service),
):
    """Botón "Nueva clase": agrega una columna con esa fecha (US-B-002)."""
    try:
        return await service.crear_clase(seminario_id, datos.fecha, usuario)
    except SeminarioNoEncontrado:
        raise NO_ENCONTRADO
    except SinPermisoPlanilla:
        raise SIN_PERMISO
    except ClaseDuplicada:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Ya hay una clase de este seminario en esa fecha"
        )


# ---------- US-B-002: asistencia (autosave) ----------

@router.patch("/{seminario_id}/asistencias", response_model=ClaseResponse)
async def cargar_asistencia(
    seminario_id: UUID,
    datos: AsistenciaUpdate,
    usuario: Usuario = Depends(rol_permitido),
    service: AsistenciaService = Depends(get_asistencia_service),
):
    """Guarda un checkbox (una celda) y devuelve la clase actualizada."""
    try:
        return await service.cargar_asistencia(
            seminario_id, datos.clase_id, datos.legajo_id, datos.presente, usuario
        )
    except SeminarioNoEncontrado:
        raise NO_ENCONTRADO
    except SinPermisoPlanilla:
        raise SIN_PERMISO
    except ClaseNoEncontrada:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "La clase no es de este seminario")
    except AlumnoNoInscripto:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "El alumno no está inscripto al seminario"
        )
