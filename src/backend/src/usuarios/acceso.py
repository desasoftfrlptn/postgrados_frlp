import hashlib
import hmac
import os

from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlsplit
from uuid import UUID

from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.usuarios.modelos import UsuarioORM
from src.usuarios.seguridad import hash_password
from src.usuarios.servicio import SECRET_KEY, ALGORITHM


FINALIDAD = "activacion_cuenta"
VIGENCIA_HORAS = 24
FINALIDAD_RECUPERACION = "recuperacion_contrasena"


# Vincula el enlace con las credenciales actuales.
def huella_credencial(usuario) -> str:
    datos = (
        f"{usuario.id}:"
        f"{usuario.correo_electronico}:"
        f"{usuario.contrasena_hash}"
    )

    return hmac.new(
        SECRET_KEY.encode(),
        datos.encode(),
        hashlib.sha256,
    ).hexdigest()


# Genera un token exclusivo para activar la cuenta.
def crear_token_activacion(usuario, finalidad=FINALIDAD) -> str:
    return jwt.encode(
        {
            "sub": str(usuario.id),
            "finalidad": finalidad,
            "credencial": huella_credencial(usuario),
            "exp": datetime.now(timezone.utc)
            + timedelta(hours=VIGENCIA_HORAS if finalidad == FINALIDAD else 1),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def leer_token_activacion(token: str, finalidad=FINALIDAD) -> dict:
    try:
        datos = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            options={
                "require_exp": True,
                "require_sub": True,
            },
        )

        if datos.get("finalidad") != finalidad:
            raise ValueError()

        UUID(datos["sub"])

        if not isinstance(datos.get("credencial"), str):
            raise ValueError()

        return datos

    except (JWTError, ValueError, TypeError, KeyError):
        raise HTTPException(
            status_code=400,
            detail="El enlace no es válido, ha vencido o ya fue utilizado.",
        )


def validar_credencial_activacion(usuario, datos: dict):
    if (
        str(usuario.id) != datos["sub"]
        or not usuario.activo
        or (datos["finalidad"] == FINALIDAD and not usuario.debe_cambiar_contrasena)
        or not hmac.compare_digest(
            huella_credencial(usuario),
            datos["credencial"],
        )
    ):
        raise HTTPException(
            status_code=400,
            detail="El enlace no es válido, ha vencido o ya fue utilizado.",
        )


# Construye el enlace que recibira el usuario.
def construir_enlace_activacion(usuario, finalidad=FINALIDAD) -> str:
    base = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    url = urlsplit(base)

    if (
        url.scheme not in {"http", "https"}
        or not url.hostname
        or url.username
        or url.password
        or url.query
        or url.fragment
    ):
        raise RuntimeError(
            "FRONTEND_URL no esta configurada correctamente."
        )

    if (
        url.scheme != "https"
        and url.hostname not in {"localhost", "127.0.0.1"}
    ):
        raise RuntimeError(
            "El acceso remoto debe utilizar HTTPS."
        )

    parametros = urlencode({
        "token": crear_token_activacion(usuario, finalidad),
    })

    ruta = "activar-cuenta" if finalidad == FINALIDAD else "restablecer-contrasena"
    return f"{base}/{ruta}#{parametros}"


async def obtener_usuario_enlace(token, db, finalidad=FINALIDAD, bloquear=False):
    datos = leer_token_activacion(token, finalidad)
    consulta = select(UsuarioORM).where(UsuarioORM.id == UUID(datos["sub"]))
    if bloquear:
        consulta = consulta.with_for_update()
    usuario = await db.scalar(consulta.execution_options(populate_existing=True))
    if usuario is None:
        raise HTTPException(
            status_code=400,
            detail="El enlace no es válido, ha vencido o ya fue utilizado.",
        )

    validar_credencial_activacion(usuario, datos)
    from src.usuarios.cuentas_academicas import validar_identidad_alumno
    from src.usuarios.modelos import RolORM
    rol = await db.get(RolORM, usuario.rol_id)
    if rol is None or rol.nombre == "ASPIRANTE":
        raise HTTPException(400, "La cuenta no está habilitada.")
    if rol.nombre == "ALUMNO":
        await validar_identidad_alumno(db, usuario.dni, usuario.correo_electronico)

    return usuario


# Establece la contrasena y consume el enlace.
async def activar_cuenta(
    token: str,
    contrasena_nueva: str,
    repetir_contrasena: str,
    db: AsyncSession,
    finalidad=FINALIDAD,
):
    if contrasena_nueva != repetir_contrasena:
        raise HTTPException(
            status_code=400,
            detail="Las contrasenas no coinciden.",
        )

    if not 8 <= len(contrasena_nueva) <= 128:
        raise HTTPException(
            status_code=400,
            detail="La contrasena debe contener entre 8 y 128 caracteres.",
        )

    try:
        usuario = await obtener_usuario_enlace(token, db, finalidad, bloquear=True)
        usuario.contrasena_hash = hash_password(
            contrasena_nueva
        )

        usuario.debe_cambiar_contrasena = False

        await db.commit()

    except Exception:
        await db.rollback()
        raise
