from datetime import datetime, timezone
from uuid import uuid4
import pytest
from fastapi import HTTPException
from jose import jwt
from src.usuarios import servicio as s

def test_token_contiene_identidad_rol_y_vencimiento():
    usuario_id = uuid4()
    antes = datetime.now(timezone.utc).timestamp()

    token = s.crear_token(usuario_id, "DOCENTE")

    despues = datetime.now(timezone.utc).timestamp()
    contenido = jwt.decode(
        token,
        s.SECRET_KEY,
        algorithms=[s.ALGORITHM],
    )

    assert contenido["sub"] == str(usuario_id)
    assert contenido["tipo_usuario"] == "DOCENTE"

    duracion = s.EXPIRACION_MINUTOS * 60

    assert (
        antes + duracion - 1
        <= contenido["exp"]
        <= despues + duracion
    )

async def test_login_valido(db, usuario):
    db.scalar.return_value = usuario

    obtenido, rol = await s.iniciar_sesion(
        "ana@example.com",
        "ClavePrueba123!",
        db,
    )

    assert obtenido is usuario
    assert rol == "ASPIRANTE"

async def test_login_normaliza_correo(db, usuario):
    db.scalar.return_value = usuario

    await s.iniciar_sesion(
        " ANA@EXAMPLE.COM ",
        "ClavePrueba123!",
        db,
    )

    consulta = db.scalar.call_args.args[0]
    parametros = consulta.compile().params

    assert "ana@example.com" in parametros.values()

@pytest.mark.parametrize(
    "caso",
    ["inexistente", "inactivo", "clave_incorrecta"],
)
async def test_login_rechazado(caso, db, usuario):
    usuario.activo = caso != "inactivo"

    db.scalar.return_value = (
        None if caso == "inexistente" else usuario
    )

    clave = (
        "ClaveIncorrecta"
        if caso == "clave_incorrecta"
        else "ClavePrueba123!"
    )

    with pytest.raises(HTTPException) as error:
        await s.iniciar_sesion(
            usuario.correo_electronico,
            clave,
            db,
        )

    assert error.value.status_code == 401
    assert error.value.detail == (
        "Correo o contraseña incorrectos"
    )

@pytest.mark.parametrize(
    "caso",
    [
        "malformado",
        "firma_incorrecta",
        "vencido",
        "sin_sub",
        "uuid_invalido",
    ],
)
async def test_token_invalido_no_consulta_bd(caso, db):
    contenido = {
        "sub": str(uuid4()),
        "exp": 4102444800,
    }
    clave = s.SECRET_KEY

    if caso == "firma_incorrecta":
        clave = "otra-clave-exclusiva-de-pruebas"
    elif caso == "vencido":
        contenido["exp"] = 1
    elif caso == "sin_sub":
        del contenido["sub"]
    elif caso == "uuid_invalido":
        contenido["sub"] = "no-es-un-uuid"

    token = (
        "token-invalido"
        if caso == "malformado"
        else jwt.encode(
            contenido,
            clave,
            algorithm=s.ALGORITHM,
        )
    )

    with pytest.raises(HTTPException) as error:
        await s.obtener_usuario_actual(token, db)

    assert error.value.status_code == 401
    db.scalar.assert_not_awaited()

async def test_usuario_actual_con_token_valido(db, usuario):
    db.scalar.return_value = usuario
    token = s.crear_token(usuario.id, usuario.rol.nombre)

    obtenido = await s.obtener_usuario_actual(token, db)

    assert obtenido is usuario

@pytest.mark.parametrize("caso", ["inexistente", "inactivo"])
async def test_token_valido_rechaza_usuario_invalido(
    caso,
    db,
    usuario,
):
    token = s.crear_token(usuario.id, usuario.rol.nombre)
    usuario.activo = False

    db.scalar.return_value = (
        None if caso == "inexistente" else usuario
    )

    with pytest.raises(HTTPException) as error:
        await s.obtener_usuario_actual(token, db)

    assert error.value.status_code == 401

@pytest.mark.parametrize(
    "rol",
    ["ASPIRANTE", "DOCENTE", "COORDINADOR", "CPR"],
)
async def test_rol_anterior_en_token_no_concede_admin(
    rol,
    db,
    usuario,
):
    token = s.crear_token(usuario.id, "ADMIN")
    usuario.rol.nombre = rol
    db.scalar.return_value = usuario

    with pytest.raises(HTTPException) as error:
        await s.obtener_administrador_actual(token, db)

    assert error.value.status_code == 403


async def test_admin_segun_rol_actual(db, usuario):
    usuario.rol.nombre = "ADMIN"
    db.scalar.return_value = usuario

    token = s.crear_token(usuario.id, "ADMIN")

    obtenido = await s.obtener_administrador_actual(
        token,
        db,
    )
    assert obtenido is usuario