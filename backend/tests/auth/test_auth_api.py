import secrets

from uuid import uuid4

import bcrypt

import pytest

import pytest_asyncio

from fastapi import HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from src.main import app
from src.shared.auth.dependencies import require_role
from src.shared.auth.orm_models import Usuario
from src.shared.database.connection import engine
from src.shared.database.session import get_db
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from src.shared.auth.router import router as auth_router
from src.shared.database.session import get_db

pytestmark = pytest.mark.asyncio

API = "/api/v1/auth"

PASSWORD = "ClaveSoloParaTests123!"

@pytest.fixture(scope="module")

def password_hash():

    return bcrypt.hashpw(

        PASSWORD.encode(),

        bcrypt.gensalt(rounds=12),

    ).decode()

@pytest_asyncio.fixture

async def cliente(monkeypatch, password_hash):

    monkeypatch.setenv("JWT_SECRET", secrets.token_hex(32))

    monkeypatch.setenv("JWT_EXPIRATION", "8h")

    monkeypatch.setenv("JWT_REFRESH_EXPIRATION", "7d")

    email = f"test-auth-{uuid4().hex}@example.test"

    email_inactivo = f"test-inactivo-{uuid4().hex}@example.test"

    try:

        async with engine.connect() as conexion:

            transaccion = await conexion.begin()

            async def get_db_test():

                async with AsyncSession(

                    bind=conexion,

                    expire_on_commit=False,

                    join_transaction_mode="create_savepoint",

                ) as db:

                    yield db

            monkeypatch.setitem(app.dependency_overrides, get_db, get_db_test)

            try:

                async for db in get_db_test():

                    db.add_all([

                        Usuario(

                            nombre="Coordinador de prueba",

                            email=email,

                            password_hash=password_hash,

                            rol="coordinador",

                            activo=True,

                        ),

                        Usuario(

                            nombre="Usuario inactivo",

                            email=email_inactivo,

                            password_hash=password_hash,

                            rol="coordinador",

                            activo=False,

                        ),

                    ])

                    await db.commit()

                async with AsyncClient(

                    transport=ASGITransport(app=app),

                    base_url="http://test",

                ) as http:

                    yield http, email, email_inactivo

            finally:

                await transaccion.rollback()

    finally:

        await engine.dispose()

@pytest.mark.parametrize("caso", ["inexistente", "clave_incorrecta", "inactivo"])

async def test_login_rechaza_credenciales_invalidas(cliente, caso):

    ##Verifica el 401 con un usuario inexistente o inactivo, o con una clave incorrecta.
    http, email, email_inactivo = cliente

    credenciales = {

        "inexistente": (f"no-existe-{uuid4().hex}@example.test", PASSWORD),

        "clave_incorrecta": (email, "Incorrecta"),

        "inactivo": (email_inactivo, PASSWORD),

    }

    email_enviado, clave = credenciales[caso]

    respuesta = await http.post(

        f"{API}/login",

        json={"email": email_enviado, "password": clave},

    )

    assert respuesta.status_code == 401

    assert respuesta.json() == {"detail": "Credenciales inválidas"}

@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer invalido"}])

async def test_me_rechaza_solicitudes_sin_token_valido(cliente, headers):

    ##Verifica que /me devuelva 401 si falta el token o si es inválido.
    http, _, _ = cliente

    respuesta = await http.get(f"{API}/me", headers=headers)

    assert respuesta.status_code == 401

async def test_login_renovacion_y_logout(cliente):

    ##Prueba login, perfil y rotación de tokens, y verifica la revocación y el logout repetido.
    http, email, _ = cliente

    login = await http.post(

        f"{API}/login",

        json={"email": email, "password": PASSWORD},

    )

    assert login.status_code == 200

    tokens = login.json()

    assert tokens["token_type"] == "bearer"

    perfil = await http.get(

        f"{API}/me",

        headers={"Authorization": f"Bearer {tokens['access_token']}"},

    )

    assert perfil.status_code == 200

    assert perfil.json()["email"] == email

    assert perfil.json()["rol"] == "coordinador"

    assert "password_hash" not in perfil.json()

    original = {"refresh_token": tokens["refresh_token"]}

    renovacion = await http.post(f"{API}/refresh", json=original)

    assert renovacion.status_code == 200

    nuevo_token = renovacion.json()["refresh_token"]

    assert nuevo_token != original["refresh_token"]

    reutilizacion = await http.post(f"{API}/refresh", json=original)

    assert reutilizacion.status_code == 401

    sesion_nueva = {"refresh_token": nuevo_token}

    logout = await http.post(f"{API}/logout", json=sesion_nueva)

    assert logout.status_code == 204

    assert logout.content == b""

    revocado = await http.post(f"{API}/refresh", json=sesion_nueva)

    assert revocado.status_code == 401

    segundo_logout = await http.post(f"{API}/logout", json=sesion_nueva)

    assert segundo_logout.status_code == 204

