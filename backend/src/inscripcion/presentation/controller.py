"""Controller HTTP del recurso Legajos."""

from io import BytesIO
import os
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from openpyxl import Workbook

from app.inscripcion.application.service import LegajoService
from app.inscripcion.domain.exceptions import (
    AccesoDenegado,
    CohorteNoEncontrada,
    ConflictoLegajo,
    InscripcionCerrada,
    LegajoNoEncontrado,
    ReglaNegocioInvalida,
    TransicionNoPermitida,
)
from app.inscripcion.presentation.dependencies import get_legajo_service
from app.inscripcion.presentation.schemas import (
    CambioEstadoRequest,
    CrearLegajoRequest,
    LegajoPagina,
    LegajoResponse,
)
from app.shared.auth.dependencies import UsuarioActual, get_usuario_actual, require_role
from app.acceso.controllers.dependencies import require_tipo_enlace
from app.acceso.controllers.dependencies import get_acceso_service
from app.acceso.services.service import AccesoService, AccesoError

router = APIRouter(prefix="/legajos", tags=["Legajos"])


def _http_error(error: Exception) -> HTTPException:
    if isinstance(error, AccesoError):
        return HTTPException(status_code=429, detail=str(error))
    if isinstance(error, LegajoNoEncontrado):
        return HTTPException(status_code=404, detail=str(error))
    if isinstance(error, CohorteNoEncontrada):
        return HTTPException(status_code=404, detail=str(error))
    if isinstance(error, InscripcionCerrada):
        return HTTPException(status_code=409, detail=str(error))
    if isinstance(error, ConflictoLegajo):
        return HTTPException(status_code=409, detail={
            "error": "CONFLICT", "message": error.message, "field": error.field
        })
    if isinstance(error, AccesoDenegado):
        return HTTPException(status_code=403, detail=str(error))
    if isinstance(error, TransicionNoPermitida):
        return HTTPException(status_code=409, detail=str(error))
    if isinstance(error, ReglaNegocioInvalida):
        return HTTPException(status_code=422, detail=str(error))
    return HTTPException(status_code=500, detail="Error interno del módulo de legajos")


@router.post("", response_model=LegajoResponse, status_code=status.HTTP_201_CREATED)
async def crear(
    datos: CrearLegajoRequest,
    request: Request,
    service: LegajoService = Depends(get_legajo_service),
    acceso=Depends(require_tipo_enlace("INSCRIPCION")),
    acceso_service: AccesoService = Depends(get_acceso_service),
):
    try:
        await acceso_service.verificar_limite(request.client.host if request and request.client else "unknown", "crear_legajo")
        return await service.crear_legajo(datos.model_dump(), cohorte_autorizada=acceso["cohorte_id"])
    except (CohorteNoEncontrada, InscripcionCerrada, ConflictoLegajo, AccesoDenegado, AccesoError) as error:
        raise _http_error(error) from error


@router.get("/exportar")
async def exportar(
    estado: str | None = None,
    cohorte_id: UUID | None = None,
    tipo_carrera: str | None = None,
    solicita_beca: bool | None = None,
    dni: str | None = None,
    apellido: str | None = None,
    service: LegajoService = Depends(get_legajo_service),
    _: UsuarioActual = Depends(require_role("COORDINADOR")),
):
    filtros = {
        "estado": estado, "cohorte_id": cohorte_id,
        "tipo_carrera": tipo_carrera, "solicita_beca": solicita_beca,
        "dni": dni, "apellido": apellido,
    }
    resultado = await service.listar_legajos(page=1, limit=500, filtros=filtros)
    wb = Workbook()
    ws = wb.active
    ws.title = "Legajos"
    ws.append(["N° Legajo", "Apellido", "Nombre", "DNI", "Email", "Estado", "Cohorte", "Carrera", "Solicita beca"])
    for item in resultado["data"]:
        ws.append([
            item.numero_legajo, item.apellido, item.nombre, item.dni,
            item.email, item.estado, str(item.cohorte_id), item.carrera_elegida,
            "Sí" if item.solicita_beca else "No",
        ])
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    for columna in ws.columns:
        letra = columna[0].column_letter
        ws.column_dimensions[letra].width = min(
            max(max(len(str(celda.value or "")) for celda in columna) + 2, 12), 35
        )
    archivo = BytesIO()
    wb.save(archivo)
    archivo.seek(0)
    return StreamingResponse(
        archivo,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="legajos.xlsx"'},
    )


@router.get("", response_model=LegajoPagina)
async def listar(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    estado: str | None = None,
    cohorte_id: UUID | None = None,
    tipo_carrera: str | None = None,
    solicita_beca: bool | None = None,
    dni: str | None = None,
    apellido: str | None = Query(None, min_length=3),
    service: LegajoService = Depends(get_legajo_service),
    _: UsuarioActual = Depends(require_role("COORDINADOR")),
):
    filtros = {
        "estado": estado, "cohorte_id": cohorte_id,
        "tipo_carrera": tipo_carrera, "solicita_beca": solicita_beca,
        "dni": dni, "apellido": apellido,
    }
    return await service.listar_legajos(page=page, limit=limit, filtros=filtros)


@router.get("/{legajo_id}", response_model=LegajoResponse)
async def detalle(
    legajo_id: UUID,
    service: LegajoService = Depends(get_legajo_service),
    usuario: UsuarioActual = Depends(get_usuario_actual),
):
    try:
        return await service.obtener_legajo(
            legajo_id, usuario_email=usuario.email, usuario_rol=usuario.rol, usuario_id=usuario.usuario_id
        )
    except (LegajoNoEncontrado, AccesoDenegado) as error:
        raise _http_error(error) from error


@router.patch("/{legajo_id}/estado")
async def actualizar_estado(
    legajo_id: UUID,
    datos: CambioEstadoRequest,
    service: LegajoService = Depends(get_legajo_service),
    usuario: UsuarioActual = Depends(get_usuario_actual),
):
    try:
        legajo, token_activacion = await service.cambiar_estado(
            legajo_id,
            nuevo_estado=datos.estado,
            comentario=datos.comentario,
            usuario_email=usuario.email,
            usuario_rol=usuario.rol,
        )
        resultado = LegajoResponse.model_validate(legajo).model_dump(mode="json")
        """IMPORTANTE: falta implementar en el frontend la activación de una cuenta"""
        if token_activacion:
            resultado["url_activacion"] = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173').rstrip('/')}/activar-cuenta?token={token_activacion}"
        return resultado
    except (
        LegajoNoEncontrado, AccesoDenegado, TransicionNoPermitida,
        ReglaNegocioInvalida, ConflictoLegajo,
    ) as error:
        raise _http_error(error) from error
