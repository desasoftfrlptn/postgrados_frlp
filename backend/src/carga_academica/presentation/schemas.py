"""Forma de lo que entra y sale de la API de carga académica.

FastAPI usa estos modelos para validar los pedidos y las respuestas,
y para mostrar los ejemplos en Swagger (/docs).
"""

from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel


class SeminarioCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str = Field(min_length=1, max_length=150)
    codigo: str = Field(min_length=1, max_length=20)
    horas_catedra: int = Field(strict=True, ge=1, le=2_147_483_647)
    es_obligatorio: bool
    email_docente: EmailStr = Field(max_length=255)
    fecha_limite_notas: date | None = None


class SeminarioResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nombre: str
    codigo: str
    horas_catedra: int
    es_obligatorio: bool
    docente: str
    email_docente: str


class PaginaSeminarios(BaseModel):
    data: list[SeminarioResumen]
    has_more: bool


# ---------- Planilla (US-B-003) ----------

class AlumnoPlanilla(BaseModel):
    """Una fila de la planilla: un alumno con su asistencia."""

    legajo_id: UUID
    apellido: str
    nombre: str
    email: str
    carrera_grado: str
    asistencias: list[str]   # "P" o "A", una por fecha, en el mismo orden que `fechas`
    porcentaje: float        # % de asistencia, va en la última columna del Excel


class PlanillaResponse(BaseModel):
    """La planilla completa de un seminario."""

    seminario: str
    fechas: list[date]       # fechas de las clases: son los títulos de las columnas
    alumnos: list[AlumnoPlanilla]


# ---------- Clases y asistencias (US-B-002) ----------
# El front (modulo-docente/hooks/useAsistencia.ts) trabaja en camelCase.
# En Python seguimos usando snake_case y Pydantic traduce solo:
#   - alias_generator=to_camel -> seminario_id se ve como "seminarioId" en el JSON
#   - populate_by_name=True    -> igual podemos armarlos con los nombres de Python

class CamelModel(BaseModel):
    """Base para los schemas que se comparten con el front en camelCase."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ClaseCreate(CamelModel):
    """Lo que manda el front al apretar "Nueva clase"."""

    fecha: date              # por defecto el front manda la de hoy


class ClaseEstadoUpdate(CamelModel):
    dictada: bool


class RegistroAsistencia(CamelModel):
    """Una celda de la planilla: un alumno en una clase."""

    legajo_id: UUID
    presente: bool           # checkbox marcado = True (Presente), sin marcar = False (Ausente)


class ClaseResponse(CamelModel):
    """Una clase con la asistencia de todos los inscriptos (tipo `Clase` del front)."""

    id: UUID
    seminario_id: UUID
    fecha: date
    dictada: bool | None
    asistencias: list[RegistroAsistencia]


class AsistenciaUpdate(CamelModel):
    """Lo que manda el autosave cada vez que el docente toca un checkbox."""

    clase_id: UUID
    legajo_id: UUID
    presente: bool
