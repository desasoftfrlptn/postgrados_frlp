from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.compartido.conexion import get_db
from src.conduccion.esquemas import (
    AccionLegajoPeticion,
    VerificacionLegajoPeticion,
)
from src.conduccion import servicio
from src.usuarios.rutas import usuario_actual

enrutador = APIRouter(
    prefix="/api/v1/conduccion",
    tags=["Equipo de conducción"],
)

async def coordinador_actual(
    usuario=Depends(usuario_actual),
):
    if (
        not usuario.activo
        or usuario.rol is None
        or usuario.rol.nombre != "COORDINADOR"
    ):
        raise HTTPException(
            status_code=403,
            detail="Se requieren permisos de coordinador.",
        )

    return usuario

@enrutador.get("/legajos/{legajo_id}/gestion")
async def obtener_gestion(
    legajo_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario=Depends(coordinador_actual),
):
    return await servicio.consultar_gestion(
        db,
        legajo_id,
        usuario,
    )

@enrutador.put("/legajos/{legajo_id}/verificacion")
async def verificar_legajo(
    legajo_id: UUID,
    datos: VerificacionLegajoPeticion,
    db: AsyncSession = Depends(get_db),
    usuario=Depends(coordinador_actual),
):
    return await servicio.ejecutar_transaccion(
        db,
        lambda: servicio.guardar_verificacion(
            db,
            legajo_id,
            datos,
            usuario,
        ),
    )

@enrutador.get("/legajos/{legajo_id}/completitud")
async def obtener_completitud(
    legajo_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario=Depends(coordinador_actual),
):
    return await servicio.consultar_completitud(
        db,
        legajo_id,
        usuario,
    )


@enrutador.post("/legajos/{legajo_id}/acciones")
async def realizar_accion(
    legajo_id: UUID,
    datos: AccionLegajoPeticion,
    db: AsyncSession = Depends(get_db),
    usuario=Depends(coordinador_actual),
):
    return await servicio.ejecutar_transaccion(
        db,
        lambda: servicio.aplicar_accion(
            db,
            legajo_id,
            datos,
            usuario,
        ),
    )

@enrutador.get("/legajos/{legajo_id}/auditoria")
async def obtener_auditoria(
    legajo_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario=Depends(coordinador_actual),
):
    return await servicio.consultar_auditoria(
        db,
        legajo_id,
        usuario,
    )

@enrutador.post("/reservas/procesar-vencimientos")
async def procesar_vencimientos(
    db: AsyncSession = Depends(get_db),
    usuario=Depends(coordinador_actual),
):
    
    return await servicio.ejecutar_transaccion(
        db,
        lambda: servicio.vencer_reservas(db),
    )