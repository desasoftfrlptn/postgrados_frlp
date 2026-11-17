from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer


class TokenBearer(HTTPBearer):
    """Una credencial ausente o mal formada es autenticación fallida (401)."""
    def __init__(self):
        super().__init__(auto_error=False)

    async def __call__(self, request: Request):
        credenciales = await super().__call__(request)
        if credenciales is None:
            raise HTTPException(
                status_code=401,
                detail="Se requiere un token Bearer válido.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return credenciales


_password_hash = PasswordHash.recommended()


def hash_password(
    contrasena: str,
) -> str:
    if not contrasena:
        raise ValueError(
            "La contraseña no puede estar vacía."
        )

    return _password_hash.hash(
        contrasena
    )


def verificar_password(
    contrasena: str,
    contrasena_hash: str,
) -> bool:
    try:
        return _password_hash.verify(contrasena, contrasena_hash)
    except (UnknownHashError, ValueError):
        return False
