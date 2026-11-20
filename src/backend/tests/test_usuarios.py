from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4
import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from src.usuarios import servicio as s
from src.usuarios.seguridad import verificar_password

def datos_alta():
    return {
        "nombre": " Ana ",
        "apellido": " Perez ",
        "dni": " 12345678 ",
        "correo_electronico": " ANA@EXAMPLE.COM ",
        "contrasena": "ClavePrueba123!",
        "tipo_usuario": "DOCENTE",
    }

def datos_edicion(usuario):
    datos = datos_alta()
    datos.pop("contrasena")
    datos["usuario_id"] = usuario.id
    return datos

async def test_alta_guarda_datos_hash_y_rol(
    db,
    usuario,
    monkeypatch,
):
    rol = SimpleNamespace(id=uuid4(), nombre="DOCENTE")
    db.scalar.side_effect = [None, None, rol]

    monkeypatch.setattr(
        s,
        "buscar_usuario_con_rol",
        AsyncMock(return_value=usuario),
    )

    await s.crear_usuario(**datos_alta(), db=db)

    creado = db.add.call_args.args[0]

    assert creado.nombre == "Ana"
    assert creado.apellido == "Perez"
    assert creado.dni == "12345678"
    assert creado.correo_electronico == "ana@example.com"
    assert creado.rol_id == rol.id
    assert creado.activo is True
    assert creado.debe_cambiar_contrasena is True
    assert creado.contrasena_hash != "ClavePrueba123!"
    assert verificar_password(
        "ClavePrueba123!",
        creado.contrasena_hash,
    )
    db.commit.assert_awaited_once()

@pytest.mark.parametrize("campo", ["nombre", "apellido", "dni"])
async def test_alta_rechaza_campos_blancos(campo, db):
    datos = datos_alta()
    datos[campo] = "   "

    with pytest.raises(HTTPException) as error:
        await s.crear_usuario(**datos, db=db)

    assert error.value.status_code == 400
    db.add.assert_not_called()
    db.commit.assert_not_awaited()

@pytest.mark.parametrize(
    "resultados",
    [
        [True], [None, True], [None, None, None],  
    ],
    ids=["correo_duplicado", "dni_duplicado", "rol_inexistente"],
)
async def test_alta_rechazada(resultados, db):
    db.scalar.side_effect = resultados

    with pytest.raises(HTTPException) as error:
        await s.crear_usuario(**datos_alta(), db=db)

    assert error.value.status_code == 400
    db.add.assert_not_called()
    db.commit.assert_not_awaited()


async def test_alta_revierte_error_integridad(db):
    db.scalar.side_effect = [
        None,
        None,
        SimpleNamespace(id=uuid4(), rol=SimpleNamespace(nombre="ADMIN")),
    ]

    db.commit.side_effect = IntegrityError(
        "insert",
        {},
        Exception("duplicado"),
    )

    with pytest.raises(HTTPException) as error:
        await s.crear_usuario(**datos_alta(), db=db)

    assert error.value.status_code == 400
    db.rollback.assert_awaited_once()


async def test_edicion_actualiza_datos_y_rol(
    db,
    usuario,
    monkeypatch,
):
    rol = SimpleNamespace(id=uuid4(), rol=SimpleNamespace(nombre="ADMIN"))
    db.scalar.side_effect = [None, None, rol]

    monkeypatch.setattr(
        s,
        "buscar_usuario_con_rol",
        AsyncMock(return_value=usuario),
    )

    hash_anterior = usuario.contrasena_hash

    await s.modificar_usuario(
        **datos_edicion(usuario),
        db=db,
    )

    assert usuario.nombre == "Ana"
    assert usuario.apellido == "Perez"
    assert usuario.dni == "12345678"
    assert usuario.correo_electronico == "ana@example.com"
    assert usuario.rol_id == rol.id
    assert usuario.contrasena_hash == hash_anterior
    db.commit.assert_awaited_once()

@pytest.mark.parametrize(
    "resultados",
    [[True], [None, True], [None, None, None]],
    ids=["correo_duplicado", "dni_duplicado", "rol_inexistente"],
)
async def test_edicion_rechazada(
    resultados,
    db,
    usuario,
    monkeypatch,
):
    monkeypatch.setattr(
        s,
        "buscar_usuario_con_rol",
        AsyncMock(return_value=usuario),
    )
    db.scalar.side_effect = resultados

    with pytest.raises(HTTPException) as error:
        await s.modificar_usuario(
            **datos_edicion(usuario),
            db=db,
        )

    assert error.value.status_code == 400
    db.commit.assert_not_awaited()

async def test_edicion_usuario_inexistente(
    db,
    usuario,
    monkeypatch,
):
    monkeypatch.setattr(
        s,
        "buscar_usuario_con_rol",
        AsyncMock(return_value=None),
    )

    with pytest.raises(HTTPException) as error:
        await s.modificar_usuario(
            **datos_edicion(usuario),
            db=db,
        )

    assert error.value.status_code == 404
    db.commit.assert_not_awaited()

async def test_edicion_revierte_error_integridad(
    db,
    usuario,
    monkeypatch,
):
    monkeypatch.setattr(
        s, "buscar_usuario_con_rol", AsyncMock(return_value=usuario),
    )

    db.scalar.side_effect = [
        None, None, SimpleNamespace(id=uuid4(), rol=SimpleNamespace(nombre="ADMIN")),
    ]
    db.commit.side_effect = IntegrityError(
        "update", {}, Exception("duplicado"),
    )

    with pytest.raises(HTTPException) as error:
        await s.modificar_usuario(
            **datos_edicion(usuario),
            db=db,
        )

    assert error.value.status_code == 400
    db.rollback.assert_awaited_once()

