import hashlib
from io import BytesIO
from uuid import uuid4

import pytest
from fastapi import HTTPException, UploadFile

from src.inscripcion.presentacion import rutas as inscripcion
from src.inscripcion.presentacion.rutas import validar_pdf

def crear_archivo(contenido: bytes, content_type: str = "application/pdf"):
    return UploadFile(
        filename="documento.pdf",
        file=BytesIO(contenido),
        headers={"content-type": content_type},
    )


@pytest.mark.anyio
async def test_validar_pdf_acepta_archivo_valido():
    contenido = b"%PDF-1.7\ncontenido de prueba"
    archivo = crear_archivo(contenido)

    resultado = await validar_pdf(archivo, "DNI")

    assert resultado == contenido


@pytest.mark.anyio
async def test_validar_pdf_rechaza_tipo_mime_incorrecto():
    archivo = crear_archivo(
        b"%PDF-1.7\ncontenido",
        "image/jpeg",
    )

    with pytest.raises(HTTPException) as error:
        await validar_pdf(archivo, "DNI")

    assert error.value.status_code == 422


@pytest.mark.anyio
async def test_validar_pdf_rechaza_contenido_que_no_es_pdf():
    archivo = crear_archivo(b"Esto no es un PDF")

    with pytest.raises(HTTPException) as error:
        await validar_pdf(archivo, "DNI")

    assert error.value.status_code == 422


@pytest.mark.anyio
async def test_validar_pdf_rechaza_archivo_mayor_a_5_mb():
    contenido = b"%PDF-1.7\n" + b"A" * (5 * 1024 * 1024)
    archivo = crear_archivo(contenido)

    with pytest.raises(HTTPException) as error:
        await validar_pdf(archivo, "DNI")

    assert error.value.status_code == 422


@pytest.mark.anyio
async def test_validar_pdf_acepta_archivo_de_hasta_5_mb():
    contenido = b"%PDF-1.7\n" + b"A" * (5 * 1024 * 1024 - 9)
    archivo = crear_archivo(contenido)

    resultado = await validar_pdf(archivo, "DNI")

    assert len(resultado) == 5 * 1024 * 1024


@pytest.mark.anyio
async def test_validar_pdf_rechaza_documento_obligatorio_ausente():
    with pytest.raises(HTTPException) as error:
        await validar_pdf(None, "DNI")

    assert error.value.status_code == 422


@pytest.mark.anyio
async def test_validar_pdf_acepta_documento_opcional_ausente():
    resultado = await validar_pdf(
        None,
        "Título de posgrado",
        obligatorio=False,
    )

    assert resultado is None

def test_guardar_pdf_asocia_archivo_al_legajo(tmp_path, monkeypatch):
    monkeypatch.setattr(
        inscripcion,
        "CARPETA_DOCUMENTOS",
        tmp_path,
    )

    legajo_id = uuid4()
    contenido = b"%PDF-1.7\ncontenido de prueba"

    ruta, checksum = inscripcion.guardar_pdf(
        contenido,
        legajo_id,
        "DNI_PASAPORTE",
    )

    archivo = tmp_path / str(legajo_id) / ruta.split("\\")[-1]

    assert archivo.exists()
    assert archivo.read_bytes() == contenido
    assert str(legajo_id) in ruta
    assert checksum == hashlib.sha256(contenido).hexdigest()


def test_guardar_pdf_genera_nombres_unicos(tmp_path, monkeypatch):
    monkeypatch.setattr(
        inscripcion,
        "CARPETA_DOCUMENTOS",
        tmp_path,
    )

    legajo_id = uuid4()
    contenido = b"%PDF-1.7\ncontenido"

    ruta1, _ = inscripcion.guardar_pdf(
        contenido,
        legajo_id,
        "DNI_PASAPORTE",
    )

    ruta2, _ = inscripcion.guardar_pdf(
        contenido,
        legajo_id,
        "DNI_PASAPORTE",
    )

    assert ruta1 != ruta2

@pytest.mark.anyio
async def test_validar_pdf_acepta_documento_opcional_presente():
    contenido = b"%PDF-1.7\ncontenido de prueba"
    archivo = crear_archivo(contenido)

    resultado = await validar_pdf(
        archivo,
        "Título de posgrado",
        obligatorio=False
    )

    assert resultado == contenido

