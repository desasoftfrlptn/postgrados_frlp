##aceptación de credenciales válidas, rechazo de entradas
##incorrectas y manejo de caracteres Unicode

import bcrypt
import pytest

from src.shared.auth.passwords import verificar_contrasena


@pytest.fixture(scope="module")
def password_hash():
    return bcrypt.hashpw(
        b"PruebaLocal123!",
        bcrypt.gensalt(rounds=12),
    ).decode("utf-8")


@pytest.mark.parametrize(
    ("contrasena", "resultado_esperado"),
    [
        ("PruebaLocal123!", True),
        ("Incorrecta", False),
        ("", False),
    ],
)
def test_verificar_credenciales(
    password_hash,
    contrasena,
    resultado_esperado,
):
    resultado = verificar_contrasena(contrasena, password_hash)

    assert resultado is resultado_esperado


@pytest.mark.parametrize(
    "hash_invalido",
    ["", "hash-invalido", "$2b$12$incompleto"],
)
def test_rechazar_hash_invalido(hash_invalido):
    resultado = verificar_contrasena("PruebaLocal123!", hash_invalido)

    assert resultado is False


def test_rechazar_contrasena_mayor_a_72_bytes(password_hash):
    contrasena = "a" * 73

    resultado = verificar_contrasena(contrasena, password_hash)

    assert resultado is False


def test_aceptar_contrasena_con_caracteres_unicode():
    contrasena = "ContraseñaÁrbol123!"
    password_hash = bcrypt.hashpw(
        contrasena.encode("utf-8"),
        bcrypt.gensalt(rounds=12),
    ).decode("utf-8")

    resultado = verificar_contrasena(contrasena, password_hash)

    assert resultado is True