@pytest.mark.parametrize("activo", [True, False])
async def test_activar_y_desactivar(
    activo,
    db,
    usuario,
    monkeypatch,
):
    monkeypatch.setattr(
        s,
        "buscar_usuario_con_rol",
        AsyncMock(return_value=usuario),
    )
    administrador = SimpleNamespace(id=uuid4(), rol=SimpleNamespace(nombre="ADMIN"))

    obtenido = await s.cambiar_estado_usuario(
        usuario.id,
        activo,
        administrador,
        db,
    )

    assert obtenido.activo is activo
    db.commit.assert_awaited_once()

async def test_no_permite_autodesactivacion(db, usuario):
    with pytest.raises(HTTPException) as error:
        await s.cambiar_estado_usuario(
            usuario.id,
            False,
            usuario,
            db,
        )

    assert error.value.status_code == 400
    db.commit.assert_not_awaited()

async def test_estado_usuario_inexistente(db, monkeypatch):
    monkeypatch.setattr(
        s,
        "buscar_usuario_con_rol",
        AsyncMock(return_value=None),
    )

    with pytest.raises(HTTPException) as error:
        await s.cambiar_estado_usuario(
            uuid4(),
            False,
            SimpleNamespace(id=uuid4(), rol=SimpleNamespace(nombre="ADMIN")),
            db,
        )

    assert error.value.status_code == 404

async def test_cambio_contrasena(db, usuario):
    await s.cambiar_contrasena(
        usuario,
        "ClavePrueba123!",
        "NuevaClave456!",
        "NuevaClave456!",
        db,
    )

    assert verificar_password(
        "NuevaClave456!",
        usuario.contrasena_hash,
    )
    assert not verificar_password(
        "ClavePrueba123!",
        usuario.contrasena_hash,
    )
    assert usuario.debe_cambiar_contrasena is False
    db.commit.assert_awaited_once()

@pytest.mark.parametrize(
    "actual,nueva,repetida",
    [
        ("incorrecta", "Nueva456!", "Nueva456!"),
        ("ClavePrueba123!", "Nueva456!", "distinta"),
        ("ClavePrueba123!", "ClavePrueba123!", "ClavePrueba123!"),
    ],
    ids=["actual_incorrecta", "no_coinciden", "misma_clave"],
)
async def test_cambio_contrasena_rechazado(
    actual,
    nueva,
    repetida,
    db,
    usuario,
):
    hash_anterior = usuario.contrasena_hash

    with pytest.raises(HTTPException) as error:
        await s.cambiar_contrasena(
            usuario,
            actual,
            nueva,
            repetida,
            db,
        )

    assert error.value.status_code == 400
    assert usuario.contrasena_hash == hash_anterior
    db.commit.assert_not_awaited()

async def test_cambio_inicial_contrasena(db, usuario):
    await s.cambiar_contrasena_inicial(
        usuario,
        "Nueva456!",
        "Nueva456!",
        db,
    )

    assert verificar_password(
        "Nueva456!",
        usuario.contrasena_hash,
    )
    assert usuario.debe_cambiar_contrasena is False
    db.commit.assert_awaited_once()

@pytest.mark.parametrize(
    "pendiente,repetida",
    [
        (False, "Nueva456!"),
        (True, "distinta"),
    ],
    ids=["ya_realizado", "no_coinciden"],
)
async def test_cambio_inicial_rechazado(
    pendiente,
    repetida,
    db,
    usuario,
):
    usuario.debe_cambiar_contrasena = pendiente

    with pytest.raises(HTTPException) as error:
        await s.cambiar_contrasena_inicial(
            usuario,
            "Nueva456!",
            repetida,
            db,
        )

    assert error.value.status_code == 400
    db.commit.assert_not_awaited()

async def test_eliminar_usuario(db, usuario):
    db.get.return_value = usuario

    await s.eliminar_usuario(
        usuario.id,
        SimpleNamespace(id=uuid4(), rol=SimpleNamespace(nombre="ADMIN")),
        db,
    )

    db.delete.assert_awaited_once_with(usuario)
    db.commit.assert_awaited_once()

async def test_no_permite_autoeliminacion(db, usuario):
    with pytest.raises(HTTPException) as error:
        await s.eliminar_usuario(
            usuario.id,
            usuario,
            db,
        )

    assert error.value.status_code == 400
    db.delete.assert_not_awaited()

async def test_eliminar_usuario_inexistente(db):
    with pytest.raises(HTTPException) as error:
        await s.eliminar_usuario(
            uuid4(),
            SimpleNamespace(id=uuid4(), rol=SimpleNamespace(nombre="ADMIN")),
            db,
        )

    assert error.value.status_code == 404

async def test_eliminar_usuario_con_relaciones(db, usuario):
    db.get.return_value = usuario
    db.commit.side_effect = IntegrityError(
        "delete",
        {},
        Exception("referencia existente"),
    )
    with pytest.raises(HTTPException) as error:
        await s.eliminar_usuario(
            usuario.id,
            SimpleNamespace(id=uuid4(), rol=SimpleNamespace(nombre="ADMIN")),
            db,
        )
    assert error.value.status_code == 409
    db.rollback.assert_awaited_once()