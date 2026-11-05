import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

# Configuración JWT
# En producción estos valores vendrían de variables de entorno
JWT_SECRET_KEY = "cambiar-por-variables-entorno-jwt-secret-key-muy-largo"
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas
REFRESH_TOKEN_EXPIRE_DAYS = 7


def generar_token(
        datos: Dict[str, Any],
        expires_delta: Optional[timedelta] = None,
        secreto: str = JWT_SECRET_KEY,
) -> str:
    """Generar un token JWT."""
    ahora = datetime.now(timezone.utc)
    if expires_delta:
        expira = ahora + expires_delta
    else:
        expira = ahora + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = datos.copy()
    payload.update(
        {
            "exp": expira,
            "iat": ahora,
            "type": "access",
        }
    )
    token = jwt.encode(payload, secreto, algorithm=JWT_ALGORITHM)
    return token


def decodificar_token(
        token: str,
        secreto: str = JWT_SECRET_KEY,
) -> Dict[str, Any]:
    """Decodificar y validar un token JWT."""
    try:
        payload = jwt.decode(token, secreto, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredError:
        raise ValueError("Token expirado")
    except jwt.InvalidTokenError:
        raise ValueError("Token inválido")


def extraer_datos_token(token: str) -> Dict[str, Any]:
    """Extraer los datos payload de un token sin validar expiración."""
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])


# Funciones de helper para roles y permisos


def token_a_rol(token: str) -> str:
    """Extraer el rol desde el token JWT."""
    payload = decodificar_token(token)
    return payload.get("rol", "ASPIRANTE")


def token_tiene_rol(
        token: str, roles_permitidos: list[str]
) -> bool:
    """Verificar si el token tiene alguno de los roles especificados."""
    payload = decodificar_token(token)
    usuario_rol = payload.get("rol", "")
    return usuario_rol in roles_permitidos


def token_es_publico(token: str) -> bool:
    """Verificar si el token es del formulario de inscripción pública."""
    try:
        payload = decodificar_token(token)
        return payload.get("es_publico", False)
    except ValueError:
        return False
