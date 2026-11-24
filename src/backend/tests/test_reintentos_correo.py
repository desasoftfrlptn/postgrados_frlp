from smtplib import SMTPException
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, Mock
from src.conduccion import tareas
async def test_reintenta_correo_y_conserva_responder_a(monkeypatch):
    aviso = SimpleNamespace(
        destinatario="administracion@example.com",
        asunto="Consulta de prueba",
        contenido="Necesito información.",
        responder_a="visitante@example.com",
        documento_id=None,
        enviado=False,
        intentos=0,
        ultimo_error=None,
        fecha_envio=None,
    )
    resultado = MagicMock()
    resultado.scalars.return_value.all.return_value = [aviso]
    db = MagicMock()
    db.execute = AsyncMock(return_value=resultado)
    db.commit = AsyncMock()
    contexto = MagicMock()
    contexto.__aenter__ = AsyncMock(return_value=db)
    contexto.__aexit__ = AsyncMock(return_value=False)

    monkeypatch.setattr(
        tareas,
        "AsyncSessionLocal",
        Mock(return_value=contexto),
    )

    enviar = Mock(side_effect=[SMTPException("Fallo simulado"), None])
    monkeypatch.setattr(tareas, "enviar_correo", enviar)

    primer_resultado = await tareas.procesar_notificaciones()

    assert primer_resultado == {"enviados": 0, "fallidos": 1}
    assert aviso.enviado is False
    assert aviso.intentos == 1
    assert aviso.ultimo_error == "SMTPException"
    assert aviso.fecha_envio is None
    db.commit.assert_awaited_once()

    segundo_resultado = await tareas.procesar_notificaciones()

    assert segundo_resultado == {"enviados": 1, "fallidos": 0}
    assert aviso.enviado is True
    assert aviso.intentos == 2
    assert aviso.ultimo_error is None
    assert aviso.fecha_envio is not None
    assert db.commit.await_count == 2
    assert enviar.call_count == 2

    for llamada in enviar.call_args_list:
        assert llamada.args == (
            aviso.destinatario,
            aviso.asunto,
            aviso.contenido,
        )
        assert llamada.kwargs == {
            "ruta_pdf": None,
            "responder_a": "visitante@example.com",
        }