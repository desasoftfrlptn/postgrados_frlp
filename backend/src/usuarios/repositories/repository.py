from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.usuarios.models import Usuario, InvitacionCuenta, SesionUsuario

class UsuarioRepository:
    def __init__(self, db: AsyncSession): self.db = db
    async def por_email(self, email: str):
        return await self.db.scalar(select(Usuario).where(Usuario.email == email.lower()))
    async def invitacion(self, token_hash: str):
        return await self.db.scalar(select(InvitacionCuenta).where(InvitacionCuenta.token_hash == token_hash))
    async def crear_sesion(self, sesion: SesionUsuario):
        self.db.add(sesion); await self.db.commit(); return sesion
    async def sesion(self, token_hash: str):
        return await self.db.scalar(select(SesionUsuario).where(SesionUsuario.token_hash == token_hash,
            SesionUsuario.revocada.is_(False), SesionUsuario.expira_at > datetime.now(timezone.utc)))
