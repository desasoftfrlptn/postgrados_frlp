import hashlib
import secrets
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from src.carga_academica.infraestructura.modelos import AccesoDocente
from src.core.config import settings


def crear_acceso(session: Session, seminario_id: UUID, expira_en: datetime) -> str:
    token = secrets.token_urlsafe(32)
    session.add(AccesoDocente(
        seminario_id=seminario_id,
        token_hash=hashlib.sha256(token.encode("ascii")).hexdigest(),
        expira_en=expira_en,
    ))
    return token


def enlace_planilla(seminario_id: UUID, token: str) -> str:
    return f"{settings.cors_origin.rstrip('/')}/docente/seminarios/{seminario_id}#token={token}"
