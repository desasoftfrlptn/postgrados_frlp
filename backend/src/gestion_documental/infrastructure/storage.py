"""Almacenamiento privado de documentos PDF."""

import asyncio
import hashlib
import io
import os
import uuid
import clamd
from pathlib import Path

import magic
from fastapi import HTTPException, UploadFile, status
from pypdf import PdfReader


MAX_FILE_SIZE = 5 * 1024 * 1024

# Directorio raíz privado. No debe estar dentro del frontend ni del webroot.
STORAGE_ROOT = Path(
    os.getenv("STORAGE_PATH", "/var/postgrado-storage")
)


def validar_estructura_pdf(contenido: bytes) -> None:
    """Comprueba que el archivo sea un PDF legible y no esté cifrado."""

    try:
        lector = PdfReader(io.BytesIO(contenido), strict=True)

        if lector.is_encrypted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se permiten archivos PDF protegidos con contraseña",
            )

        if len(lector.pages) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El PDF debe contener al menos una página",
            )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo PDF está dañado o no es válido",
        ) from exc


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

    validar_estructura_pdf(contenido)
    await asyncio.to_thread(analizar_con_antivirus, contenido)    # Evita conservar rutas proporcionadas por el nombre del archivo.
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

def analizar_con_antivirus(contenido: bytes) -> None:
    """Analiza el archivo con ClamAV. Bloquea la carga si no está disponible."""

    host = os.getenv("CLAMAV_HOST", "127.0.0.1")
    puerto = int(os.getenv("CLAMAV_PORT", "3310"))

    try:
        antivirus = clamd.ClamdNetworkSocket(
            host=host,
            port=puerto,
            timeout=10,
        )

        resultado = antivirus.instream(io.BytesIO(contenido))

        if not resultado:
            raise RuntimeError("ClamAV no devolvió un resultado")

        estado, detalle = next(iter(resultado.values()))

        if estado == "FOUND":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo fue rechazado porque contiene malware",
            )

        if estado != "OK":
            raise RuntimeError(f"Resultado inesperado de ClamAV: {detalle}")

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo verificar el archivo con el antivirus. Intentá nuevamente más tarde.",
        ) from exc