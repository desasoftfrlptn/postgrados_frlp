"""Envío de emails con plantillas HTML.

Lo usan las tres historias de notificaciones:
- US-CORE-006: aviso al aspirante cuando cambia el estado de su legajo
- US-CORE-010: aviso al coordinador cuando vence una reserva
- US-B-005: recordatorio al docente con notas pendientes

En desarrollo los mails van a MailHog (http://localhost:8025): no salen a internet.
"""

import os
from email.message import EmailMessage
from pathlib import Path

import aiosmtplib
from dotenv import load_dotenv
from jinja2 import Environment, FileSystemLoader, select_autoescape

load_dotenv()

# ---------- Configuración (desde el .env) ----------

SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
SMTP_USER = os.getenv("SMTP_USER") or None          # vacío en desarrollo
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD") or None  # vacío en desarrollo
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@posgrado.frlp.utn.edu.ar")
LOGO_URL = os.getenv("EMAIL_LOGO_URL", "")          # va en el encabezado de todas las plantillas

# ---------- Plantillas ----------

CARPETA_PLANTILLAS = Path(__file__).parent / "templates"

# autoescape: si un dato trae HTML (por ejemplo, el detalle de una observación
# que escribió alguien), se muestra como texto y no se ejecuta. Evita inyectar
# código en el mail (XSS).
plantillas = Environment(
    loader=FileSystemLoader(CARPETA_PLANTILLAS),
    autoescape=select_autoescape(["html"]),
)


def renderizar(plantilla: str, datos: dict) -> str:
    """Completa la plantilla: reemplaza cada {{variable}} por su dato."""
    return plantillas.get_template(plantilla).render(logo_url=LOGO_URL, **datos)


# ---------- Envío ----------

async def enviar_email(destinatario: str, asunto: str, plantilla: str, datos: dict) -> None:
    """Manda un mail HTML armado con una plantilla de templates/.

    Ejemplo:
        await enviar_email(
            "ana@mail.com",
            "Recibimos tu inscripción",
            "pendiente.html",
            {"nombre_aspirante": "Ana", "carrera": "Maestría", "fecha_envio": "09/11/2026"},
        )
    """
    mensaje = EmailMessage()
    mensaje["From"] = EMAIL_FROM
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    # Texto plano de respaldo, para clientes de correo que no muestran HTML
    mensaje.set_content("Este mensaje necesita un cliente de correo que muestre HTML.")
    mensaje.add_alternative(renderizar(plantilla, datos), subtype="html")

    # async: mientras se manda el mail, el servidor sigue atendiendo otros pedidos
    await aiosmtplib.send(
        mensaje,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=SMTP_USER,
        password=SMTP_PASSWORD,
    )