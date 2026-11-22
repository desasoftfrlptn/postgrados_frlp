"""Descarga de documentos privados, autorizada antes de acceder al archivo."""
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.compartido.conexion import get_db
from src.inscripcion.infraestructura.documentos_modelos import DocumentoLegajoORM
from src.inscripcion.infraestructura.orm_modelos import LegajoORM
from src.inscripcion.presentacion.rutas import CARPETA_DOCUMENTOS
from src.usuarios.rutas import usuario_actual

enrutador = APIRouter(prefix="/api/v1/documentos", tags=["Documentos"])


@enrutador.get("/{documento_id}/download")
async def descargar_documento(
    documento_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario=Depends(usuario_actual),
):
    rol = usuario.rol.nombre
    if rol != "COORDINADOR" or usuario.debe_cambiar_contrasena:
        raise HTTPException(status_code=403, detail="No tenés permiso para descargar documentos.")

    documento = await db.get(DocumentoLegajoORM, documento_id)
    if documento is None:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    legajo = await db.get(LegajoORM, documento.legajo_id)
    if legajo is None:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    ruta = Path(documento.path).resolve()
    # Compatibilidad con archivos anteriores: ya no se sirven por StaticFiles.
    raices = [CARPETA_DOCUMENTOS, Path("uploads/legajos")]
    permitida = any(
        ruta.is_relative_to((raiz / str(legajo.id)).resolve())
        for raiz in raices
    )
    if not permitida or not ruta.is_file():
        raise HTTPException(status_code=404, detail="Archivo no disponible.")

    return FileResponse(
        ruta,
        media_type="application/pdf",
        filename=f"documento-{documento.id}.pdf",
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )
