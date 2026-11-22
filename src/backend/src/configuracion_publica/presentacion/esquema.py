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