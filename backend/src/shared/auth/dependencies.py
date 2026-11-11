##Valida el token y consulta que el usuario siga existiendo y esté activo.

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.shared.auth.jwt import obtener_id_usuario
from src.shared.auth.orm_models import Usuario
from src.shared.database.session import get_db

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o vencida",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise error

    try:
        usuario_id = obtener_id_usuario(credentials.credentials)
    except jwt.InvalidTokenError as exc:
        raise error from exc

    usuario = await db.get(Usuario, usuario_id)

    if usuario is None or not usuario.activo:
        raise error

    return usuario

##Permite que los demás módulos protejan sus rutas
##Con Depends(require_role("coordinador"))

def require_role(*roles: str):
    async def verificar_rol(
        usuario: Usuario = Depends(get_current_user),
    ) -> Usuario:
        if usuario.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenés permisos para realizar esta acción",
            )

        return usuario

    return verificar_rol