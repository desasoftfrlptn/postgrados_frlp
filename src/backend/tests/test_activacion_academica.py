from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException
from src.usuarios.acceso import crear_token_activacion, leer_token_activacion, validar_credencial_activacion
from src.usuarios.servicio import crear_token, obtener_usuario_actual
from src.usuarios.cuentas_academicas import obtener_legajo_matriculado
from src.usuarios.esquemas import UsuarioCrear
from pydantic import ValidationError


def test_no_se_puede_crear_aspirante():
    with pytest.raises(ValidationError):
        UsuarioCrear(nombre="A", apellido="B", dni="12345678", correo_electronico="a@example.com", tipo_usuario="ASPIRANTE")


def test_enlace_caduca_si_cambia_hash():
    u = SimpleNamespace(id=uuid4(), correo_electronico="a@example.com", contrasena_hash="hash", activo=True, debe_cambiar_contrasena=True)
    datos = leer_token_activacion(crear_token_activacion(u))
    validar_credencial_activacion(u, datos)
    u.contrasena_hash = "nuevo"
    with pytest.raises(HTTPException):
        validar_credencial_activacion(u, datos)


def test_token_sesion_no_activa():
    with pytest.raises(HTTPException):
        leer_token_activacion(crear_token(uuid4(), "ALUMNO"))


def test_token_activacion_no_autentica():
    import asyncio
    u = SimpleNamespace(id=uuid4(), correo_electronico="a@example.com", contrasena_hash="hash")
    db = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        asyncio.run(obtener_usuario_actual(crear_token_activacion(u), db))
    assert exc.value.status_code == 401
    db.scalar.assert_not_awaited()


def test_legajo_no_habilitado():
    import asyncio
    db = AsyncMock()
    db.scalar.return_value = None
    with pytest.raises(HTTPException) as exc:
        asyncio.run(obtener_legajo_matriculado(db, uuid4()))
    assert exc.value.status_code == 422


def test_recuperacion_no_es_activacion_y_admite_cuenta_ya_activada():
    from src.usuarios.acceso import FINALIDAD_RECUPERACION
    u = SimpleNamespace(id=uuid4(), correo_electronico="a@example.com", contrasena_hash="hash", activo=True, debe_cambiar_contrasena=False)
    token = crear_token_activacion(u, FINALIDAD_RECUPERACION)
    with pytest.raises(HTTPException):
        leer_token_activacion(token)
    datos = leer_token_activacion(token, FINALIDAD_RECUPERACION)
    validar_credencial_activacion(u, datos)
    u.contrasena_hash = "otro"
    with pytest.raises(HTTPException):
        validar_credencial_activacion(u, datos)


@pytest.mark.parametrize("recuperacion", [False, True])
def test_enlace_consumido_no_se_puede_validar_ni_reutilizar(recuperacion):
    import asyncio
    from src.usuarios.acceso import activar_cuenta, obtener_usuario_enlace, FINALIDAD, FINALIDAD_RECUPERACION
    from src.usuarios.seguridad import hash_password
    finalidad = FINALIDAD_RECUPERACION if recuperacion else FINALIDAD
    u = SimpleNamespace(id=uuid4(), correo_electronico="a@example.com",
                        contrasena_hash=hash_password("clave-anterior"), activo=True,
                        debe_cambiar_contrasena=not recuperacion, rol_id=uuid4())
    db = AsyncMock()
    db.scalar.return_value = u
    db.get.return_value = SimpleNamespace(nombre="DOCENTE")
    token = crear_token_activacion(u, finalidad)
    async def comprobar():
        await obtener_usuario_enlace(token, db, finalidad)
        await activar_cuenta(token, "clave-nueva", "clave-nueva", db, finalidad)
        hash_nuevo = u.contrasena_hash
        with pytest.raises(HTTPException):
            await obtener_usuario_enlace(token, db, finalidad)
        with pytest.raises(HTTPException):
            await activar_cuenta(token, "otra-clave", "otra-clave", db, finalidad)
        assert u.contrasena_hash == hash_nuevo
        db.commit.assert_awaited_once()
    asyncio.run(comprobar())
