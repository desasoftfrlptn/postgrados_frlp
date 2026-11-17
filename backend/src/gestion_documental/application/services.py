
"""Servicios de aplicación para la gestión documental."""

import asyncio
from pathlib import Path
import uuid

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.gestion_documental.infrastructure.orm_models import (
    Documento,
    TIPOS_DOCUMENTO,
)
from src.gestion_documental.infrastructure.storage import (
    STORAGE_ROOT,
    guardar_pdf,
)
from src.inscripcion.infrastructure.orm_models import Legajo


async def obtener_documento_para_descarga(
    db: AsyncSession,
    documento_id: uuid.UUID,
) -> tuple[Documento, Path]:
    """Busca un documento y obtiene la ruta segura de su PDF."""

    documento = await db.get(Documento, documento_id)

    if documento is None:
        raise HTTPException(404, "No se encontró el documento")

    ruta_archivo = (STORAGE_ROOT / documento.path_storage).resolve()
    raiz_storage = STORAGE_ROOT.resolve()

    if not ruta_archivo.is_relative_to(raiz_storage):
        raise HTTPException(404, "No se encontró el documento")

    if not ruta_archivo.is_file():
        raise HTTPException(404, "El archivo no está disponible")

    return documento, ruta_archivo

async def guardar_documento(
    db: AsyncSession,
    legajo_id: uuid.UUID,
    tipo: str,
    archivo: UploadFile,
) -> Documento:
    """Valida, almacena y registra un documento PDF para un legajo."""

    # 1. Verificar que el legajo exista.
    legajo = await db.get(Legajo, legajo_id)

    if legajo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el legajo",
        )

    # 2. Validar el tipo de documento.
    if tipo not in TIPOS_DOCUMENTO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El tipo de documento no es válido",
        )

    # 3. La constancia de beca solo corresponde si se solicitó una.
    if tipo == "FORM_BECA" and not legajo.solicita_beca:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El legajo no solicita beca",
        )

    # 4. Guardar el PDF en el almacenamiento privado.
    (
        path_storage,
        checksum,
        tamanio,
        nombre_original,
    ) = await guardar_pdf(
        archivo=archivo,
        cohorte_id=legajo.cohorte_id,
        legajo_id=legajo.id,
    )

    # 5. Registrar los metadatos en la base de datos.
    documento = Documento(
        legajo_id=legajo.id,
        tipo=tipo,
        path_storage=path_storage,
        nombre_original=nombre_original,
        checksum_sha256=checksum,
        tamanio_bytes=tamanio,
    )

    try:
        db.add(documento)
        await db.commit()

    except Exception:
        await db.rollback()

        # Si falla la transacción, eliminamos el PDF para no dejar
        # un archivo almacenado sin su registro correspondiente.
        ruta_archivo = STORAGE_ROOT / Path(path_storage)

        try:
            await asyncio.to_thread(ruta_archivo.unlink, missing_ok=True)
        except OSError:
            # No ocultamos el error original de la base de datos.
            pass

        raise

    await db.refresh(documento)

    return documento
