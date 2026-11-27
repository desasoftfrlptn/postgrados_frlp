from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from jose import jwt

from src.compartido.conexion import get_db
from src.conduccion.modelos import AuditoriaConduccionORM
from src.inscripcion.presentacion import documentos_rutas as documentos
from src.usuarios import servicio as s
from src.usuarios.seguridad import verificar_password


@pytest.mark.parametrize("exp", [None, "sin-fecha", [], {}, True, float("nan"), float("inf")])
async def test_no_admite_jwt_sin_vencimiento_valido(exp, db):
    payload = {"sub": str(uuid4())}
    if exp is not None:
        payload["exp"] = exp
    token = jwt.encode(payload, s.SECRET_KEY, algorithm=s.ALGORITHM)
    with pytest.raises(HTTPException) as error:
        await s.obtener_usuario_actual(token, db)
    assert error.value.status_code == 401
    assert error.value.headers == {"WWW-Authenticate": "Bearer"}
    db.scalar.assert_not_awaited()


def test_hash_corrupto_no_produce_error_500():
    assert verificar_password("secreto", "no-es-un-hash") is False


@pytest.mark.parametrize("authorization", [None, "Basic abc", "Bearer"])
def test_credencial_ausente_o_malformada_es_401(cliente, authorization):
    headers = {} if authorization is None else {"Authorization": authorization}
    respuesta = cliente.get("/api/v1/autenticacion/me", headers=headers)
    assert respuesta.status_code == 401
    assert respuesta.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize("campo", ["nombre", "apellido", "dni"])
async def test_edicion_no_acepta_blancos(campo, db, usuario, monkeypatch):
    monkeypatch.setattr(s, "buscar_usuario_con_rol", AsyncMock(return_value=usuario))
    datos = dict(nombre="Ana", apellido="Perez", dni="12345678",
                 correo_electronico="ana@example.com", tipo_usuario="DOCENTE")
    datos[campo] = "   "
    with pytest.raises(HTTPException) as error:
        await s.modificar_usuario(usuario.id, **datos, db=db)
    assert error.value.status_code == 400
    db.commit.assert_not_awaited()


async def test_administrador_no_puede_quitarse_el_rol(db, usuario, monkeypatch):
    usuario.rol.nombre = "ADMIN"
    monkeypatch.setattr(s, "buscar_usuario_con_rol", AsyncMock(return_value=usuario))
    with pytest.raises(HTTPException) as error:
        await s.modificar_usuario(usuario.id, "Ana", "Perez", "12345678",
                                  "ana@example.com", "ASPIRANTE", db, usuario)
    assert error.value.status_code == 400
    db.commit.assert_not_awaited()


async def test_edicion_audita_actor_y_cambio_rol_sin_secretos(db, usuario, monkeypatch):
    actor = SimpleNamespace(id=uuid4(), rol=SimpleNamespace(nombre="ADMIN"))
    rol_anterior = str(usuario.rol_id)
    nuevo_rol = SimpleNamespace(id=uuid4())
    db.scalar.side_effect = [None, None, nuevo_rol]
    monkeypatch.setattr(s, "buscar_usuario_con_rol", AsyncMock(return_value=usuario))
    await s.modificar_usuario(usuario.id, "Ana", "Perez", "12345678",
                              "ana@example.com", "DOCENTE", db, actor)
    evento = db.add.call_args.args[0]
    assert isinstance(evento, AuditoriaConduccionORM)
    assert evento.actor_id == actor.id
    assert evento.recurso_id == usuario.id
    assert evento.anterior["rol_id"] == rol_anterior
    assert evento.nuevo["rol_id"] == str(nuevo_rol.id)
    assert "contrasena_hash" not in evento.nuevo
    assert "contrasena" not in evento.nuevo
    db.commit.assert_awaited_once()


