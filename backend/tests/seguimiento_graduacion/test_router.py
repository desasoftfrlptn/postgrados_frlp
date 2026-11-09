"""Pruebas HTTP mediante ASGI y una sesión simulada, sin base real."""

import asyncio
import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import jwt
import pytest
from sqlalchemy.engine import Result
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def escenario(monkeypatch):
    """Sustituye solo la sesión; conserva autenticación, caso de uso y repositorio."""
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://prueba:prueba@localhost/base_ficticia")
    monkeypatch.setenv("JWT_SECRET", "secreto-exclusivo-de-pruebas-de-graduacion-123456")
    from src.main import app
    from src.shared.auth.orm_models import Usuario
    from src.shared.database.session import get_db

    session = MagicMock(spec=AsyncSession)
    session.execute.return_value = MagicMock(spec=Result)
    session.execute.return_value.scalar_one_or_none.return_value = None
    usuario = SimpleNamespace(id=uuid4(), email="cpr@example.com", rol="cpr", activo=True)
    legajo_id = uuid4()

    async def obtener(modelo, identificador):
        return usuario if modelo is Usuario else SimpleNamespace(id=identificador)

    async def completar_generados():
        trabajo = session.add.call_args.args[0]
        trabajo.id = uuid4()
        trabajo.created_at = datetime.now(timezone.utc)

    async def sesion_simulada():
        yield session

    session.get.side_effect = obtener
    session.flush.side_effect = completar_generados
    anteriores = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = sesion_simulada
    from src.shared.auth.jwt import crear_token_acceso
    token = crear_token_acceso(usuario.id)
    datos = dict(tipo="TFI", titulo="Trabajo final", director="Ana Pérez",
                 fecha_cpr="2026-11-09", numero_resolucion="123/26")
    yield app, session, usuario, legajo_id, token, datos
    app.dependency_overrides.clear()
    app.dependency_overrides.update(anteriores)


def solicitar(escenario, *, token=True, datos=None, identificador=None):
    """Envía una solicitud HTTP a la interfaz ASGI sin cliente externo."""
    app, _, _, legajo_id, credencial, cuerpo = escenario

    async def enviar():
        mensajes = []
        contenido = json.dumps(cuerpo if datos is None else datos).encode()
        headers = [(b"content-type", b"application/json")]
        if token is not False:
            valor = credencial if token is True else token
            headers.append((b"authorization", f"Bearer {valor}".encode()))
        scope = dict(type="http", asgi={"version": "3.0"}, http_version="1.1",
                     method="POST", scheme="http", path=f"/api/v1/legajos/{identificador or legajo_id}/trabajo-final",
                     query_string=b"", root_path="", headers=headers,
                     client=("127.0.0.1", 1234), server=("pruebas", 80))

        async def recibir():
            return {"type": "http.request", "body": contenido, "more_body": False}

        async def responder(mensaje):
            mensajes.append(mensaje)

        await app(scope, recibir, responder)
        estado = next(m["status"] for m in mensajes if m["type"] == "http.response.start")
        cuerpo_respuesta = b"".join(m.get("body", b"") for m in mensajes if m["type"] == "http.response.body")
        return estado, json.loads(cuerpo_respuesta)

    return asyncio.run(enviar())


def test_registro_exitoso(escenario):
    """Responde 201, serializa el modelo y registra al usuario autenticado."""
    _, session, usuario, legajo_id, _, datos = escenario
    estado, respuesta = solicitar(escenario)
    assert estado == 201
    assert respuesta.items() >= datos.items()
    assert respuesta["legajo_id"] == str(legajo_id)
    assert respuesta["creado_por"] == usuario.email
    assert respuesta["codirector"] is None
    assert respuesta["id"] and respuesta["created_at"]
    session.commit.assert_awaited_once()


@pytest.mark.parametrize("token", [False, "token-invalido"])
def test_autenticacion_requerida(escenario, token):
    """Rechaza ausencia de credenciales y tokens inválidos con 401."""
    assert solicitar(escenario, token=token)[0] == 401
    escenario[1].add.assert_not_called()


def test_token_vencido(escenario, monkeypatch):
    """Rechaza una firma válida con fecha de expiración pasada."""
    import os
    token = jwt.encode(dict(sub=str(escenario[2].id), tipo="access",
                            exp=datetime.now(timezone.utc) - timedelta(hours=1)),
                       os.environ["JWT_SECRET"], algorithm="HS256")
    assert solicitar(escenario, token=token)[0] == 401


def test_usuario_inactivo(escenario):
    """Un usuario desactivado no puede utilizar su token."""
    escenario[2].activo = False
    assert solicitar(escenario)[0] == 401


@pytest.mark.parametrize("rol", ["coordinador", "admin", "docente", "estudiante"])
def test_solo_cpr(escenario, rol):
    """Los demás roles reciben 403 y no guardan datos."""
    escenario[2].rol = rol
    assert solicitar(escenario)[0] == 403
    escenario[1].add.assert_not_called()


@pytest.mark.parametrize("cambio", [{"titulo": ""}, {"titulo": "a" * 301},
                                  {"tipo": "Otro"}, {"fecha_cpr": "invalida"}])
def test_validacion_cuerpo(escenario, cambio):
    """Los datos inválidos producen 422 antes del guardado."""
    assert solicitar(escenario, datos=escenario[5] | cambio)[0] == 422
    escenario[1].add.assert_not_called()


def test_campo_obligatorio_y_uuid(escenario):
    """Valida campos faltantes y el identificador del legajo."""
    datos = escenario[5].copy()
    datos.pop("titulo")
    assert solicitar(escenario, datos=datos)[0] == 422
    assert solicitar(escenario, identificador="invalido")[0] == 422


def test_legajo_inexistente(escenario):
    """Traduce el error de negocio a 404 y revierte la transacción."""
    session = escenario[1]
    session.get.side_effect = [escenario[2], None]
    assert solicitar(escenario)[0] == 404
    session.rollback.assert_awaited_once()
    session.add.assert_not_called()


def test_duplicado(escenario):
    """Responde 409 si el legajo ya tiene trabajo final."""
    session = escenario[1]
    session.execute.return_value.scalar_one_or_none.return_value = object()
    assert solicitar(escenario)[0] == 409
    session.rollback.assert_awaited_once()
    session.add.assert_not_called()


def test_integridad_no_expone_detalles(escenario):
    """Los detalles SQL internos no aparecen en el cuerpo HTTP."""
    session = escenario[1]
    session.flush.side_effect = IntegrityError("SQL_INTERNO", {}, Exception("DATO_PRIVADO"))
    estado, respuesta = solicitar(escenario)
    assert estado == 409
    assert respuesta == {"detail": "No se pudo registrar el trabajo final por un conflicto de integridad"}
    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()


def test_openapi(escenario):
    """La aplicación publica el endpoint, sus modelos y la seguridad Bearer."""
    documento = escenario[0].openapi()
    operacion = documento["paths"]["/api/v1/legajos/{id}/trabajo-final"]["post"]
    assert operacion["requestBody"]["content"]["application/json"]["schema"]["$ref"].endswith("/CrearTrabajoFinalRequest")
    assert operacion["responses"]["201"]["content"]["application/json"]["schema"]["$ref"].endswith("/TrabajoFinalResponse")
    assert {"401", "403", "404", "409", "422"} <= operacion["responses"].keys()
    assert operacion["security"] == [{"HTTPBearer": []}]
