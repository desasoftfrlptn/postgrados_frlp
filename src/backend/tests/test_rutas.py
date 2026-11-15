from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
import pytest
from jose import jwt
from src.usuarios import servicio as s
from src.inscripcion.presentacion import rutas as inscripcion

BASE = "/api/v1/autenticacion"
LEGAJOS = "/api/v1/inscripcion"
OBJETIVO = "11111111-1111-4111-8111-111111111111"

DATOS_USUARIO = {
    "nombre": "Ana",
    "apellido": "Perez",
    "dni": "12345678",
    "correo_electronico": "ana@example.com",
    "contrasena": "ClavePrueba123!",
    "tipo_usuario": "ASPIRANTE",
}

def headers(usuario):
    token = s.crear_token(usuario.id, usuario.rol.nombre)
    return {"Authorization": f"Bearer {token}"}

def test_login_http(cliente, db, usuario):
    db.scalar.return_value = usuario
    respuesta = cliente.post(
        f"{BASE}/login",
        json={
            "correo_electronico": "ana@example.com",
            "contrasena": "ClavePrueba123!",
        },
    )
    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["id"] == str(usuario.id)
    assert datos["tipo_usuario"] == "ASPIRANTE"
    assert datos["token"]
    assert "contrasena" not in datos
    assert "contrasena_hash" not in datos

def test_login_http_credenciales_incorrectas(
    cliente,
    db,
    usuario,
):
    db.scalar.return_value = usuario
    respuesta = cliente.post(
        f"{BASE}/login",
        json={
            "correo_electronico": "ana@example.com",
            "contrasena": "incorrecta",
        },
    )
    assert respuesta.status_code == 401
    assert "token" not in respuesta.json()

def test_login_http_email_invalido(cliente, db):
    respuesta = cliente.post(
        f"{BASE}/login",
        json={
            "correo_electronico": "correo-invalido",
            "contrasena": "ClavePrueba123!",
        },
    )
    assert respuesta.status_code == 422
    db.scalar.assert_not_awaited()

def test_me_devuelve_perfil_sin_hash(cliente, db, usuario):
    db.scalar.return_value = usuario

    respuesta = cliente.get(
        f"{BASE}/me",
        headers=headers(usuario),
    )
    assert respuesta.status_code == 200
    datos = respuesta.json()
    assert datos["id"] == str(usuario.id)
    assert datos["tipo_usuario"] == usuario.rol.nombre
    assert "contrasena_hash" not in datos
    assert "contrasena" not in datos