@pytest.mark.parametrize("activo", [True, False])
async def test_cambio_estado_auditado(db, usuario, monkeypatch, activo):
    actor = SimpleNamespace(id=uuid4(), rol=SimpleNamespace(nombre="ADMIN"))
    monkeypatch.setattr(s, "buscar_usuario_con_rol", AsyncMock(return_value=usuario))
    await s.cambiar_estado_usuario(usuario.id, activo, actor, db)
    evento = db.add.call_args.args[0]
    assert evento.accion == ("ACTIVAR_USUARIO" if activo else "DESACTIVAR_USUARIO")
    assert evento.nuevo["activo"] is activo


@pytest.fixture
def descarga(db, usuario, tmp_path, monkeypatch):
    usuario.debe_cambiar_contrasena = False
    app = FastAPI()
    app.include_router(documentos.enrutador)
    async def sesion():
        yield db
    app.dependency_overrides[get_db] = sesion
    documento_id, legajo_id = uuid4(), uuid4()
    carpeta = tmp_path / str(legajo_id)
    carpeta.mkdir()
    archivo = carpeta / "dni.pdf"
    archivo.write_bytes(b"%PDF-1.4\nPrueba")
    documento = SimpleNamespace(id=documento_id, legajo_id=legajo_id, path=str(archivo))
    legajo = SimpleNamespace(id=legajo_id, correo_electronico=usuario.correo_electronico,
                             dni_pasaporte=usuario.dni)
    db.scalar.return_value = usuario
    db.get.side_effect = [documento, legajo]
    monkeypatch.setattr(documentos, "CARPETA_DOCUMENTOS", tmp_path)
    token = s.crear_token(usuario.id, usuario.rol.nombre)
    with TestClient(app) as client:
        yield client, f"/api/v1/documentos/{documento_id}/download", {
            "Authorization": f"Bearer {token}"
        }, documento, legajo


def test_descarga_autorizada(descarga, usuario):
    client, ruta, headers, _, _ = descarga
    usuario.rol.nombre = "COORDINADOR"
    respuesta = client.get(ruta, headers=headers)
    assert respuesta.status_code == 200
    assert respuesta.content.startswith(b"%PDF-")
    assert respuesta.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("rol", ["ADMIN", "DOCENTE", "CPR", "ASPIRANTE", "ALUMNO"])
def test_descarga_rol_no_autorizado(descarga, usuario, db, rol):
    client, ruta, headers, _, _ = descarga
    usuario.rol.nombre = rol
    assert client.get(ruta, headers=headers).status_code == 403
    db.get.assert_not_awaited()


def test_coordinador_sin_activar_no_descarga(descarga, usuario, db):
    client, ruta, headers, _, _ = descarga
    usuario.rol.nombre = "COORDINADOR"
    usuario.debe_cambiar_contrasena = True
    assert client.get(ruta, headers=headers).status_code == 403
    db.get.assert_not_awaited()


def test_no_descarga_documento_sin_legajo(descarga, usuario, db):
    client, ruta, headers, documento, _ = descarga
    usuario.rol.nombre = "COORDINADOR"
    db.get.side_effect = [documento, None]
    assert client.get(ruta, headers=headers).status_code == 404


def test_descarga_anonima(descarga, db):
    client, ruta, _, _, _ = descarga
    assert client.get(ruta).status_code == 401
    db.get.assert_not_awaited()


def test_no_descarga_archivo_fuera_del_legajo(descarga, tmp_path, usuario):
    usuario.rol.nombre = "COORDINADOR"
    client, ruta, headers, documento, _ = descarga
    ajeno = tmp_path / "secreto.pdf"
    ajeno.write_bytes(b"%PDF-secreto")
    documento.path = str(ajeno)
    assert client.get(ruta, headers=headers).status_code == 404


def test_uploads_no_expone_documentos_privados():
    from main import app
    from starlette.routing import Mount
    montajes = [ruta.path for ruta in app.routes if isinstance(ruta, Mount)]
    assert montajes == ["/uploads/noticias"]


@pytest.mark.parametrize("rol", ["ASPIRANTE", "DOCENTE", "COORDINADOR", "CPR"])
def test_auditoria_usuarios_solo_admin(cliente, db, usuario, rol):
    usuario.rol.nombre = rol
    db.scalar.return_value = usuario
    token = s.crear_token(usuario.id, rol)
    respuesta = cliente.get(f"/api/v1/autenticacion/usuarios/{uuid4()}/auditoria",
                            headers={"Authorization": f"Bearer {token}"})
    assert respuesta.status_code == 403


