from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)


class ConfiguracionSeccionRespuesta(BaseModel):
    seccion: str
    valores: dict[str, str]


class ConfiguracionSeccionModificar(BaseModel):
    valores: dict[str, str]


class ConsultaContactoCrear(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    nombre: str = Field(min_length=2, max_length=120)
    email: EmailStr
    asunto: str = Field(min_length=3, max_length=150)
    mensaje: str = Field(min_length=10, max_length=3000)


class ConsultaContactoRespuesta(BaseModel):
    mensaje: str

class PreguntaFrecuenteCrear(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    categoria: str = Field(min_length=1, max_length=100)
    pregunta: str = Field(min_length=5, max_length=300)
    respuesta: str = Field(min_length=5, max_length=10000)
    orden: int = Field(ge=1, le=9999)
    activa: bool = True


class PreguntaFrecuenteRespuesta(PreguntaFrecuenteCrear):
    model_config = ConfigDict(from_attributes=True)

    id: UUID


class PreguntaFrecuenteEstado(BaseModel):
    model_config = ConfigDict(extra="forbid")

    activa: bool
