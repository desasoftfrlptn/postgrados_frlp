from collections.abc import Callable

from src.authentication.application.security import (
    User as UsuarioAutenticado,
    get_current_user as obtener_usuario_actual,
)
from src.shared.autorizacion.permisos import (
    RolUsuario,
    requerir_roles as _requerir_roles,
)


def requerir_roles(*roles: RolUsuario) -> Callable[..., UsuarioAutenticado]:
    return _requerir_roles(*roles)