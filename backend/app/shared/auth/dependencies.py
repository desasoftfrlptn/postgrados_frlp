"""Identidad autenticada: personal existente (middleware) o cuenta de estudiante."""
from dataclasses import dataclass
from uuid import UUID
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database.session import get_db
from app.usuarios.repositories.repository import UsuarioRepository
from app.usuarios.services.service import UsuarioService

@dataclass
class UsuarioActual:
    email: str
    rol: str
    usuario_id: UUID | None = None

async def get_usuario_actual(request: Request, db: AsyncSession = Depends(get_db)) -> UsuarioActual:
    # Mantiene compatibilidad con la autenticación ya implementada para personal.
    usuario = getattr(request.state, "usuario", None)
    if usuario is not None:
        if isinstance(usuario, dict): email, rol = usuario.get("email"), usuario.get("rol")
        else: email, rol = getattr(usuario, "email", None), getattr(usuario, "rol", None)
        if email and rol: return UsuarioActual(email=email, rol=str(rol).upper())
    # Los estudiantes usan sesión opaca HttpOnly persistida en PostgreSQL.
    usuario_db = await UsuarioService(UsuarioRepository(db)).usuario_de_sesion(request.cookies.get("sesion_estudiante", ""))
    if usuario_db:
        return UsuarioActual(email=usuario_db.email, rol=usuario_db.rol.upper(), usuario_id=usuario_db.id)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticación requerida")

def require_role(*roles: str):
    async def dependency(usuario: UsuarioActual = Depends(get_usuario_actual)) -> UsuarioActual:
        if usuario.rol not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tiene permisos para esta operación")
        return usuario
    return dependency
