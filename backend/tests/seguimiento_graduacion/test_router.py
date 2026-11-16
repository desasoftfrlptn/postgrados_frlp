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


def solicitar(escenario, *, token=True, datos=None, identificador=None, metodo="POST", ruta=None, query=""):
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
                     method=metodo, scheme="http",
                     path=ruta or (f"/api/v1/trabajos-finales/{identificador or legajo_id}" if metodo == "PATCH"
                           else f"/api/v1/legajos/{identificador or legajo_id}/trabajo-final"),
                     query_string=query.encode(), root_path="", headers=headers,
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


@pytest.mark.parametrize("rol", ["cpr", "coordinador"])
def test_consulta_exitosa(escenario, rol):
    """Devuelve 200 y el formato completo sin ejecutar escrituras."""
    from src.seguimiento_graduacion.infrastructure.orm_models import TrabajoFinal

    _, session, usuario, legajo_id, _, datos = escenario
    usuario.rol = rol
    trabajo_id = uuid4()
    fecha = datetime(2026, 11, 9, 12, tzinfo=timezone.utc)
    trabajo = TrabajoFinal(**datos, id=trabajo_id, legajo_id=legajo_id,
                           creado_por="autor@example.com", created_at=fecha)
    session.execute.return_value.scalar_one_or_none.return_value = trabajo
    estado, respuesta = solicitar(escenario, metodo="GET")
    assert estado == 200
    assert respuesta == datos | dict(id=str(trabajo_id), legajo_id=str(legajo_id),
                                    creado_por="autor@example.com", created_at="2026-11-09T12:00:00Z",
                                    codirector=None)
    session.add.assert_not_called()
    session.flush.assert_not_awaited()
    session.commit.assert_not_awaited()


def test_consulta_legajo_inexistente(escenario):
    """Distingue un legajo inexistente y no consulta su trabajo."""
    session = escenario[1]
    session.get.side_effect = [escenario[2], None]
    assert solicitar(escenario, metodo="GET") == (404, {"detail": "El legajo indicado no existe"})
    session.execute.assert_not_awaited()


def test_consulta_trabajo_inexistente(escenario):
    """Devuelve 404, en lugar del null que utiliza el simulador del frontend."""
    assert solicitar(escenario, metodo="GET") == (
        404, {"detail": "El legajo no tiene un trabajo final registrado"}
    )


@pytest.mark.parametrize("token", [False, "token-invalido"])
def test_consulta_requiere_autenticacion(escenario, token):
    """La consulta también exige un token válido."""
    assert solicitar(escenario, metodo="GET", token=token)[0] == 401
    escenario[1].execute.assert_not_awaited()


@pytest.mark.parametrize("rol", ["admin", "docente", "estudiante"])
def test_consulta_denegada_a_otros_roles(escenario, rol):
    """Impide consultar a roles sin permiso antes de buscar el trabajo."""
    escenario[2].rol = rol
    assert solicitar(escenario, metodo="GET")[0] == 403
    escenario[1].execute.assert_not_awaited()


def test_consulta_uuid_invalido(escenario):
    """Valida el identificador de la ruta antes de consultar."""
    assert solicitar(escenario, metodo="GET", identificador="invalido")[0] == 422


def test_consulta_openapi(escenario):
    """Documenta respuesta, errores y autenticación del GET en la aplicación."""
    operacion = escenario[0].openapi()["paths"]["/api/v1/legajos/{id}/trabajo-final"]["get"]
    assert operacion["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/TrabajoFinalResponse")
    assert {"401", "403", "404", "422"} <= operacion["responses"].keys()
    assert operacion["security"] == [{"HTTPBearer": []}]


@pytest.fixture
def trabajo_para_patch(escenario):
    """Entrega un modelo existente y conserva el usuario de autenticación."""
    from src.seguimiento_graduacion.infrastructure.orm_models import TrabajoFinal
    from src.shared.auth.orm_models import Usuario

    trabajo = TrabajoFinal(**escenario[5], id=uuid4(), legajo_id=escenario[3],
                           codirector="Juan", creado_por="autor@example.com",
                           created_at=datetime(2026, 11, 9, tzinfo=timezone.utc))

    async def obtener(modelo, identificador):
        return escenario[2] if modelo is Usuario else trabajo

    escenario[1].get.side_effect = obtener
    # Un UPDATE conserva los valores generados durante el INSERT original.
    escenario[1].flush.side_effect = None
    return trabajo


