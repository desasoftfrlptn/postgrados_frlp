from typing import Callable, Literal, Protocol
from uuid import UUID

from fastapi import Depends, HTTPException, status

from src.authentication.infrastructure.models import User

RolUsuario = Literal["COORDINADOR", "CPR", "ADMIN"]


class SujetoAutenticado(Protocol):
    id: UUID
    role: str


def requerir_roles(*roles: RolUsuario) -> Callable[..., User]:
    from src.authentication.application.security import get_current_user

    def dependencia_rol(usuario: User = Depends(get_current_user)) -> User:
        if usuario.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenés permisos para acceder a este recurso",
            )
        return usuario

    return dependencia_rol


def verificar_propietario_o_roles(
    sujeto: SujetoAutenticado,
    id_propietario: UUID,
    *roles_privilegiados: RolUsuario,
) -> None:
    if sujeto.id != id_propietario and sujeto.role not in roles_privilegiados:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permisos para acceder a este recurso",
        )


__all__ = [
    "RolUsuario",
    "SujetoAutenticado",
    "requerir_roles",
    "verificar_propietario_o_roles",
]
