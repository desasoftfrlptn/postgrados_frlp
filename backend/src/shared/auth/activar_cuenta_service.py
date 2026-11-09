from datetime import datetime, timedelta, timezone
from src.shared.security.tokens import hash_token
from src.shared.auth.passwords import hash_contrasena
from src.shared.auth.activar_cuenta_repository import UsuarioRepository
from src.shared.auth.orm_models import Usuario

class UsuarioError(Exception): pass

class UsuarioService:
    def __init__(self, repo: UsuarioRepository): self.repo = repo

    async def activar_cuenta(self, token: str, password: str):
        invitacion = await self.repo.invitacion(hash_token(token))
        ahora = datetime.now(timezone.utc)
        if not invitacion or invitacion.usada_at or invitacion.expira_at <= ahora:
            raise UsuarioError("La invitación no existe, venció o ya fue utilizada")
        usuario = await self.repo.db.get(Usuario, invitacion.usuario_id)
        if not usuario or not usuario.activo: raise UsuarioError("La cuenta no está disponible")
        usuario.password_hash = hash_contrasena(password)
        invitacion.usada_at = ahora
        await self.repo.db.commit()
        return True