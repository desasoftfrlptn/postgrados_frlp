from collections.abc import Callable
from datetime import datetime, timezone
from email.message import EmailMessage

import pytest

from src.inscripcion.infrastructure import email as notificaciones


@pytest.mark.parametrize(
    ("enviar", "argumentos", "frase_esperada"),
    [
        (
            notificaciones.enviar_confirmacion_inscripcion,
            (
                "ana@example.com",
                "Ana",
                "seguimiento-123",
                "token-propietario",
                datetime(2026, 12, 16, tzinfo=timezone.utc),
            ),
            "Pendiente",
        ),
        (
            notificaciones.enviar_email_observacion,
            ("ana@example.com", "Ana", "<script>motivo</script>", "legajo-123", "token"),
            "motivo",
        ),
        (
            notificaciones.enviar_email_aprobacion,
            ("ana@example.com", "Ana", "26-001-001"),
            "Completado",
        ),
    ],
)
def test_notificaciones_se_envian_con_html_logo_y_version_de_texto(
    monkeypatch: pytest.MonkeyPatch,
    enviar: Callable[..., None],
    argumentos: tuple[object, ...],
    frase_esperada: str,
) -> None:
    mensajes: list[EmailMessage] = []
    monkeypatch.setattr(
        "src.inscripcion.infrastructure.email.enviar_mensaje_correo",
        mensajes.append,
    )

    enviar(*argumentos)

    assert len(mensajes) == 1
    html = mensajes[0].get_body(preferencelist=("html",)).get_content()
    texto = mensajes[0].get_body(preferencelist=("plain",)).get_content()
    assert frase_esperada in html
    assert "Logo UTN Facultad Regional La Plata" in html
    assert "https://www.frlp.utn.edu.ar/themes/custom/b5frlp/logo.svg" in html
    assert frase_esperada in texto
    if enviar is notificaciones.enviar_confirmacion_inscripcion:
        assert "token-propietario" in html
        assert "token-propietario" in texto
        assert "Bearer en el encabezado Authorization" in texto
        assert "16/12/2026 00:00 UTC" in html
    if "<script>" in argumentos:
        assert "&lt;script&gt;motivo&lt;/script&gt;" in html
        assert "<script>motivo</script>" not in html
