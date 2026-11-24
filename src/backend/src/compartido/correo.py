"""Servicio compartido para el envio de correos electronicos."""

import os
import ssl
import smtplib

from email.message import EmailMessage
from html import escape
from pathlib import Path
from urllib.parse import urlsplit


TAMANIO_MAXIMO_PDF = 5 * 1024 * 1024


def renderizar_correo_institucional(asunto: str, contenido: str) -> str:
    """Presentación compartida; los textos de usuarios nunca se interpretan como HTML."""
    titulo = escape(asunto)
    partes = []
    base = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if not base and os.getenv("ENVIRONMENT") == "development":
        base = "http://localhost:3000"
    for linea in contenido.split("\n"):
        segura = escape(linea)
        if base and asunto.startswith(("Activación de cuenta |", "Recuperación de contraseña |")) and linea.startswith((base + "/activar-cuenta#token=", base + "/restablecer-contrasena#token=")) and urlsplit(linea).scheme in {"https", "http"}:
            segura = f'<a href="{escape(linea, quote=True)}" style="display:inline-block;background:#341478;color:white;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Establecer contraseña</a>'
        if (base and asunto == "Corrección de inscripción"
                and linea.startswith(base + "/estado-inscripcion#correccion=")
                and urlsplit(linea).scheme in {"https", "http"}):
            segura = f'<a href="{escape(linea, quote=True)}" style="display:inline-block;background:#341478;color:white;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Abrir inscripción y corregir datos</a>'
        partes.append(segura)
    cuerpo = "<br>\n".join(partes)
    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#eef1f5;font-family:Arial,sans-serif;color:#1e293b">
<table role="presentation" width="100%" cellspacing="0" cellpadding="16"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:white;border:1px solid #dbe1e8;border-radius:12px">
<tr><td style="background:#142c4e;color:white;padding:24px"><strong style="font-size:24px">UTN FRLP</strong><br>Departamento de Posgrado</td></tr>
<tr><td style="padding:28px;overflow-wrap:anywhere"><h1 style="font-size:23px;color:#142c4e;margin:0 0 20px">{titulo}</h1><div style="font-size:16px;line-height:1.65">{cuerpo}</div></td></tr>
<tr><td style="padding:20px;background:#f1f5f9;text-align:center;font-size:13px;line-height:1.6;color:#475569">Universidad Tecnológica Nacional<br>Facultad Regional La Plata<br>Comunicación del sistema de Posgrados</td></tr>
</table></td></tr></table></body></html>"""


def enviar_correo(
    destinatario: str,
    asunto: str,
    contenido: str,
    ruta_pdf: str | Path | None = None,
    responder_a: str | None = None,
) -> None:
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    puerto = int(os.getenv("SMTP_PORT", "587"))

    usuario = os.getenv("SMTP_USER")
    clave = os.getenv("SMTP_PASSWORD")
    remitente = os.getenv("SMTP_FROM") or usuario

    if not usuario or not clave or not remitente:
        raise RuntimeError(
            "La configuracion SMTP esta incompleta."
        )

    mensaje = EmailMessage()
    mensaje["From"] = remitente
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto

    if responder_a:
        mensaje["Reply-To"] = responder_a

    mensaje.set_content(contenido)
    mensaje.add_alternative(renderizar_correo_institucional(asunto, contenido), subtype="html")

    if ruta_pdf is not None:
        with Path(ruta_pdf).open("rb") as archivo:
            datos = archivo.read(TAMANIO_MAXIMO_PDF + 1)

        if len(datos) > TAMANIO_MAXIMO_PDF:
            raise ValueError("El PDF supera los 5 MB.")

        if not datos.startswith(b"%PDF-"):
            raise ValueError("El adjunto no es un PDF valido.")

        mensaje.add_attachment(
            datos,
            maintype="application",
            subtype="pdf",
            filename="formulario_inscripcion.pdf",
        )

    contexto_tls = ssl.create_default_context()

    with smtplib.SMTP(host, puerto, timeout=15) as smtp:
        smtp.ehlo()
        smtp.starttls(context=contexto_tls)
        smtp.ehlo()
        smtp.login(usuario, clave)
        smtp.send_message(mensaje)
