from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
import pytest
from fastapi import HTTPException
from src.configuracion_publica.presentacion import rutas
from src.configuracion_publica.presentacion.esquema import (
    ConsultaContactoCrear,
)
from src.conduccion.modelos import NotificacionConduccionORM
@pytest.mark.parametrize("falla_commit", [False, True])
async def test_contacto_guarda_o_revierte(db, monkeypatch, falla_commit):
    monkeypatch.setattr(rutas, "validar_limite_consultas", Mock())
    monkeypatch.setattr(
        rutas,
        "obtener_configuracion",
        AsyncMock(return_value={"email": "administracion@example.com"}),
    )

    consulta = ConsultaContactoCrear(
        nombre="Ana Pérez",
        email="ana@example.com",
        asunto="Información",
        mensaje="Quiero conocer las fechas de inscripción.",
    )
    request = SimpleNamespace(
        client=SimpleNamespace(host="127.0.0.1"),
    )

    if falla_commit:
        db.commit.side_effect = RuntimeError("Fallo de base simulado")

        with pytest.raises(HTTPException) as error:
            await rutas.enviar_consulta_contacto(consulta, request, db)

        assert error.value.status_code == 503
        db.rollback.assert_awaited_once()

    else:
        respuesta = await rutas.enviar_consulta_contacto(
            consulta, request, db
        )

        assert respuesta.mensaje == "Recibimos tu consulta correctamente."
        db.rollback.assert_not_awaited()

    db.commit.assert_awaited_once()
    db.add.assert_called_once()

    aviso = db.add.call_args.args[0]

    assert isinstance(aviso, NotificacionConduccionORM)
    assert aviso.destinatario == "administracion@example.com"
    assert aviso.responder_a == "ana@example.com"
    assert consulta.nombre in aviso.contenido
    assert consulta.asunto in aviso.contenido
    assert consulta.mensaje in aviso.contenido
    assert aviso.documento_id is None