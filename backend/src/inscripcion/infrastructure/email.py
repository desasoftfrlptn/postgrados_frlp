import logging
import smtplib
from email.message import EmailMessage
from html import escape

from src.core.config import settings
from src.shared.correo.cliente_smtp import enviar_mensaje_correo

logger = logging.getLogger(__name__)


def enviar_confirmacion_inscripcion(destinatario: str, nombre: str, codigo: str) -> None:
    mensaje = EmailMessage()
    mensaje["Subject"] = "Recibimos tu inscripción a Posgrado UTN FRLP"
    mensaje["From"] = settings.email_from
    mensaje["To"] = destinatario
    mensaje.set_content(
        f"Hola {nombre},\n\n"
        "Recibimos tu inscripción. Su estado inicial es Pendiente.\n"
        f"Tu código de seguimiento es: {codigo}\n\n"
        "Conservá este código para futuras consultas.\n"
    )
    mensaje.add_alternative(
        f"""\
        <html>
          <body>
            <p>Hola {escape(nombre)},</p>
            <p>Recibimos tu inscripción. Su estado inicial es <strong>Pendiente</strong>.</p>
            <p>Tu código de seguimiento es: <strong>{escape(codigo)}</strong></p>
            <p>Conservá este código para futuras consultas.</p>
          </body>
        </html>
        """,
        subtype="html",
    )

    try:
        enviar_mensaje_correo(mensaje)
    except (OSError, smtplib.SMTPException):
        logger.exception("No se pudo enviar una confirmación de inscripción")
