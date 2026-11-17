import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.inscripcion.infrastructure.models import Legajo

_DURACION_TOKEN_PROPIETARIO = timedelta(days=30)


@dataclass(frozen=True)
class CredencialPropietario:
    token: str
    token_hash: str
    expira_en: datetime


def crear_credencial_propietario(
    ahora: datetime | None = None,
) -> CredencialPropietario:
    token = secrets.token_urlsafe(32)
    return CredencialPropietario(
        token=token,
        token_hash=hashlib.sha256(token.encode("ascii")).hexdigest(),
        expira_en=(ahora or datetime.now(timezone.utc))
        + _DURACION_TOKEN_PROPIETARIO,
    )


def validar_token_propietario(
    legajo: Legajo,
    token: str,
    ahora: datetime | None = None,
) -> bool:
    if legajo.token_propietario_hash is None or legajo.token_propietario_expira_en is None:
        return False
    try:
        token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    except UnicodeEncodeError:
        return False
    if not hmac.compare_digest(token_hash, legajo.token_propietario_hash):
        return False

    expira_en = legajo.token_propietario_expira_en
    if expira_en.tzinfo is None:
        expira_en = expira_en.replace(tzinfo=timezone.utc)
    return expira_en > (ahora or datetime.now(timezone.utc))


def obtener_legajo_por_token(session: Session, token: str) -> Legajo | None:
    try:
        token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    except UnicodeEncodeError:
        return None
    legajo = session.scalar(select(Legajo).where(Legajo.token_propietario_hash == token_hash))
    if legajo is None or not validar_token_propietario(legajo, token):
        return None
    return legajo