async def test_require_role_acepta_coordinador():

    ##Verifica que un coordinador pueda pasar el control de rol.
    usuario = Usuario(rol="coordinador")

    resultado = await require_role("coordinador")(usuario)

    assert resultado is usuario

async def test_require_role_rechaza_otro_rol():

    ##Verifica que un rol distinto de coordinador reciba un 403.
    usuario = Usuario(rol="cpr")

    with pytest.raises(HTTPException) as error:

        await require_role("coordinador")(usuario)

    assert error.value.status_code == 403

@pytest.mark.asyncio

async def test_refresh_con_token_inexistente_devuelve_401_y_hace_rollback():

    ##Verifica que un refresh token inexistente devuelva 401 y revierta la transacción.
    resultado = Mock()

    resultado.scalar_one_or_none.return_value = None

    db = SimpleNamespace(

        execute=AsyncMock(return_value=resultado),

        rollback=AsyncMock(),

        commit=AsyncMock(),

    )

    app_prueba = FastAPI()

    app_prueba.include_router(auth_router, prefix="/api/v1")

    app_prueba.dependency_overrides[get_db] = lambda: db

    async with AsyncClient(

        transport=ASGITransport(app=app_prueba),

        base_url="http://test",

    ) as cliente:

        respuesta = await cliente.post(

            "/api/v1/auth/refresh",

            json={"refresh_token": "token-que-no-existe"},

        )

    assert respuesta.status_code == 401

    assert respuesta.json() == {"detail": "Sesión inválida o vencida"}

    db.rollback.assert_awaited_once()

    db.commit.assert_not_awaited()

@pytest.mark.asyncio

@pytest.mark.parametrize("usuario_existe", [False, True], ids=["eliminado", "inactivo"])

async def test_me_rechaza_usuario_eliminado_o_inactivo(monkeypatch, usuario_existe):

    ##Verifica que /me devuelva 401 si el usuario del token fue eliminado o desactivado.
    usuario_id = uuid4()

    usuario = SimpleNamespace(id=usuario_id, activo=False) if usuario_existe else None

    db = SimpleNamespace(get=AsyncMock(return_value=usuario))

    monkeypatch.setattr(

        "src.shared.auth.dependencies.obtener_id_usuario",

        lambda token: usuario_id,

    )

    app_prueba = FastAPI()

    app_prueba.include_router(auth_router, prefix="/api/v1")

    app_prueba.dependency_overrides[get_db] = lambda: db

    async with AsyncClient(

        transport=ASGITransport(app=app_prueba),

        base_url="http://test",

    ) as cliente:

        respuesta = await cliente.get(

            "/api/v1/auth/me",

            headers={"Authorization": "Bearer token-de-prueba"},

        )

    assert respuesta.status_code == 401

    assert respuesta.json() == {"detail": "Sesión inválida o vencida"}

    assert respuesta.headers["WWW-Authenticate"] == "Bearer"

    db.get.assert_awaited_once()

@pytest.mark.asyncio

async def test_me_devuelve_perfil_de_usuario_activo(monkeypatch):

    ##Verifica que /me devuelva el perfil y el rol de un usuario activo.
    usuario_id = uuid4()

    usuario = SimpleNamespace(

        id=usuario_id,

        nombre="Coordinador de prueba",

        email="coordinador@example.test",

        rol="coordinador",

        activo=True,

    )

    db = SimpleNamespace(get=AsyncMock(return_value=usuario))

    monkeypatch.setattr(

        "src.shared.auth.dependencies.obtener_id_usuario",

        lambda token: usuario_id,

    )

    app_prueba = FastAPI()

    app_prueba.include_router(auth_router, prefix="/api/v1")

    app_prueba.dependency_overrides[get_db] = lambda: db

    async with AsyncClient(

        transport=ASGITransport(app=app_prueba),

        base_url="http://test",

    ) as cliente:

        respuesta = await cliente.get(

            "/api/v1/auth/me",

            headers={"Authorization": "Bearer token-de-prueba"},

        )

    assert respuesta.status_code == 200

    assert respuesta.json() == {

        "id": str(usuario_id),

        "nombre": "Coordinador de prueba",

        "email": "coordinador@example.test",

        "rol": "coordinador",

    }

@pytest.mark.asyncio

async def test_logout_devuelve_204_y_confirma_la_actualizacion():

    ##Verifica que el logout devuelva 204 sin cuerpo y confirme la actualización de la sesión.
    db = SimpleNamespace(execute=AsyncMock(), commit=AsyncMock())

    app_prueba = FastAPI()

    app_prueba.include_router(auth_router, prefix="/api/v1")

    app_prueba.dependency_overrides[get_db] = lambda: db

    async with AsyncClient(

        transport=ASGITransport(app=app_prueba),

        base_url="http://test",

    ) as cliente:

        respuesta = await cliente.post(

            "/api/v1/auth/logout",

            json={"refresh_token": "refresh-token-de-prueba"},

        )

    assert respuesta.status_code == 204

    assert respuesta.content == b""

    db.execute.assert_awaited_once()

    db.commit.assert_awaited_once()
