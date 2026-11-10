# Define los datos de entrada y salida de la configuración pública.

from pydantic import BaseModel


class ConfiguracionSeccionRespuesta(BaseModel):
    seccion: str
    valores: dict[str, str]


class ConfiguracionSeccionModificar(BaseModel):
    valores: dict[str, str]