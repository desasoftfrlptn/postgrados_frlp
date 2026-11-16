import smtplib
import ssl
from email.message import EmailMessage

from src.core.config import settings


def enviar_mensaje_correo(mensaje: EmailMessage) -> None:
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as servidor:
        if settings.smtp_starttls:
            servidor.starttls(context=ssl.create_default_context())
        if settings.smtp_user:
            servidor.login(settings.smtp_user, settings.smtp_password)
        servidor.send_message(mensaje)
