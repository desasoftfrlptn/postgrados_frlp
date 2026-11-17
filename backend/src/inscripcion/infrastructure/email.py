import logging
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from html import escape

from src.core.config import settings
from src.shared.correo.cliente_smtp import enviar_mensaje_correo

logger = logging.getLogger(__name__)
_LOGO_UTN_URL = "https://www.frlp.utn.edu.ar/themes/custom/b5frlp/logo.svg"


def _crear_mensaje(
    destinatario: str,
    asunto: str,
    texto: str,
    contenido_html: str,
) -> EmailMessage:
    mensaje = EmailMessage()
    mensaje["Subject"] = asunto
    mensaje["From"] = settings.email_from
    mensaje["To"] = destinatario
    mensaje.set_content(texto)
    mensaje.add_alternative(
        f"""\
        <!doctype html>
        <html lang="es">
          <body style="margin:0;background:#f3f5f7;color:#20242a;font-family:Arial,sans-serif">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                   style="background:#f3f5f7;padding:24px 12px">
              <tr><td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0"
                       style="max-width:600px;background:#fff;border-radius:8px">
                  <tr><td style="padding:24px 32px;border-bottom:1px solid #e3e7eb">
                    <img src="{_LOGO_UTN_URL}" alt="Logo UTN Facultad Regional La Plata"
                         width="180" style="display:block;max-width:100%;height:auto">
                  </td></tr>
                  <tr><td style="padding:24px 32px;line-height:1.6">
                    {contenido_html}
                  </td></tr>
                  <tr><td style="padding:16px 32px;color:#59636e;font-size:13px;
                                 border-top:1px solid #e3e7eb">
                    Posgrado · Universidad Tecnológica Nacional · Facultad Regional La Plata
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body>
        </html>
        """,
        subtype="html",
    )
    return mensaje


def _enviar(mensaje: EmailMessage, contexto: str) -> None:
    try:
        enviar_mensaje_correo(mensaje)
    except (OSError, smtplib.SMTPException):
        logger.exception("No se pudo enviar %s", contexto)


def enviar_confirmacion_inscripcion(
    destinatario: str,
    nombre: str,
    codigo: str,
    token_propietario: str,
    token_expira_en: datetime,
) -> None:
    fecha_expiracion = token_expira_en.astimezone(timezone.utc).strftime(
        "%d/%m/%Y %H:%M UTC"
    )
    texto = (
        f"Hola {nombre},\n\n"
        "Recibimos tu inscripción. Su estado inicial es Pendiente.\n"
        f"Tu código de seguimiento es: {codigo}\n\n"
        "Para consultar tu legajo y cargar o descargar documentos, usá este "
        "token como Bearer en el encabezado Authorization:\n"
        f"{token_propietario}\n"
        f"El token vence el {fecha_expiracion}.\n"
    )
    mensaje = _crear_mensaje(
        destinatario,
        "Recibimos tu inscripción a Posgrado UTN FRLP",
        texto,
        (
            f"<p>Hola {escape(nombre)},</p>"
            "<p>Recibimos tu inscripción. Su estado inicial es "
            "<strong>Pendiente</strong>.</p>"
            f"<p>Tu código de seguimiento es: <strong>{escape(codigo)}</strong></p>"
            "<p>Para consultar tu legajo y cargar o descargar documentos, "
            "usá este token como Bearer en el encabezado Authorization:</p>"
            f"<p><code>{escape(token_propietario)}</code></p>"
            f"<p>El token vence el {escape(fecha_expiracion)}.</p>"
        ),
    )
    _enviar(mensaje, "una confirmación de inscripción")


def enviar_email_observacion(
    destinatario: str,
    nombre: str,
    comentario: str,
    legajo_id: str,
    token_correccion: str,
) -> None:
    endpoint = f"/api/v1/legajos/{legajo_id}/correccion"
    texto = (
        f"Hola {nombre},\n\n"
        f"Tu legajo fue observado: {comentario}\n\n"
        "Después de corregirlo, enviá una solicitud POST al endpoint "
        f"{endpoint} con el token de un solo uso "
        f"{token_correccion}.\n"
        "El token vence en 72 horas.\n"
    )
    mensaje = _crear_mensaje(
        destinatario,
        "Tu legajo requiere una corrección - Posgrado UTN FRLP",
        texto,
        (
            f"<p>Hola {escape(nombre)},</p>"
            f"<p>Tu legajo fue observado: <strong>{escape(comentario)}</strong></p>"
            "<p>Después de corregirlo, enviá una solicitud POST al endpoint "
            f"<code>{escape(endpoint)}</code> con el token de un solo uso:</p>"
            f"<p><code>{escape(token_correccion)}</code></p>"
            "<p>El token vence en 72 horas.</p>"
        ),
    )
    _enviar(mensaje, "el aviso de observación del legajo")


def enviar_email_aprobacion(
    destinatario: str,
    nombre: str,
    numero_legajo: str,
) -> None:
    texto = (
        f"Hola {nombre},\n\n"
        "Tu legajo fue aprobado y su estado es Completado.\n"
        f"Tu número de legajo es: {numero_legajo}.\n"
    )
    mensaje = _crear_mensaje(
        destinatario,
        "Tu legajo fue aprobado - Posgrado UTN FRLP",
        texto,
        (
            f"<p>Hola {escape(nombre)},</p>"
            "<p>Tu legajo fue aprobado y su estado es "
            "<strong>Completado</strong>.</p>"
            f"<p>Tu número de legajo es: <strong>{escape(numero_legajo)}</strong></p>"
        ),
    )
    _enviar(mensaje, "el aviso de aprobación del legajo")


def enviar_email_vencimiento_reservas(
    destinatario: str,
    legajos: list[tuple[str, str]],
) -> None:
    listado_texto = "\n".join(
        f"- {numero or identificador} (ID: {identificador})"
        for numero, identificador in legajos
    )
    listado_html = "".join(
        f"<li>{escape(numero or identificador)} "
        f"(ID: {escape(identificador)})</li>"
        for numero, identificador in legajos
    )
    texto = (
        "Se venció la reserva de vacante de los siguientes legajos, "
        "que pasaron de Completado a Vencido:\n\n"
        f"{listado_texto}\n"
    )
    mensaje = _crear_mensaje(
        destinatario,
        "Vencimiento de reservas de vacante - Posgrado UTN FRLP",
        texto,
        (
            "<p>Se venció la reserva de vacante de los siguientes legajos, "
            "que pasaron de <strong>Completado</strong> a <strong>Vencido</strong>:</p>"
            f"<ul>{listado_html}</ul>"
        ),
    )
    _enviar(mensaje, "el aviso de vencimiento de reservas")
