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


def enviar_email_observacion(
    destinatario: str,
    nombre: str,
    comentario: str,
    legajo_id: str,
    token_correccion: str,
) -> None:
    mensaje = EmailMessage()
    mensaje["Subject"] = "Tu legajo requiere una corrección - Posgrado UTN FRLP"
    mensaje["From"] = settings.email_from
    mensaje["To"] = destinatario
    mensaje.set_content(
        f"Hola {nombre},\n\n"
        f"Tu legajo fue observado: {comentario}\n\n"
        "Después de corregirlo, enviá una solicitud POST al endpoint "
        f"/api/v1/legajos/{legajo_id}/correccion con el token de un solo uso "
        f"{token_correccion}.\n"
        "El token vence en 72 horas.\n"
    )
    mensaje.add_alternative(
        f"""\
        <html>
          <body>
            <p>Hola {escape(nombre)},</p>
            <p>Tu legajo fue observado: {escape(comentario)}</p>
            <p>Después de corregirlo, enviá una solicitud POST al endpoint
            <code>/api/v1/legajos/{escape(legajo_id)}/correccion</code>
            con el token de un solo uso:</p>
            <p><code>{escape(token_correccion)}</code></p>
            <p>El token vence en 72 horas.</p>
          </body>
        </html>
        """,
        subtype="html",
    )

    try:
        enviar_mensaje_correo(mensaje)
    except (OSError, smtplib.SMTPException):
        logger.exception("No se pudo enviar el aviso de observación del legajo")
