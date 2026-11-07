import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.shared.auth.orm_models import SesionRefresh

from sqlalchemy import update

from sqlalchemy import select
from src.shared.auth.jwt import crear_token_acceso
from src.shared.auth.orm_models import Usuario

def crear_sesion_refresh(db: AsyncSession, usuario_id: UUID) -> str:
    expiracion = os.getenv("JWT_REFRESH_EXPIRATION", "7d")

    if not expiracion.endswith("d") or not expiracion[:-1].isdecimal():
        raise RuntimeError(
            "JWT_REFRESH_EXPIRATION debe estar en días, por ejemplo 7d."
        )

    dias = int(expiracion[:-1])
    if dias < 1:
        raise RuntimeError("El refresh token debe durar al menos un día.")

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    sesion = SesionRefresh(
        usuario_id=usuario_id,
        token_hash=token_hash,
        fecha_expiracion=datetime.now(timezone.utc) + timedelta(days=dias),
    )
    db.add(sesion)

    return token

async def renovar_sesion(
    db: AsyncSession,
    token: str,
) -> tuple[str, str]:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    consulta = (
        select(SesionRefresh)
        .where(SesionRefresh.token_hash == token_hash)
        .with_for_update()  ##El bloqueo with_for_update() permite que dos 
        ##solicitudes concurrentes no renueven correctamente el mismo refresh token.
    )
    resultado = await db.execute(consulta)
    sesion = resultado.scalar_one_or_none()

    ahora = datetime.now(timezone.utc)

    if (
        sesion is None
        or sesion.revocada_en is not None
        or sesion.fecha_expiracion <= ahora
    ):
        raise ValueError("Sesión inválida o vencida")

    usuario = await db.get(Usuario, sesion.usuario_id)

    if usuario is None or not usuario.activo:
        raise ValueError("Sesión inválida o vencida")

    access_token = crear_token_acceso(usuario.id)
    refresh_token = crear_sesion_refresh(db, usuario.id)
    sesion.revocada_en = ahora

    await db.commit()

    return access_token, refresh_token

async def revocar_sesion(db: AsyncSession, token: str) -> None:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    consulta = (
        update(SesionRefresh)
        .where(
            SesionRefresh.token_hash == token_hash,
            SesionRefresh.revocada_en.is_(None),
        )
        .values(revocada_en=datetime.now(timezone.utc))
    )

    await db.execute(consulta)
    await db.commit()