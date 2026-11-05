from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.shared.auth.jwt import decodificar_token, token_a_rol

security = HTTPBearer(auto_error=False)


async def get_current_user(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[Dict[str, Any]]:
    """Obtener usuario actual desde JWT. Retorna None para endpoints públicos."""
    if credentials is None:
        return None
    try:
        payload = decodificar_token(credentials.credentials)
        return payload
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )


# Dependencias de rol específicas (síncronas para evitar problemas con FastAPI)
def require_role_coordinador():
    """Dependency: solo COORDINADOR puede acceder."""

    async def dependency(
            credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    ):
        if credentials is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales requeridas",
            )
        payload = decodificar_token(credentials.credentials)
        if payload.get("rol") != "COORDINADOR":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol requerido: COORDINADOR. Tu rol: {payload.get('rol')}",
            )
        return payload

    return dependency


def require_role_docente():
    """Dependency: solo DOCENTE puede acceder."""

    async def dependency(
            credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    ):
        if credentials is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales requeridas",
            )
        payload = decodificar_token(credentials.credentials)
        if payload.get("rol") != "DOCENTE":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol requerido: DOCENTE. Tu rol: {payload.get('rol')}",
            )
        return payload

    return dependency


def require_role_cpr():
    """Dependency: solo CPR puede acceder."""

    async def dependency(
            credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    ):
        if credentials is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales requeridas",
            )
        payload = decodificar_token(credentials.credentials)
        if payload.get("rol") != "CPR":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol requerido: CPR. Tu rol: {payload.get('rol')}",
            )
        return payload

    return dependency


def require_role_aspirante():
    """Dependency: solo ASPIRANTE puede acceder."""

    async def dependency(
            credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    ):
        if credentials is None:
            # Para el formulario público de inscripción, retornamos None
            # Esto permite que el endpoint /sea público
            return None
        payload = decodificar_token(credentials.credentials)
        if payload.get("rol") != "ASPIRANTE":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol requerido: ASPIRANTE. Tu rol: {payload.get('rol')}",
            )
        return payload

    return dependency
