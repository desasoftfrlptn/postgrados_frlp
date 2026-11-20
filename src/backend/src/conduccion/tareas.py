import argparse
import asyncio
import os
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import select
from src.compartido.conexion import (
    AsyncSessionLocal,
    engine,
)
from src.carreras import modelos as _carreras
from src.inscripcion.infraestructura import (
    cohortes_modelos as _cohortes,
    documentos_modelos as _documentos,
    orm_modelos as _legajos,
)
from src.usuarios import modelos as _usuarios

from src.conduccion.modelos import (
    NotificacionConduccionORM,
)
from src.conduccion.servicio import (
    ejecutar_transaccion,
    vencer_reservas,
)


def enviar_correo(destinatario, asunto, contenido):
    host = os.getenv("SMTP_HOST")

    if not host:
        raise RuntimeError("SMTP_HOST no está configurado.")

    puerto = int(os.getenv("SMTP_PORT", "1025"))
    remitente = os.getenv(
        "SMTP_FROM",
        "posgrado@example.com",
    )

    mensaje = EmailMessage()
    mensaje["From"] = remitente
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    mensaje.set_content(contenido)

    with smtplib.SMTP(host, puerto, timeout=15) as smtp:
        if os.getenv("SMTP_STARTTLS", "false").lower() == "true":
            smtp.starttls()

        usuario = os.getenv("SMTP_USER")
        clave = os.getenv("SMTP_PASSWORD")

        if usuario:
            smtp.login(usuario, clave or "")

        smtp.send_message(mensaje)


async def procesar_notificaciones():
    enviados = 0
    fallidos = 0

    async with AsyncSessionLocal() as db:
        resultado = await db.execute(
            select(NotificacionConduccionORM)
            .where(
                NotificacionConduccionORM.enviado.is_(False),
                NotificacionConduccionORM.intentos < 5,
            )
            .order_by(
                NotificacionConduccionORM.fecha_creacion,
            )
            .limit(50)
            .with_for_update(skip_locked=True)
        )

        for notificacion in resultado.scalars().all():
            notificacion.intentos += 1

            try:
                await asyncio.to_thread(
                    enviar_correo,
                    notificacion.destinatario,
                    notificacion.asunto,
                    notificacion.contenido,
                )

                notificacion.enviado = True
                notificacion.fecha_envio = datetime.now(
                    timezone.utc
                )
                notificacion.ultimo_error = None
                enviados += 1

            except Exception as exc:
                notificacion.ultimo_error = type(exc).__name__
                fallidos += 1

        await db.commit()

    return {
        "enviados": enviados,
        "fallidos": fallidos,
    }


async def ejecutar():
    async with AsyncSessionLocal() as db:
        vencimientos = await ejecutar_transaccion(
            db,
            lambda: vencer_reservas(db),
        )

    notificaciones = await procesar_notificaciones()

    print(
        {
            "reservas_vencidas": vencimientos["cantidad"],
            **notificaciones,
        }
    )


async def principal(repetir):
    try:
        while True:
            await ejecutar()

            if not repetir:
                break

            await asyncio.sleep(24 * 60 * 60)

    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--repetir",
        action="store_true",
        help="Ejecutar al iniciar y luego cada 24 horas.",
    )

    argumentos = parser.parse_args()

    asyncio.run(principal(argumentos.repetir))