import hashlib
import hmac
import re
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from src.autenticacion.infraestructura.modelos import SesionAutenticacion, Usuario
from src.core.config import settings
from src.db.session import get_db

_esquema_bearer = HTTPBearer(auto_error=False)
_hash_contrasena_invalida = bcrypt.hashpw(
    b"intento-de-acceso-invalido",
    bcrypt.gensalt(rounds=12),
).decode("ascii")


def _duracion_token(valor: str) -> timedelta:
    coincidencia = re.fullmatch(r"([1-9][0-9]*)([smhd])", valor.strip().lower())
    if coincidencia is None:
        raise RuntimeError("JWT_EXPIRATION debe tener formato como 15m, 8h o 7d")

    cantidad = int(coincidencia.group(1))
    unidad = coincidencia.group(2)
    segundos_por_unidad = {"s": 1, "m": 60, "h": 3600, "d": 86400}
    return timedelta(seconds=cantidad * segundos_por_unidad[unidad])


def cifrar_contrasena(contrasena: str) -> str:
    return bcrypt.hashpw(
        contrasena.encode("utf-8"),
        bcrypt.gensalt(rounds=12),
    ).decode("ascii")


def verificar_contrasena(contrasena: str, hash_contrasena: str) -> bool:
    try:
        return bcrypt.checkpw(
            contrasena.encode("utf-8"),
            hash_contrasena.encode("ascii"),
        )
    except (ValueError, UnicodeEncodeError):
        return False


def crear_par_tokens(
    sesion: Session,
    usuario: Usuario,
    familia_id: UUID | None = None,
) -> tuple[str, str, int]:
    ahora = datetime.now(timezone.utc)
    id_sesion = uuid4()
    id_familia = familia_id or uuid4()
    vencimiento_acceso = ahora + _duracion_token(settings.jwt_expiration)
    vencimiento_renovacion = ahora + _duracion_token(settings.jwt_refresh_expiration)
    token_acceso = jwt.encode(
        {
            "sub": str(usuario.id),
            "sid": str(id_sesion),
            "rol": usuario.rol,
            "tipo": "acceso",
            "iss": settings.jwt_issuer,
            "iat": int(ahora.timestamp()),
            "exp": int(vencimiento_acceso.timestamp()),
        },
        settings.jwt_secret,
        algorithm="HS256",
    )
    token_renovacion = jwt.encode(
        {
            "sub": str(usuario.id),
            "sid": str(id_sesion),
            "tipo": "renovacion",
            "iss": settings.jwt_issuer,
            "iat": int(ahora.timestamp()),
            "exp": int(vencimiento_renovacion.timestamp()),
        },
        settings.jwt_secret,
        algorithm="HS256",
    )
    sesion.add(
        SesionAutenticacion(
            id=id_sesion,
            familia_id=id_familia,
            usuario_id=usuario.id,
            hash_token=_hash_token(token_renovacion),
            vence_en=vencimiento_renovacion,
        )
    )
    return (
        token_acceso,
        token_renovacion,
        int((vencimiento_acceso - ahora).total_seconds()),
    )


def renovar_tokens(
    sesion: Session,
    token_renovacion: str,
) -> tuple[Usuario, str, str, int]:
    contenido = _decodificar_token(token_renovacion, "renovacion")
    try:
        id_usuario = UUID(contenido["sub"])
        id_sesion = UUID(contenido["sid"])
    except (KeyError, TypeError, ValueError):
        raise _error_no_autorizado() from None

    sesion_auth = sesion.scalar(
        select(SesionAutenticacion)
        .where(SesionAutenticacion.id == id_sesion)
        .with_for_update()
    )
    hash_token = _hash_token(token_renovacion)
    if (
        sesion_auth is None
        or sesion_auth.usuario_id != id_usuario
        or sesion_auth.revocada_en is not None
        or not hmac.compare_digest(sesion_auth.hash_token, hash_token)
    ):
        if sesion_auth is not None:
            _revocar_familia(sesion, sesion_auth.familia_id)
            sesion.commit()
        raise _error_no_autorizado()

    vence_en = sesion_auth.vence_en
    if vence_en.tzinfo is None:
        vence_en = vence_en.replace(tzinfo=timezone.utc)
    if vence_en <= datetime.now(timezone.utc):
        raise _error_no_autorizado()

    usuario = sesion.scalar(select(Usuario).where(Usuario.id == id_usuario))
    if usuario is None or not usuario.activo:
        raise _error_no_autorizado()

    sesion_auth.revocada_en = datetime.now(timezone.utc)
    token_acceso, siguiente_token, expira_en = crear_par_tokens(
        sesion,
        usuario,
        sesion_auth.familia_id,
    )
    sesion.commit()
    return usuario, token_acceso, siguiente_token, expira_en


