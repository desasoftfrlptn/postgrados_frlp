import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.authentication.infrastructure.models import User
from src.inscripcion.infrastructure.models import Cohorte, Legajo
from src.shared.auditoria.servicio import registrar_evento_auditoria

_TRANSICIONES_COORDINADOR = {
    "REVISAR": {"Pendiente": "En Revisión"},
    "OBSERVAR": {"En Revisión": "Observado"},
    "APROBAR": {"En Revisión": "Completado"},
    "RECHAZAR": {"En Revisión": "Rechazado"},
    "MATRICULAR": {"Completado": "Activo"},
    "DAR_DE_BAJA": {"Activo": "Baja", "En Riesgo": "Baja"},
}
_DURACION_TOKEN_CORRECCION = timedelta(hours=72)


class LegajoNoEncontrado(Exception):
    pass


class TransicionNoPermitida(Exception):
    pass


class TokenCorreccionInvalido(Exception):
    pass


@dataclass(frozen=True)
class ResultadoTransicion:
    legajo: Legajo
    token_correccion: str | None = None


def _registrar_transicion(
    session: Session,
    *,
    legajo: Legajo,
    estado_anterior: str,
    accion: str,
    id_actor: UUID | None,
    rol_actor: str,
) -> None:
    registrar_evento_auditoria(
        session,
        accion="legajo.transicion",
        tipo_recurso="legajo",
        id_actor=id_actor,
        rol_actor=rol_actor,
        id_recurso=legajo.id,
        detalles={
            "accion": accion,
            "estado_anterior": estado_anterior,
            "estado_nuevo": legajo.estado,
        },
    )


def _generar_numero_legajo(session: Session, legajo: Legajo) -> str:
    cohorte = session.scalar(
        select(Cohorte).where(Cohorte.id == legajo.cohorte_id).with_for_update()
    )
    if cohorte is None:
        raise LegajoNoEncontrado

    secuencial = session.scalar(
        select(func.count(Legajo.id)).where(
            Legajo.cohorte_id == cohorte.id,
            Legajo.numero_legajo.is_not(None),
        )
    )
    # El modelo admite una cohorte por año; su ordinal es, por tanto, 001.
    return f"{cohorte.anio % 100:02d}-001-{(secuencial or 0) + 1:03d}"


def transicionar_legajo(
    session: Session,
    *,
    legajo_id: UUID,
    usuario: User,
    accion: str,
    comentario: str | None = None,
    ahora: datetime | None = None,
) -> ResultadoTransicion:
    transiciones = _TRANSICIONES_COORDINADOR.get(accion)
    if transiciones is None:
        raise TransicionNoPermitida

    legajo = session.scalar(
        select(Legajo).where(Legajo.id == legajo_id).with_for_update()
    )
    if legajo is None:
        raise LegajoNoEncontrado

    estado_anterior = legajo.estado
    estado_nuevo = transiciones.get(estado_anterior)
    if estado_nuevo is None:
        raise TransicionNoPermitida

    legajo.estado = estado_nuevo
    token_correccion: str | None = None
    if accion == "APROBAR":
        legajo.numero_legajo = _generar_numero_legajo(session, legajo)
    elif accion == "OBSERVAR":
        token_correccion = secrets.token_urlsafe(32)
        legajo.token_correccion_hash = hashlib.sha256(
            token_correccion.encode("ascii")
        ).hexdigest()
        legajo.token_correccion_expira_en = (
            (ahora or datetime.now(timezone.utc)) + _DURACION_TOKEN_CORRECCION
        )

    _registrar_transicion(
        session,
        legajo=legajo,
        estado_anterior=estado_anterior,
        accion=accion,
        id_actor=usuario.id,
        rol_actor=usuario.role,
    )
    session.commit()
    return ResultadoTransicion(legajo=legajo, token_correccion=token_correccion)


def corregir_legajo(
    session: Session,
    *,
    legajo_id: UUID,
    token: str,
    ahora: datetime | None = None,
) -> Legajo:
    legajo = session.scalar(
        select(Legajo).where(Legajo.id == legajo_id).with_for_update()
    )
    if legajo is None:
        raise LegajoNoEncontrado
    if (
        legajo.estado != "Observado"
        or legajo.token_correccion_hash is None
        or legajo.token_correccion_expira_en is None
    ):
        raise TokenCorreccionInvalido

    hash_token = hashlib.sha256(token.encode("ascii")).hexdigest()
    if not hmac.compare_digest(hash_token, legajo.token_correccion_hash):
        raise TokenCorreccionInvalido

    vence_en = legajo.token_correccion_expira_en
    if vence_en.tzinfo is None:
        vence_en = vence_en.replace(tzinfo=timezone.utc)
    if vence_en <= (ahora or datetime.now(timezone.utc)):
        raise TokenCorreccionInvalido

    legajo.estado = "Pendiente"
    legajo.token_correccion_hash = None
    legajo.token_correccion_expira_en = None
    _registrar_transicion(
        session,
        legajo=legajo,
        estado_anterior="Observado",
        accion="CORREGIR",
        id_actor=None,
        rol_actor="ASPIRANTE",
    )
    session.commit()
    return legajo