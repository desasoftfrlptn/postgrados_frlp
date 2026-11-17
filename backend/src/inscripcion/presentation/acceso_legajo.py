from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.autenticacion.aplicacion.seguridad import get_current_user
from src.autenticacion.infraestructura.modelos import User
from src.inscripcion.application.acceso_propietario import (
    validar_token_propietario,
)
from src.inscripcion.infrastructure.models import Legajo

bearer_scheme = HTTPBearer(auto_error=False)


def exigir_credencial(
    credenciales: HTTPAuthorizationCredentials | None,
) -> HTTPAuthorizationCredentials:
    if credenciales is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ausente, inválido o vencido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credenciales


def autorizar_dueno_o_coordinador(
    legajo: Legajo,
    credenciales: HTTPAuthorizationCredentials,
    session: Session,
) -> None:
    usuario = _obtener_usuario(credenciales, session)
    if usuario is not None:
        if usuario.role != "COORDINADOR":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenés permisos para acceder a este recurso",
            )
        return
    if not validar_token_propietario(legajo, credenciales.credentials):
        raise _no_autorizado()


def autorizar_dueno(
    legajo: Legajo,
    credenciales: HTTPAuthorizationCredentials,
    session: Session,
) -> None:
    usuario = _obtener_usuario(credenciales, session)
    if usuario is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permisos para acceder a este recurso",
        )
    if not validar_token_propietario(legajo, credenciales.credentials):
        raise _no_autorizado()


def _obtener_usuario(
    credenciales: HTTPAuthorizationCredentials,
    session: Session,
) -> User | None:
    try:
        return get_current_user(credenciales, session)
    except HTTPException as error:
        if error.status_code != status.HTTP_401_UNAUTHORIZED:
            raise
        return None


def _no_autorizado() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token ausente, inválido o vencido",
        headers={"WWW-Authenticate": "Bearer"},
    )
