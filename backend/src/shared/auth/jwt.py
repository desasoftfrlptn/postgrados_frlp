##Este archivo va a generar un token con el ID del usuario y su vencimiento.

import os
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from dotenv import load_dotenv

load_dotenv()

ALGORITMO = "HS256"


def _obtener_secreto() -> str:
    secreto = os.getenv("JWT_SECRET", "")
    if len(secreto.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET debe tener al menos 32 bytes.")
    return secreto


def crear_token_acceso(usuario_id: UUID) -> str:
    expiracion = os.getenv("JWT_EXPIRATION", "8h")
    if not expiracion.endswith("h") or not expiracion[:-1].isdecimal():
        raise RuntimeError("JWT_EXPIRATION debe estar en horas, por ejemplo 8h.")

    horas = int(expiracion[:-1])
    if horas < 1:
        raise RuntimeError("JWT_EXPIRATION debe ser de al menos una hora.")

    return jwt.encode(
        {
            "sub": str(usuario_id),
            "exp": datetime.now(timezone.utc) + timedelta(hours=horas),
            "tipo": "access",
        },
        _obtener_secreto(),
        algorithm=ALGORITMO,
    )


def obtener_id_usuario(token: str) -> UUID:
    datos = jwt.decode(
        token,
        _obtener_secreto(),
        algorithms=[ALGORITMO],
        options={"require": ["sub", "exp", "tipo"]},
    )

    if datos["tipo"] != "access":
        raise jwt.InvalidTokenError("Se requiere un token de acceso.")

    try:
        return UUID(datos["sub"])
    except ValueError as exc:
        raise jwt.InvalidTokenError("El ID de usuario del token es inválido.") from exc