async def test_docente_no_inscribe_en_seminario_ajeno(db, usuario):
    from src.seminarios.presentacion.rutas import inscribir_estudiante_en_seminario
    from src.seminarios.presentacion.esquema import InscripcionSeminarioCrear
    usuario.rol.nombre = "DOCENTE"
    db.scalar.return_value = SimpleNamespace(docente_id=uuid4())
    with pytest.raises(HTTPException) as error:
        await inscribir_estudiante_en_seminario(
            uuid4(), InscripcionSeminarioCrear(dni_pasaporte="12345678"), db, usuario,
        )
    assert error.value.status_code == 403
    db.add.assert_not_called()
    db.commit.assert_not_awaited()


async def test_consulta_cursada_exige_correo_y_dni(db):
    from src.seminarios.aplicacion.servicio import listar_cursada_estudiante
    assert await listar_cursada_estudiante("ana@example.com", "12345678", db) == []
    consulta = db.execute.call_args.args[0]
    sql = str(consulta)
    assert "lower(legajos.correo_electronico)" in sql
    assert "legajos.dni_pasaporte" in sql
    assert " AND " in sql
    assert " OR " not in sql
    assert {"ana@example.com", "12345678"}.issubset(consulta.compile().params.values())


async def test_alta_auditada(db, usuario, monkeypatch):
    actor = SimpleNamespace(id=uuid4(), rol=SimpleNamespace(nombre="ADMIN"))
    db.scalar.side_effect = [None, None, SimpleNamespace(id=uuid4())]
    monkeypatch.setattr(s, "buscar_usuario_con_rol", AsyncMock(return_value=usuario))
    await s.crear_usuario("Ana", "Perez", "12345678", "ana@example.com",
                          "ClavePrueba123!", "DOCENTE", db, actor)
    nuevo, evento = [llamada.args[0] for llamada in db.add.call_args_list]
    assert evento.accion == "CREAR_USUARIO"
    assert evento.recurso_id == nuevo.id
    assert evento.actor_id == actor.id
    assert "contrasena_hash" not in evento.nuevo


async def test_error_integridad_revierte_operacion_y_auditoria(db, usuario, monkeypatch):
    from sqlalchemy.exc import IntegrityError
    actor = SimpleNamespace(id=uuid4(), rol=SimpleNamespace(nombre="ADMIN"))
    db.scalar.side_effect = [None, None, SimpleNamespace(id=uuid4())]
    monkeypatch.setattr(s, "buscar_usuario_con_rol", AsyncMock(return_value=usuario))
    db.commit.side_effect = IntegrityError("update", {}, Exception("duplicado"))
    with pytest.raises(HTTPException):
        await s.modificar_usuario(usuario.id, "Ana", "Perez", "12345678",
                                  "ana@example.com", "DOCENTE", db, actor)
    assert db.add.call_args.args[0].accion == "EDITAR_USUARIO"
    db.rollback.assert_awaited_once()


def test_auditoria_admin_devuelve_eventos_sin_secretos(cliente, db, usuario):
    from unittest.mock import MagicMock
    from datetime import datetime, timezone
    usuario.rol.nombre = "ADMIN"
    db.scalar.return_value = usuario
    evento = SimpleNamespace(id=uuid4(), actor_id=usuario.id, actor_rol="ADMIN",
                              accion="EDITAR_USUARIO", fecha=datetime.now(timezone.utc),
                              anterior={"activo": True}, nuevo={"activo": False})
    db.scalars = AsyncMock(return_value=MagicMock(__iter__=lambda self: iter([evento])))
    token = s.crear_token(usuario.id, "ADMIN")
    respuesta = cliente.get(f"/api/v1/autenticacion/usuarios/{uuid4()}/auditoria",
                            headers={"Authorization": f"Bearer {token}"})
    assert respuesta.status_code == 200
    assert respuesta.json()[0]["accion"] == "EDITAR_USUARIO"
