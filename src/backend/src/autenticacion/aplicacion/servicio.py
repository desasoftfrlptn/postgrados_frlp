import os
from datetime import datetime, timedelta, timezone
from uuid import UUID
from dotenv import load_dotenv
from fastapi import HTTPException
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


from src.autenticacion.aplicacion.seguridad import verificar_password
from src.autenticacion.infraestructura.orm_modelos import UsuarioORM

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("Falta definir SECRET_KEY")

ALGORITHM = "HS256"
EXPIRACION_MINUTOS = 60


async def iniciar_sesion(
    correo: str,
    contrasena: str,
    db: AsyncSession,
) -> tuple[UsuarioORM, str]:
    consulta = (
        select(UsuarioORM)
        .options(selectinload(UsuarioORM.rol))
        .where(UsuarioORM.correo_electronico == correo.strip().lower())
    )

    usuario = await db.scalar(consulta)

    if (
        usuario is None
        or not usuario.activo
        or not verificar_password(contrasena, usuario.contrasena_hash)
    ):
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos",
        )

    return usuario, usuario.rol.nombre


def crear_token(usuario_id: UUID, tipo_usuario: str) -> str:
    vencimiento = datetime.now(timezone.utc) + timedelta(
        minutes=EXPIRACION_MINUTOS
    )

    contenido = {
        "sub": str(usuario_id),
        "tipo_usuario": tipo_usuario,
        "exp": vencimiento,
    }

    return jwt.encode(contenido, SECRET_KEY, algorithm=ALGORITHM)