def revocar_sesion(sesion: Session, token_renovacion: str) -> None:
    contenido = _decodificar_token(token_renovacion, "renovacion")
    try:
        id_usuario = UUID(contenido["sub"])
        id_sesion = UUID(contenido["sid"])
    except (KeyError, TypeError, ValueError):
        raise _error_no_autorizado() from None

    sesion_auth = sesion.scalar(
        select(SesionAutenticacion)
        .where(SesionAutenticacion.id == id_sesion)
        .with_for_update()
    )
    if (
        sesion_auth is None
        or sesion_auth.usuario_id != id_usuario
        or sesion_auth.revocada_en is not None
        or not hmac.compare_digest(
            sesion_auth.hash_token,
            _hash_token(token_renovacion),
        )
    ):
        raise _error_no_autorizado()
    _revocar_familia(sesion, sesion_auth.familia_id)
    sesion.commit()


def obtener_usuario_actual(
    credenciales: HTTPAuthorizationCredentials | None = Depends(_esquema_bearer),
    sesion: Session = Depends(get_db),
) -> Usuario:
    if credenciales is None:
        raise _error_no_autorizado()

    try:
        contenido = _decodificar_token(credenciales.credentials, "acceso")
        id_usuario = UUID(contenido["sub"])
        id_sesion = UUID(contenido["sid"])
        rol_token = contenido["rol"]
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise _error_no_autorizado() from None

    usuario = sesion.scalar(select(Usuario).where(Usuario.id == id_usuario))
    sesion_auth = sesion.scalar(
        select(SesionAutenticacion).where(
            SesionAutenticacion.id == id_sesion,
            SesionAutenticacion.usuario_id == id_usuario,
        )
    )
    if (
        usuario is None
        or not usuario.activo
        or usuario.rol != rol_token
        or sesion_auth is None
        or sesion_auth.revocada_en is not None
    ):
        raise _error_no_autorizado()
    vence_en = sesion_auth.vence_en
    if vence_en.tzinfo is None:
        vence_en = vence_en.replace(tzinfo=timezone.utc)
    if vence_en <= datetime.now(timezone.utc):
        raise _error_no_autorizado()
    return usuario


def requerir_roles(*roles: str):
    if not roles:
        raise ValueError("Debe indicarse al menos un rol")

    def verificar_rol(
        usuario: Usuario = Depends(obtener_usuario_actual),
    ) -> Usuario:
        if usuario.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tenés permisos para acceder a este recurso",
            )
        return usuario

    return verificar_rol


def verificar_credenciales(
    sesion: Session,
    email: str,
    contrasena: str,
) -> Usuario | None:
    usuario = sesion.scalar(
        select(Usuario).where(Usuario.email == email.strip().lower())
    )
    hash_guardado = (
        usuario.hash_contrasena
        if usuario is not None
        else _hash_contrasena_invalida
    )
    contrasena_valida = verificar_contrasena(contrasena, hash_guardado)
    if usuario is None or not contrasena_valida or not usuario.activo:
        return None
    return usuario


def _decodificar_token(token: str, tipo_esperado: str) -> dict[str, object]:
    try:
        contenido = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            issuer=settings.jwt_issuer,
            options={
                "require": ["exp", "iat", "iss", "sub", "sid", "tipo"],
            },
        )
    except jwt.PyJWTError:
        raise _error_no_autorizado() from None
    if contenido.get("tipo") != tipo_esperado:
        raise _error_no_autorizado()
    return contenido


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def _revocar_familia(sesion: Session, familia_id: UUID) -> None:
    sesion.execute(
        update(SesionAutenticacion)
        .where(
            SesionAutenticacion.familia_id == familia_id,
            SesionAutenticacion.revocada_en.is_(None),
        )
        .values(revocada_en=datetime.now(timezone.utc))
    )


def _error_no_autorizado() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token ausente, invalido o vencido",
        headers={"WWW-Authenticate": "Bearer"},
    )
