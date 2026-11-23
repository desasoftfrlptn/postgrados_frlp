"""Validación de los datos editables; nunca incluye identidad o rol."""
import base64
import binascii
import re
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_validator

MAX_FOTO = 2 * 1024 * 1024


class DatosPerfil(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    nacionalidad: str = Field(default="", max_length=100)
    correo_alternativo: EmailStr | None = None
    telefono_movil: str = Field(default="", max_length=30)
    domicilio: str = Field(default="", max_length=255)
    pais: str = Field(default="", max_length=100)
    provincia: str = Field(default="", max_length=200)
    ciudad: str = Field(default="", max_length=200)
    notificaciones_automaticas: bool = True

    @field_validator("telefono_movil")
    @classmethod
    def validar_telefono(cls, valor):
        normalizado = re.sub(r"[\s()-]", "", valor)
        if normalizado and not re.fullmatch(r"\+?\d{7,15}", normalizado):
            raise ValueError("Ingresá un teléfono válido de 7 a 15 dígitos.")
        return normalizado

    @field_validator("correo_alternativo")
    @classmethod
    def longitud_correo(cls, valor):
        if valor and len(valor) > 255:
            raise ValueError("El correo alternativo es demasiado largo.")
        return valor


def validar_foto(valor):
    if valor is None:
        return None
    cabecera, separador, datos = valor.partition(",")
    formatos = {"data:image/jpeg;base64", "data:image/png;base64", "data:image/webp;base64"}
    if not separador or cabecera not in formatos or len(datos) > 4 * ((MAX_FOTO + 2) // 3):
        raise ValueError("Seleccioná una imagen JPG, PNG o WebP de hasta 2 MB.")
    try:
        contenido = base64.b64decode(datos, validate=True)
    except (ValueError, binascii.Error):
        raise ValueError("La imagen no tiene una codificación válida.") from None
    valido = (
        cabecera == "data:image/jpeg;base64" and contenido.startswith(b"\xff\xd8\xff") and contenido.endswith(b"\xff\xd9")
        or cabecera == "data:image/png;base64" and contenido.startswith(b"\x89PNG\r\n\x1a\n") and contenido.endswith(b"IEND\xaeB`\x82")
        or cabecera == "data:image/webp;base64" and len(contenido) >= 12 and contenido[:4] == b"RIFF" and contenido[8:12] == b"WEBP"
        and int.from_bytes(contenido[4:8], "little") + 8 == len(contenido)
    )
    if len(contenido) > MAX_FOTO or not valido:
        raise ValueError("El contenido de la imagen no corresponde al formato indicado.")
    return valor


class ModificacionPerfil(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=0)
    datos: DatosPerfil | None = None
    foto: str | None = Field(default=None, max_length=4 * ((MAX_FOTO + 2) // 3) + 32)

    @field_validator("foto")
    @classmethod
    def comprobar_foto(cls, valor):
        return validar_foto(valor)
