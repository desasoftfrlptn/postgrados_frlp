from datetime import datetime, timedelta, timezone
from app.shared.security.tokens import hash_password, hash_token, generar_token, verificar_password
from app.usuarios.models import SesionUsuario, Usuario
from app.usuarios.repositories.repository import UsuarioRepository

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
        usuario.password_hash = hash_password(password)
        usuario.email_verificado = True
        invitacion.usada_at = ahora
        await self.repo.db.commit()
        return True

    async def login(self, email: str, password: str):
        usuario = await self.repo.por_email(email)
        if not usuario or not usuario.activo or not usuario.password_hash or not verificar_password(password, usuario.password_hash):
            raise UsuarioError("Email o contraseña incorrectos")
        token = generar_token()
        sesion = SesionUsuario(usuario_id=usuario.id, token_hash=hash_token(token),
            expira_at=datetime.now(timezone.utc) + timedelta(hours=12))
        await self.repo.crear_sesion(sesion)
        return token, usuario

    async def usuario_de_sesion(self, token: str):
        if not token: return None
        sesion = await self.repo.sesion(hash_token(token))
        if not sesion: return None
        from app.usuarios.models import Usuario
        usuario = await self.repo.db.get(Usuario, sesion.usuario_id)
        return usuario if usuario and usuario.activo else None