@pytest.mark.parametrize("cambios", [{"titulo": "Nuevo título"}, {"codirector": None},
                                   {"director": "María", "numero_resolucion": "456/26"}, {}])
def test_patch_exitoso(escenario, trabajo_para_patch, cambios):
    """Actualiza solo lo enviado y conserva identidad, creador y fecha original."""
    trabajo = trabajo_para_patch
    estado, respuesta = solicitar(escenario, metodo="PATCH", identificador=str(trabajo.id), datos=cambios)
    assert estado == 200
    assert respuesta["id"] == str(trabajo.id)
    assert respuesta["legajo_id"] == str(escenario[3])
    assert respuesta["creado_por"] == "autor@example.com"
    assert respuesta["created_at"] == "2026-11-09T00:00:00Z"
    for campo, valor in cambios.items():
        assert respuesta[campo] == valor
    assert respuesta["codirector"] == cambios.get("codirector", "Juan")
    if cambios:
        escenario[1].commit.assert_awaited_once()
    else:
        escenario[1].commit.assert_not_awaited()


@pytest.mark.parametrize("datos", [{"titulo": None}, {"director": None}, {"tipo": None},
                                  {"fecha_cpr": None}, {"numero_resolucion": None},
                                  {"titulo": " "}, {"titulo": "a" * 301}, {"tipo": "Otro"},
                                  {"fecha_cpr": "imposible"}, {"id": "otro"},
                                  {"creado_por": "otro"}, {"created_at": "2026-01-01"},
                                  {"legajo_id": "otro"}, {"codirector": ""}])
def test_patch_datos_invalidos(escenario, datos):
    """Rechaza null obligatorio, formatos inválidos y campos protegidos."""
    assert solicitar(escenario, metodo="PATCH", datos=datos)[0] == 422
    escenario[1].add.assert_not_called()
    escenario[1].commit.assert_not_awaited()


@pytest.mark.parametrize("token", [False, "invalido"])
def test_patch_autenticacion(escenario, token):
    """Exige autenticación válida para modificar."""
    assert solicitar(escenario, metodo="PATCH", datos={}, token=token)[0] == 401


@pytest.mark.parametrize("rol", ["coordinador", "admin", "docente", "estudiante"])
def test_patch_permiso_y_evento(escenario, rol, caplog):
    """Registra el rechazo autenticado sin exponer el nuevo título."""
    escenario[2].rol = rol
    with caplog.at_level("INFO", logger="seguimiento_graduacion.auditoria"):
        assert solicitar(escenario, metodo="PATCH", datos={"titulo": "VALOR_PRIVADO"})[0] == 403
    evento = caplog.records[-1]
    assert evento.resultado == "denegado"
    assert evento.usuario_id == str(escenario[2].id)
    assert "VALOR_PRIVADO" not in str(evento.__dict__)
    escenario[1].add.assert_not_called()


def test_patch_inexistente(escenario):
    """No guarda cuando no existe el trabajo solicitado."""
    escenario[1].get.side_effect = [escenario[2], None]
    assert solicitar(escenario, metodo="PATCH", datos={"titulo": "Nuevo"})[0] == 404
    escenario[1].rollback.assert_awaited_once()


def test_patch_integridad_y_rollback(escenario, trabajo_para_patch):
    """Devuelve conflicto y revierte sin mostrar detalles SQL."""
    escenario[1].flush.side_effect = IntegrityError("SQL_PRIVADO", {}, Exception("ERROR_PRIVADO"))
    estado, respuesta = solicitar(escenario, metodo="PATCH", datos={"titulo": "Nuevo"})
    assert estado == 409
    assert "PRIVADO" not in str(respuesta)
    escenario[1].rollback.assert_awaited_once()
    escenario[1].commit.assert_not_awaited()


