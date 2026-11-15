##recuperar el ID de un token válido y que se rechacen los tokens vencidos

import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest

from src.shared.auth.jwt import crear_token_acceso, obtener_id_usuario


@pytest.fixture
def secreto_jwt(monkeypatch):
    secreto = secrets.token_hex(32)
    monkeypatch.setenv("JWT_SECRET", secreto)
    monkeypatch.setenv("JWT_EXPIRATION", "8h")
    return secreto


@pytest.fixture
def datos_token():
    return {
        "sub": str(uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        "tipo": "access",
    }


def test_token_valido_recupera_id_del_usuario(secreto_jwt):
    usuario_id = uuid4()
    token = crear_token_acceso(usuario_id)

    assert obtener_id_usuario(token) == usuario_id


def test_rechaza_token_firmado_con_otra_clave(secreto_jwt, datos_token):
    token = jwt.encode(datos_token, secrets.token_hex(32), algorithm="HS256")

    with pytest.raises(jwt.InvalidSignatureError):
        obtener_id_usuario(token)


def test_rechaza_token_vencido(secreto_jwt, datos_token):
    datos_token["exp"] = datetime.now(timezone.utc) - timedelta(minutes=1)
    token = jwt.encode(datos_token, secreto_jwt, algorithm="HS256")

    with pytest.raises(jwt.ExpiredSignatureError):
        obtener_id_usuario(token)


@pytest.mark.parametrize("campo", ["sub", "exp", "tipo"])
def test_rechaza_token_sin_dato_obligatorio(secreto_jwt, datos_token, campo):
    del datos_token[campo]
    token = jwt.encode(datos_token, secreto_jwt, algorithm="HS256")

    with pytest.raises(jwt.MissingRequiredClaimError):
        obtener_id_usuario(token)


@pytest.mark.parametrize(
    ("campo", "valor"),
    [("tipo", "refresh"), ("sub", "id-invalido")],
)
def test_rechaza_token_con_dato_invalido(secreto_jwt, datos_token, campo, valor):
    datos_token[campo] = valor
    token = jwt.encode(datos_token, secreto_jwt, algorithm="HS256")

    with pytest.raises(jwt.InvalidTokenError):
        obtener_id_usuario(token)