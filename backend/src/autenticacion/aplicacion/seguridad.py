import logging
from collections.abc import Callable
from dataclasses import dataclass
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.config import settings

_LOGGER = logging.getLogger(__name__)
_ESQUEMA_BEARER = HTTPBearer(auto_error=False)
_ROLES_VALIDOS = {"COORDINADOR", "CPR", "ADMIN"}


@dataclass(frozen=True)
class UsuarioAutenticado:
    id: UUID
    rol: str


def obtener_usuario_actual(
    solicitud: Request,
    credenciales: HTTPAuthorizationCredentials | None = Depends(_ESQUEMA_BEARER),
) -> UsuarioAutenticado:
    if credenciales is None:
        _LOGGER.warning(
            "Acceso protegido denegado ruta=%s motivo=sin_token",
            solicitud.url.path,
        )
        raise _error_no_autorizado()

    try:
        contenido = jwt.decode(
            credenciales.credentials,
            settings.jwt_secret,
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            options={
                "require": ["exp", "iat", "iss", "sub", "sid", "rol", "tipo"]
            },
        )
        if contenido.get("tipo") != "acceso":
            raise jwt.InvalidTokenError("Tipo de token invalido")
        id_usuario = UUID(contenido["sub"])
        UUID(contenido["sid"])
        rol = contenido["rol"]
        if not isinstance(rol, str) or rol not in _ROLES_VALIDOS:
            raise jwt.InvalidTokenError("Rol de token invalido")
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        _LOGGER.warning(
            "Acceso protegido denegado ruta=%s motivo=token_invalido",
            solicitud.url.path,
        )
        raise _error_no_autorizado() from None

    return UsuarioAutenticado(id=id_usuario, rol=rol)


def requerir_roles(*roles: str) -> Callable[..., UsuarioAutenticado]:
    if not roles:
        raise ValueError("Debe indicarse al menos un rol")

    def verificar_rol(
        solicitud: Request,
        usuario: UsuarioAutenticado = Depends(obtener_usuario_actual),
    ) -> UsuarioAutenticado:
        if usuario.rol not in roles:
            _LOGGER.warning(
                "Acceso protegido denegado ruta=%s usuario_id=%s rol=%s",
                solicitud.url.path,
                usuario.id,
                usuario.rol,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenés permisos para acceder a este recurso",
            )
        return usuario

    return verificar_rol


def _error_no_autorizado() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token ausente, invalido o vencido",
        headers={"WWW-Authenticate": "Bearer"},
    )