def test_patch_openapi(escenario):
    """La ruta PATCH publica sus modelos y autenticación."""
    operacion = escenario[0].openapi()["paths"]["/api/v1/trabajos-finales/{id}"]["patch"]
    assert operacion["requestBody"]["content"]["application/json"]["schema"]["$ref"].endswith("/ActualizarTrabajoFinalRequest")
    assert operacion["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/TrabajoFinalResponse")
    assert {"401", "403", "404", "409", "422"} <= operacion["responses"].keys()
    assert operacion["security"] == [{"HTTPBearer": []}]


@pytest.mark.parametrize("color", ["VERDE", "AMARILLO", "ROJO"])
@pytest.mark.parametrize("manual", [True, False])
def test_semaforo_http_sin_escrituras(escenario, color, manual):
    """Devuelve exactamente el dato guardado y solo consulta usuario y legajo."""
    from src.shared.auth.orm_models import Usuario
    from src.inscripcion.infrastructure.orm_models import Legajo

    _, session, usuario, legajo_id, _, _ = escenario
    usuario.rol = "coordinador"
    legajo = Legajo(id=legajo_id, semaforo=color, semaforo_manual=manual)
    anteriores = (legajo.semaforo, legajo.semaforo_manual)

    async def obtener(modelo, identificador):
        return usuario if modelo is Usuario else legajo

    session.get.side_effect = obtener
    assert solicitar(escenario, metodo="GET", ruta=f"/api/v1/legajos/{legajo_id}/semaforo") == (
        200, {"semaforo": color, "semaforo_manual": manual}
    )
    session.get.assert_any_await(Legajo, legajo_id)
    assert (legajo.semaforo, legajo.semaforo_manual) == anteriores
    session.add.assert_not_called()
    session.flush.assert_not_awaited()
    session.commit.assert_not_awaited()
    session.rollback.assert_not_awaited()
    session.execute.assert_not_awaited()


@pytest.mark.parametrize("token", [False, "invalido"])
def test_semaforo_requiere_autenticacion(escenario, token):
    """La lectura requiere un token válido."""
    assert solicitar(escenario, metodo="GET", token=token,
                     ruta=f"/api/v1/legajos/{escenario[3]}/semaforo")[0] == 401


@pytest.mark.parametrize("rol", ["cpr", "admin", "docente", "estudiante"])
def test_semaforo_rechaza_otros_roles(escenario, rol):
    """Respeta el permiso de coordinador documentado para esta ruta."""
    escenario[2].rol = rol
    assert solicitar(escenario, metodo="GET",
                     ruta=f"/api/v1/legajos/{escenario[3]}/semaforo")[0] == 403
    assert escenario[1].get.await_count == 1


def test_semaforo_legajo_inexistente(escenario):
    """Responde 404 en lugar de devolver un color predeterminado."""
    escenario[2].rol = "coordinador"
    escenario[1].get.side_effect = [escenario[2], None]
    assert solicitar(escenario, metodo="GET", ruta=f"/api/v1/legajos/{escenario[3]}/semaforo") == (
        404, {"detail": "El legajo indicado no existe"}
    )


def test_semaforo_uuid_invalido(escenario):
    """Valida el identificador antes de consultar el legajo."""
    escenario[2].rol = "coordinador"
    assert solicitar(escenario, metodo="GET", ruta="/api/v1/legajos/invalido/semaforo")[0] == 422


def test_semaforo_openapi(escenario):
    """Documenta la respuesta persistida y la autenticación Bearer."""
    operacion = escenario[0].openapi()["paths"]["/api/v1/legajos/{id}/semaforo"]["get"]
    assert operacion["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/SemaforoResponse")
    assert {"401", "403", "404", "422"} <= operacion["responses"].keys()
    assert operacion["security"] == [{"HTTPBearer": []}]