@pytest.mark.parametrize("token", ["invalido", "vencido"])
def test_me_rechaza_token_invalido(token, cliente, db):
    if token == "vencido":
        token = jwt.encode(
            {"sub": str(uuid4()), "exp": 1},
            s.SECRET_KEY,
            algorithm=s.ALGORITHM,
        )
    respuesta = cliente.get(
        f"{BASE}/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert respuesta.status_code == 401
    db.scalar.assert_not_awaited()

def test_me_rechaza_cuenta_desactivada(cliente, db, usuario):
    autorizacion = headers(usuario)
    usuario.activo = False
    db.scalar.return_value = usuario

    respuesta = cliente.get(
        f"{BASE}/me",
        headers=autorizacion,
    )
    assert respuesta.status_code == 401

@pytest.mark.parametrize(
    "ruta",
    [
        f"{BASE}/me",
        f"{BASE}/usuarios",
        f"{LEGAJOS}/",
        f"{LEGAJOS}/mi-legajo",
        f"{LEGAJOS}/{OBJETIVO}",
        f"{LEGAJOS}/{OBJETIVO}/documentos",
    ],
)
def test_rutas_privadas_rechazan_anonimo(ruta, cliente, db):
    respuesta = cliente.get(ruta)

    assert respuesta.status_code in (401, 403)
    db.scalar.assert_not_awaited()
    db.execute.assert_not_awaited()

@pytest.mark.parametrize(
    "metodo,ruta,cuerpo",
    [
        ("GET", f"{BASE}/usuarios", None),
        ("POST", f"{BASE}/usuarios", DATOS_USUARIO),
        ("PUT", f"{BASE}/usuarios/{OBJETIVO}", DATOS_USUARIO),
        (
            "PATCH",
            f"{BASE}/usuarios/{OBJETIVO}/estado",
            {"activo": False},
        ),
        ("DELETE", f"{BASE}/usuarios/{OBJETIVO}", None),
    ],
)
@pytest.mark.parametrize(
    "rol",
    ["ASPIRANTE", "DOCENTE", "COORDINADOR", "CPR"],
)
def test_gestion_usuarios_restringida_a_admin(
    metodo,
    ruta,
    cuerpo,
    rol,
    cliente,
    db,
    usuario,
):
    usuario.rol.nombre = rol
    db.scalar.return_value = usuario

    respuesta = cliente.request(
        metodo,
        ruta,
        json=cuerpo,
        headers=headers(usuario),
    )

    assert respuesta.status_code == 403
    db.add.assert_not_called()
    db.delete.assert_not_awaited()
    db.commit.assert_not_awaited()


def test_admin_puede_listar_usuarios(cliente, db, usuario):
    usuario.rol.nombre = "ADMIN"
    db.scalar.return_value = usuario

    resultado = MagicMock()
    resultado.scalars.return_value.all.return_value = [usuario]
    db.execute.return_value = resultado

    respuesta = cliente.get(
        f"{BASE}/usuarios",
        headers=headers(usuario),
    )

    assert respuesta.status_code == 200
    assert respuesta.json()[0]["id"] == str(usuario.id)
    assert "contrasena_hash" not in respuesta.json()[0]


@pytest.mark.parametrize(
    "cambio",
    [
        {"correo_electronico": "invalido"},
        {"contrasena": "123"},
    ],
)
def test_alta_http_rechaza_datos_invalidos(
    cambio,
    cliente,
    db,
    usuario,
):
    usuario.rol.nombre = "ADMIN"
    db.scalar.return_value = usuario

    respuesta = cliente.post(
        f"{BASE}/usuarios",
        json={**DATOS_USUARIO, **cambio},
        headers=headers(usuario),
    )

    assert respuesta.status_code == 422
    db.add.assert_not_called()

@pytest.mark.parametrize(
    "metodo,ruta",
    [
        ("GET", f"{LEGAJOS}/"),
        ("GET", f"{LEGAJOS}/{OBJETIVO}"),
        ("GET", f"{LEGAJOS}/{OBJETIVO}/documentos"),
        ("PATCH", f"{LEGAJOS}/{OBJETIVO}/iniciar-revision"),
    ],
)
@pytest.mark.parametrize(
    "rol",
    ["ASPIRANTE", "DOCENTE", "CPR", "ADMIN"],
)
def test_legajos_restringidos_a_coordinador(
    metodo,
    ruta,
    rol,
    cliente,
    db,
    usuario,
):
    usuario.rol.nombre = rol
    db.scalar.return_value = usuario

    respuesta = cliente.request(metodo, ruta, headers=headers(usuario),)
    assert respuesta.status_code == 403
    db.execute.assert_not_awaited()
    db.commit.assert_not_awaited()

def test_coordinador_puede_listar_legajos(
    cliente,
    db,
    usuario,
    monkeypatch,
):
    usuario.rol.nombre = "COORDINADOR"
    db.scalar.return_value = usuario

    listar = AsyncMock(return_value=[])
    monkeypatch.setattr(inscripcion, "listar_legajos", listar)
    respuesta = cliente.get(
        f"{LEGAJOS}/",
        headers=headers(usuario),
    )

    assert respuesta.status_code == 200
    assert respuesta.json() == []
    listar.assert_awaited_once()

def test_documentacion_inexistente_devuelve_404(
    cliente,
    db,
    usuario,
    monkeypatch,
):
    usuario.rol.nombre = "COORDINADOR"
    db.scalar.return_value = usuario
    consultar = AsyncMock(return_value=None)
    monkeypatch.setattr(
        inscripcion,
        "consultar_documentacion_legajo",
        consultar,
    )

    respuesta = cliente.get(
        f"{LEGAJOS}/{OBJETIVO}/documentos",
        headers=headers(usuario),
    )
    assert respuesta.status_code == 404
    consultar.assert_awaited_once()

def test_mi_legajo_usa_identidad_de_sesion(
    cliente,
    db,
    usuario,
    monkeypatch,
):
    db.scalar.return_value = usuario

    repositorio = MagicMock()
    repositorio.obtener_por_email_o_dni = AsyncMock(
        return_value=None,
    )
    monkeypatch.setattr(
        inscripcion,
        "LegajoRepositorioPostgres",
        lambda session: repositorio,
    )
    respuesta = cliente.get(
        f"{LEGAJOS}/mi-legajo",
        params={
            "email": "otra.persona@example.com",
            "dni": "99999999",
        },
        headers=headers(usuario),
    )

    assert respuesta.status_code == 404
    repositorio.obtener_por_email_o_dni.assert_awaited_once_with(
        email=usuario.correo_electronico,
        dni=usuario.dni,
    )