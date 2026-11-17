import hashlib
import secrets
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.carga_academica.infraestructura.modelos import AccesoDocente
from src.core.config import settings


def crear_acceso(session: Session, seminario_id: UUID, expira_en: datetime) -> str:
    token = secrets.token_urlsafe(32)
    session.add(
        AccesoDocente(
            seminario_id=seminario_id,
            token_hash=hashlib.sha256(token.encode("ascii")).hexdigest(),
            expira_en=expira_en,
        )
    )
    return token


def obtener_acceso_vigente(session: Session, token: str) -> AccesoDocente | None:
    try:
        resumen = hashlib.sha256(token.encode("ascii")).hexdigest()
    except UnicodeEncodeError:
        return None
    acceso = session.scalar(select(AccesoDocente).where(AccesoDocente.token_hash == resumen))
    if acceso is None:
        return None
    expira_en = acceso.expira_en
    if expira_en.tzinfo is None:
        expira_en = expira_en.replace(tzinfo=timezone.utc)
    return acceso if expira_en > datetime.now(timezone.utc) else None


def enlace_planilla(seminario_id: UUID, token: str) -> str:
    return f"{settings.cors_origin.rstrip('/')}/docente/seminarios/{seminario_id}#token={token}"