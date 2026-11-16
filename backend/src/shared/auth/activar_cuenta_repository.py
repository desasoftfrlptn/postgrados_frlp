from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.shared.auth.orm_models import InvitacionCuenta

class UsuarioRepository:
    def __init__(self, db: AsyncSession): self.db = db
    async def invitacion(self, token_hash: str):
        return await self.db.scalar(select(InvitacionCuenta).where(InvitacionCuenta.token_hash == token_hash))