from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

Carrera = Literal["Especialización", "Maestría", "Doctorado"]
CanalDifusion = Literal["redes", "colegas", "web", "egresados", "otro"]
TipoBeca = Literal["30%", "100%"]


class InscripcionCreate(BaseModel):
    carreras: list[Carrera] = Field(min_length=1, max_length=2)
    dni: str = Field(pattern=r"^[0-9]{7,8}$", max_length=8)
    nombre: str = Field(min_length=1, max_length=120)
    apellido: str = Field(min_length=1, max_length=120)
    nacionalidad: str = Field(min_length=1, max_length=100)
    email: EmailStr
    email_alternativo: EmailStr
    telefono_movil: str = Field(min_length=1, max_length=40)
    telefono_fijo: str | None = Field(default=None, max_length=40)
    domicilio: str = Field(min_length=1, max_length=200)
    ciudad: str = Field(min_length=1, max_length=100)
    provincia: str = Field(min_length=1, max_length=100)
    pais: str = Field(min_length=1, max_length=100)
    titulo_grado: str = Field(min_length=1, max_length=200)
    titulo_posgrado: str | None = Field(default=None, max_length=200)
    como_conocio: CanalDifusion
    motivacion: str = Field(min_length=50, max_length=5000)
    solicita_beca: bool = False
    tipo_beca: TipoBeca | None = None

    @field_validator(
        "dni",
        "nombre",
        "apellido",
        "nacionalidad",
        "telefono_movil",
        "telefono_fijo",
        "domicilio",
        "ciudad",
        "provincia",
        "pais",
        "titulo_grado",
        "titulo_posgrado",
        "motivacion",
        mode="before",
    )
    @classmethod
    def strip_text(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None if value == "" or value.isspace() else stripped
        return value

    @field_validator("carreras")
    @classmethod
    def carreras_sin_duplicados(cls, value: list[Carrera]) -> list[Carrera]:
        if len(set(value)) != len(value):
            raise ValueError("No se puede seleccionar una carrera más de una vez")
        return value

    @field_validator("email", "email_alternativo", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("tipo_beca", mode="before")
    @classmethod
    def empty_beca_to_none(cls, value: object) -> object:
        return None if value == "" else value

    @model_validator(mode="after")
    def validate_beca(self) -> "InscripcionCreate":
        if self.solicita_beca and self.tipo_beca is None:
            raise ValueError("Debe seleccionar el porcentaje de beca solicitado")
        if not self.solicita_beca and self.tipo_beca is not None:
            raise ValueError("No puede indicar un tipo de beca si no la solicita")
        return self


class InscripcionResponse(BaseModel):
    codigo_seguimiento: str
    estado: str
    mensaje: str
