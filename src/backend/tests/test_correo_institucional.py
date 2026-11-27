from unittest.mock import patch
from src.compartido.correo import enviar_correo, renderizar_correo_institucional


def test_escapa_contenido_html():
    html = renderizar_correo_institucional('Inscripción <test>', 'Hola <script>alert(1)</script>\nCarrera: Datos')
    assert 'UTN FRLP' in html
    assert '&lt;script&gt;' in html
    assert '<script>' not in html
    assert 'Inscripción &lt;test&gt;' in html
    assert '<br>' in html


def test_correo_conserva_texto_y_adjunto(monkeypatch, tmp_path):
    monkeypatch.setenv('SMTP_USER', 'prueba@example.com')
    monkeypatch.setenv('SMTP_PASSWORD', 'solo-pruebas')
    monkeypatch.setenv('SMTP_FROM', 'prueba@example.com')
    pdf = tmp_path / 'formulario.pdf'
    pdf.write_bytes(b'%PDF-1.4\n')
    with patch('src.compartido.correo.smtplib.SMTP') as smtp:
        enviar_correo('destino@example.com', 'Inscripción', 'Contenido original', pdf, 'respuesta@example.com')
        mensaje = smtp.return_value.__enter__.return_value.send_message.call_args.args[0]
        assert mensaje.get_body(('plain',)).get_content().strip() == 'Contenido original'
        assert 'UTN FRLP' in mensaje.get_body(('html',)).get_content()
        assert mensaje['Reply-To'] == 'respuesta@example.com'
        assert next(mensaje.iter_attachments()).get_payload(decode=True) == pdf.read_bytes()


def test_correo_recuperacion_tiene_boton_y_enlace_en_texto(monkeypatch):
    monkeypatch.setenv('FRONTEND_URL', 'http://localhost:3000')
    enlace = 'http://localhost:3000/restablecer-contrasena#token=prueba'
    html = renderizar_correo_institucional('Recuperación de contraseña | Posgrados UTN FRLP', enlace)
    assert f'href="{enlace}"' in html
    assert 'Establecer contraseña' in html
    assert 'UTN FRLP' in html
