"""Servicio compartido para el envio de correos electronicos."""

import os
import ssl
import smtplib

from email.message import EmailMessage


def enviar_correo(
    destinatario: str,
    asunto: str,
    contenido: str,
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
    mensaje.set_content(contenido)

    contexto_tls = ssl.create_default_context()

    with smtplib.SMTP(
        host,
        puerto,
        timeout=15,
    ) as smtp:
        smtp.ehlo()
        smtp.starttls(context=contexto_tls)
        smtp.ehlo()
        smtp.login(usuario, clave)
        smtp.send_message(mensaje)
