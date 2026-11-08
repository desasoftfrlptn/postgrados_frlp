
"""Almacenamiento privado de documentos PDF."""

import asyncio
import hashlib
import os
import uuid
from pathlib import Path

import magic
from fastapi import HTTPException, UploadFile, status


MAX_FILE_SIZE = 5 * 1024 * 1024

# Directorio raíz privado. No debe estar dentro del frontend ni del webroot.
STORAGE_ROOT = Path(
    os.getenv("STORAGE_PATH", "/var/postgrado-storage")
)


async def guardar_pdf(
    archivo: UploadFile,
    cohorte_id: uuid.UUID,
    legajo_id: uuid.UUID,
) -> tuple[str, str, int, str]:
    """
    Valida y guarda un PDF en almacenamiento privado.

    Retorna:
        path_storage: ruta relativa al directorio de almacenamiento.
        checksum_sha256: hash SHA-256 del contenido.
        tamanio_bytes: tamaño del archivo.
        nombre_original: nombre original saneado.
    """

    contenido = await archivo.read(MAX_FILE_SIZE + 1)

    if not contenido:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo está vacío",
        )

    if len(contenido) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="El archivo supera el límite de 5 MB",
        )

    tipo_real = magic.from_buffer(contenido[:2048], mime=True)

    if tipo_real != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un PDF válido",
        )

    # Evita conservar rutas proporcionadas por el nombre del archivo.
    nombre_original = Path(
        (archivo.filename or "documento.pdf").replace("\\", "/")
    ).name[:255]

    nombre_archivo = f"{uuid.uuid4()}.pdf"

    ruta_relativa = (
        Path("uploads")
        / str(cohorte_id)
        / str(legajo_id)
        / nombre_archivo
    )

    ruta_absoluta = STORAGE_ROOT / ruta_relativa

    try:
        ruta_absoluta.parent.mkdir(parents=True, exist_ok=True)

        # La escritura se ejecuta fuera del hilo del event loop.
        await asyncio.to_thread(ruta_absoluta.write_bytes, contenido)

    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar el documento",
        ) from exc

    checksum = hashlib.sha256(contenido).hexdigest()

    return (
        ruta_relativa.as_posix(),
        checksum,
        len(contenido),
        nombre_original,
    )
