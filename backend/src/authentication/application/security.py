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

from src.core.config import settings
from src.db.session import get_db
from src.authentication.infrastructure.models import AuthRefreshSession, User
from src.shared.autorizacion.permisos import RolUsuario, requerir_roles

UserRole = RolUsuario
require_roles = requerir_roles
bearer_scheme = HTTPBearer(auto_error=False)
DUMMY_PASSWORD_HASH = bcrypt.hashpw(
    b"invalid-login-attempt",
    bcrypt.gensalt(rounds=12),
).decode("ascii")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("ascii"))
    except (ValueError, UnicodeEncodeError):
        return False


def _hash_token(token: str) -> str:
    try:
        return hashlib.sha256(token.encode("ascii")).hexdigest()
    except UnicodeEncodeError:
        raise _unauthorized() from None


def _expiration_delta(value: str) -> timedelta:
    match = re.fullmatch(r"([1-9][0-9]*)([smhd])", value.strip().lower())
    if match is None:
        raise RuntimeError("JWT_EXPIRATION debe tener formato como 15m, 8h o 7d")
    amount = int(match.group(1))
    unit = match.group(2)
    units = {
        "s": {"seconds": amount},
        "m": {"minutes": amount},
        "h": {"hours": amount},
        "d": {"days": amount},
    }
    return timedelta(**units[unit])


def _encode_token(payload: dict[str, object]) -> str:
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _decode_token(token: str, expected_type: str) -> dict[str, object]:
    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=["HS256"],
        issuer=settings.jwt_issuer,
        options={"require": ["exp", "iat", "iss", "sub", "type"]},
    )
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Token type mismatch")
    return payload


def create_token_pair(
    session: Session,
    user: User,
    family_id: UUID | None = None,
) -> tuple[str, str, int]:
    now = datetime.now(timezone.utc)
    access_expires_at = now + _expiration_delta(settings.jwt_expiration)
    refresh_expires_at = now + _expiration_delta(settings.jwt_refresh_expiration)
    auth_session_id = uuid4()
    session_family_id = family_id or uuid4()
    access_token = _encode_token(
        {
            "sub": str(user.id),
            "sid": str(auth_session_id),
            "role": user.role,
            "type": "access",
            "iss": settings.jwt_issuer,
            "iat": now,
            "exp": access_expires_at,
        }
    )
    refresh_token = _encode_token(
        {
            "sub": str(user.id),
            "sid": str(auth_session_id),
            "type": "refresh",
            "iss": settings.jwt_issuer,
            "iat": now,
            "exp": refresh_expires_at,
        }
    )
    session.add(
        AuthRefreshSession(
            id=auth_session_id,
            family_id=session_family_id,
            user_id=user.id,
            token_hash=_hash_token(refresh_token),
            expires_at=refresh_expires_at,
        )
    )
    return (
        access_token,
        refresh_token,
        int((access_expires_at - now).total_seconds()),
    )


def rotate_refresh_token(
    session: Session,
    refresh_token: str,
) -> tuple[User, str, str, int]:
    try:
        payload = _decode_token(refresh_token, "refresh")
        user_id = UUID(payload["sub"])
        auth_session_id = UUID(payload["sid"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise _unauthorized() from None

    auth_session = session.scalar(
        select(AuthRefreshSession)
        .where(AuthRefreshSession.id == auth_session_id)
        .with_for_update()
    )
    token_hash = _hash_token(refresh_token)
    if (
        auth_session is None
        or auth_session.user_id != user_id
        or auth_session.revoked_at is not None
        or not hmac.compare_digest(auth_session.token_hash, token_hash)
    ):
        raise _unauthorized()

    expires_at = auth_session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        raise _unauthorized()

    user = session.scalar(select(User).where(User.id == user_id))
    if user is None or not user.is_active:
        raise _unauthorized()

    auth_session.revoked_at = datetime.now(timezone.utc)
    access_token, next_refresh_token, expires_in = create_token_pair(
        session,
        user,
        auth_session.family_id,
    )
    session.commit()
    return user, access_token, next_refresh_token, expires_in


def revoke_refresh_token(session: Session, refresh_token: str) -> None:
    try:
        payload = _decode_token(refresh_token, "refresh")
        user_id = UUID(payload["sub"])
        auth_session_id = UUID(payload["sid"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise _unauthorized() from None

    auth_session = session.scalar(
        select(AuthRefreshSession)
        .where(AuthRefreshSession.id == auth_session_id)
        .with_for_update()
    )
    token_hash = _hash_token(refresh_token)
    if (
        auth_session is None
        or auth_session.user_id != user_id
        or not hmac.compare_digest(auth_session.token_hash, token_hash)
    ):
        raise _unauthorized()

    now = datetime.now(timezone.utc)
    session.execute(
        update(AuthRefreshSession)
        .where(
            AuthRefreshSession.family_id == auth_session.family_id,
            AuthRefreshSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )
    session.commit()


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token ausente, inválido o vencido",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise _unauthorized()

    try:
        payload = _decode_token(credentials.credentials, "access")
        user_id = UUID(payload["sub"])
        auth_session_id = UUID(payload["sid"])
        role = payload["role"]
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise _unauthorized() from None

    if role not in ("COORDINADOR", "CPR", "ADMIN"):
        raise _unauthorized()

    user = session.scalar(select(User).where(User.id == user_id))
    auth_session = session.scalar(
        select(AuthRefreshSession).where(
            AuthRefreshSession.id == auth_session_id,
            AuthRefreshSession.user_id == user_id,
        )
    )
    if (
        user is None
        or not user.is_active
        or user.role != role
        or auth_session is None
        or auth_session.revoked_at is not None
    ):
        raise _unauthorized()

    expires_at = auth_session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        raise _unauthorized()
    return user


