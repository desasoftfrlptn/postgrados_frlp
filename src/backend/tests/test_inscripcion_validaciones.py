
from uuid import uuid4

import pytest
from pydantic import ValidationError

from src.inscripcion.presentacion.esquemas import LegajoCrear


def datos_legajo():
    return {
        "cohorte_id": uuid4(),
        "carrera_elegida": "Ingeniería",
        "apellido": "García",
        "nombre": "Matías",
        "nacionalidad": "Argentina",
        "dni_pasaporte": "12345678",
        "correo_electronico": "matias@example.com",
        "telefono_movil": "2215551234",
        "correo_alternativo": None,
        "domicilio": "Calle 1 123",
        "pais": "Argentina",
        "provincia": "Buenos Aires",
        "ciudad": "La Plata",
        "titulo_anterior": "Ingeniero",
        "universidad_anterior": "UTN",
        "forma_conocio_ofertas": "Internet",
        "motivos_cursar": "Me interesa realizar esta formación.",
        "solicitud_beca": None,
    }


def test_legajo_acepta_datos_validos():
    legajo = LegajoCrear(**datos_legajo())

    assert legajo.nombre == "Matías"
    assert legajo.dni_pasaporte == "12345678"


@pytest.mark.parametrize(
    "campo",
    [
        "carrera_elegida",
        "apellido",
        "nombre",
        "nacionalidad",
        "dni_pasaporte",
        "correo_electronico",
        "telefono_movil",
        "domicilio",
        "pais",
        "provincia",
        "ciudad",
        "titulo_anterior",
        "universidad_anterior",
        "forma_conocio_ofertas",
        "motivos_cursar",
    ],
)
def test_legajo_rechaza_campos_vacios(campo):
    datos = datos_legajo()
    datos[campo] = "   "

    with pytest.raises(ValidationError):
        LegajoCrear(**datos)


def test_legajo_elimina_espacios_en_extremos():
    datos = datos_legajo()
    datos["nombre"] = "  Matías  "
    datos["apellido"] = "  García  "

    legajo = LegajoCrear(**datos)

    assert legajo.nombre == "Matías"
    assert legajo.apellido == "García"


@pytest.mark.parametrize(
    "documento",
    ["1234567", "12345678"],
)
def test_legajo_acepta_documento_valido(documento):
    datos = datos_legajo()
    datos["dni_pasaporte"] = documento

    legajo = LegajoCrear(**datos)

    assert legajo.dni_pasaporte == documento


@pytest.mark.parametrize(
    "documento",
    [
        "123456",
        "123456789",
        "1234A678",
        "ABC12345",
        "",
    ],
)
def test_legajo_rechaza_documento_invalido(documento):
    datos = datos_legajo()
    datos["dni_pasaporte"] = documento

    with pytest.raises(ValidationError):
        LegajoCrear(**datos)


@pytest.mark.parametrize(
    "correo",
    [
        "correo-invalido",
        "correo@",
        "@example.com",
        "correo.example.com",
    ],
)
def test_legajo_rechaza_correo_invalido(correo):
    datos = datos_legajo()
    datos["correo_electronico"] = correo

    with pytest.raises(ValidationError):
        LegajoCrear(**datos)


def test_legajo_acepta_correo_alternativo_ausente():
    datos = datos_legajo()
    datos.pop("correo_alternativo")

    legajo = LegajoCrear(**datos)

    assert legajo.correo_alternativo is None


def test_legajo_acepta_correo_alternativo_vacio():
    datos = datos_legajo()
    datos["correo_alternativo"] = "   "

    legajo = LegajoCrear(**datos)

    assert legajo.correo_alternativo is None


def test_legajo_rechaza_correo_alternativo_invalido():
    datos = datos_legajo()
    datos["correo_alternativo"] = "correo-invalido"

    with pytest.raises(ValidationError):
        LegajoCrear(**datos)