@pytest.mark.parametrize("vacio", [False, True])
def test_riesgo_http_formato_y_solo_lectura(escenario, vacio):
    """Devuelve una página con datos reales del modelo y sin métricas inventadas."""
    from src.inscripcion.infrastructure.orm_models import Legajo

    _, session, usuario, legajo_id, _, _ = escenario
    usuario.rol = "coordinador"
    cohorte = uuid4()
    fila = Legajo(id=legajo_id, nombre="Ana", apellido="Pérez", numero_legajo=None,
                  carrera_elegida="Maestría", tipo_carrera="Maestria", cohorte_id=cohorte,
                  fecha_inscripcion=None, semaforo="ROJO")
    session.scalar.return_value = 0 if vacio else 1
    session.scalars.return_value = [] if vacio else [fila]
    estado, respuesta = solicitar(escenario, metodo="GET", ruta="/api/v1/graduacion/en-riesgo")
    assert estado == 200
    esperado = dict(id=str(legajo_id), nombre="Ana", apellido="Pérez", numero_legajo=None,
                    carrera_elegida="Maestría", tipo_carrera="Maestria", cohorte_id=str(cohorte),
                    fecha_inscripcion=None, semaforo="ROJO")
    assert respuesta == dict(data=[] if vacio else [esperado], page=1, limit=20,
                            total=0 if vacio else 1, pages=0 if vacio else 1)
    session.add.assert_not_called()
    session.flush.assert_not_awaited()
    session.commit.assert_not_awaited()
    session.rollback.assert_not_awaited()


@pytest.mark.parametrize("rol", ["cpr", "admin", "docente", "estudiante"])
def test_riesgo_solo_coordinador(escenario, rol):
    """Rechaza otros roles sin consultar el listado."""
    escenario[2].rol = rol
    assert solicitar(escenario, metodo="GET", ruta="/api/v1/graduacion/en-riesgo")[0] == 403
    escenario[1].scalars.assert_not_awaited()


@pytest.mark.parametrize("token", [False, "invalido"])
def test_riesgo_requiere_autenticacion(escenario, token):
    """El listado no permite acceso anónimo ni tokens inválidos."""
    assert solicitar(escenario, metodo="GET", token=token, ruta="/api/v1/graduacion/en-riesgo")[0] == 401


@pytest.mark.parametrize("nombre,valor", [("page", "0"), ("limit", "101"),
                                         ("cohorte_id", "invalido"), ("tipo_carrera", "Otra")])
def test_riesgo_valida_query(escenario, nombre, valor):
    """FastAPI valida filtros y paginación antes de consultar."""
    from urllib.parse import urlencode
    escenario[2].rol = "coordinador"
    assert solicitar(escenario, metodo="GET", ruta="/api/v1/graduacion/en-riesgo",
                     query=urlencode({nombre: valor}))[0] == 422
    escenario[1].scalars.assert_not_awaited()


def test_riesgo_filtros_y_pagina_http(escenario):
    """Los filtros válidos llegan al SQL y el total representa todas las páginas."""
    escenario[2].rol = "coordinador"
    session = escenario[1]
    session.scalar.return_value = 5
    session.scalars.return_value = []
    cohorte = uuid4()
    estado, respuesta = solicitar(
        escenario, metodo="GET", ruta="/api/v1/graduacion/en-riesgo",
        query=f"page=2&limit=2&cohorte_id={cohorte}&tipo_carrera=Doctorado")
    assert estado == 200
    assert respuesta == dict(data=[], page=2, limit=2, total=5, pages=3)
    consulta = session.scalars.call_args.args[0]
    sql = str(consulta.compile(compile_kwargs={"literal_binds": True}))
    assert cohorte in consulta.compile().params.values()
    assert "Doctorado" in sql and "LIMIT 2 OFFSET 2" in sql


def test_riesgo_openapi(escenario):
    """Publica la página, parámetros y autenticación del listado."""
    operacion = escenario[0].openapi()["paths"]["/api/v1/graduacion/en-riesgo"]["get"]
    assert operacion["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/EstudiantesEnRiesgoPagina")
    assert {p["name"] for p in operacion["parameters"]} == {"page", "limit", "cohorte_id", "tipo_carrera"}
    assert operacion["security"] == [{"HTTPBearer": []}]
