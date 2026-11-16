"""Pruebas de US-C-001 sin servidor ni base de datos."""

from datetime import date, datetime, timezone
from types import SimpleNamespace
from uuid import UUID

import pytest
from pydantic import ValidationError

from src.seguimiento_graduacion.presentation.schemas import (
    CrearTrabajoFinalRequest,
    TrabajoFinalResponse,
)


@pytest.fixture
def datos_validos():
    """Cada prueba recibe un diccionario nuevo para no afectar a las demás."""
    return {
        "tipo": "TFI",
        "titulo": "Seguimiento de graduación",
        "director": "Ana Pérez",
        "fecha_cpr": "2026-11-09",
        "numero_resolucion": "123/26",
    }


@pytest.fixture
def datos_respuesta(datos_validos):
    return datos_validos | {
        "id": UUID("11111111-1111-4111-8111-111111111111"),
        "legajo_id": UUID("22222222-2222-4222-8222-222222222222"),
        "creado_por": "cpr@example.com",
        "created_at": datetime(2026, 11, 9, 12, tzinfo=timezone.utc),
    }


def comprobar_error(datos, campo, tipo_error, schema=CrearTrabajoFinalRequest):
    """Comprueba que el rechazo corresponde al campo y motivo esperados."""
    with pytest.raises(ValidationError) as error:
        schema.model_validate(datos)
    assert any(
        detalle["loc"] == (campo,) and detalle["type"] == tipo_error
        for detalle in error.value.errors()
    )


@pytest.mark.parametrize("tipo", ["TFI", "Maestria", "Doctorado"])
def test_creacion_valida(datos_validos, tipo):
    trabajo = CrearTrabajoFinalRequest(**(datos_validos | {"tipo": tipo}))
    assert trabajo.tipo == tipo
    assert trabajo.titulo == datos_validos["titulo"]
    assert trabajo.director == datos_validos["director"]
    assert trabajo.numero_resolucion == datos_validos["numero_resolucion"]
    assert trabajo.fecha_cpr == date(2026, 11, 9)


@pytest.mark.parametrize("campo", ["tipo", "titulo", "director", "fecha_cpr", "numero_resolucion"])
def test_campos_obligatorios(datos_validos, campo):
    datos_validos.pop(campo)
    comprobar_error(datos_validos, campo, "missing")


@pytest.mark.parametrize("tipo", ["Tesis", "Otro", "", None])
def test_tipo_invalido(datos_validos, tipo):
    comprobar_error(datos_validos | {"tipo": tipo}, "tipo", "literal_error")


@pytest.mark.parametrize(
    "campo,limite",
    [("titulo", 300), ("director", 150), ("codirector", 150), ("numero_resolucion", 50)],
)
def test_limites_de_longitud(datos_validos, campo, limite):
    for longitud in (1, limite):
        trabajo = CrearTrabajoFinalRequest(**(datos_validos | {campo: "a" * longitud}))
        assert getattr(trabajo, campo) == "a" * longitud
    comprobar_error(datos_validos | {campo: "a" * (limite + 1)}, campo, "string_too_long")


@pytest.mark.parametrize("campo", ["titulo", "director", "codirector", "numero_resolucion"])
@pytest.mark.parametrize("valor", ["", "   ", "\t\n"])
def test_textos_vacios_rechazados(datos_validos, campo, valor):
    comprobar_error(datos_validos | {campo: valor}, campo, "string_too_short")


@pytest.mark.parametrize("campo", ["titulo", "director", "codirector", "numero_resolucion"])
def test_elimina_espacios_exteriores(datos_validos, campo):
    trabajo = CrearTrabajoFinalRequest(**(datos_validos | {campo: "  Texto válido  "}))
    assert getattr(trabajo, campo) == "Texto válido"


def test_codirector_opcional(datos_validos):
    assert CrearTrabajoFinalRequest(**datos_validos).codirector is None
    assert CrearTrabajoFinalRequest(**datos_validos, codirector=None).codirector is None
    assert CrearTrabajoFinalRequest(**datos_validos, codirector="Juan").codirector == "Juan"


@pytest.mark.parametrize("campo", ["titulo", "director", "numero_resolucion"])
def test_textos_obligatorios_no_aceptan_null(datos_validos, campo):
    comprobar_error(datos_validos | {campo: None}, campo, "string_type")


def test_fecha_invalida(datos_validos):
    comprobar_error(datos_validos | {"fecha_cpr": "2026-02-30"}, "fecha_cpr", "date_from_datetime_parsing")


def test_fecha_obligatoria_no_acepta_null(datos_validos):
    comprobar_error(datos_validos | {"fecha_cpr": None}, "fecha_cpr", "date_type")


def test_respuesta_desde_atributos(datos_respuesta):
    objeto = SimpleNamespace(**(datos_respuesta | {"fecha_cpr": date(2026, 11, 9)}))
    respuesta = TrabajoFinalResponse.model_validate(objeto)
    for campo, valor in vars(objeto).items():
        assert getattr(respuesta, campo) == valor
    assert respuesta.codirector is None


def test_respuesta_desde_diccionario(datos_respuesta):
    respuesta = TrabajoFinalResponse.model_validate(datos_respuesta)
    assert respuesta.id == datos_respuesta["id"]
    assert respuesta.legajo_id == datos_respuesta["legajo_id"]
    assert respuesta.fecha_cpr == date(2026, 11, 9)


@pytest.mark.parametrize("campo", ["id", "legajo_id", "creado_por", "created_at"])
def test_campos_adicionales_respuesta_obligatorios(datos_respuesta, campo):
    datos_respuesta.pop(campo)
    comprobar_error(datos_respuesta, campo, "missing", TrabajoFinalResponse)


@pytest.mark.parametrize("campo", ["id", "legajo_id"])
def test_respuesta_rechaza_uuid_invalido(datos_respuesta, campo):
    comprobar_error(datos_respuesta | {campo: "invalido"}, campo, "uuid_parsing", TrabajoFinalResponse)


def test_respuesta_conserva_validaciones_de_entrada(datos_respuesta):
    comprobar_error(datos_respuesta | {"titulo": ""}, "titulo", "string_too_short", TrabajoFinalResponse)
