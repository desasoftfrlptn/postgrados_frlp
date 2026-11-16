from uuid import UUID

from sqlalchemy.orm import Session

from src.shared.auditoria.modelos import EventoAuditoria


def registrar_evento_auditoria(
    session: Session,
    *,
    accion: str,
    tipo_recurso: str,
    id_actor: UUID | None = None,
    rol_actor: str | None = None,
    id_recurso: str | UUID | None = None,
    detalles: dict[str, object] | None = None,
) -> EventoAuditoria:
    evento = EventoAuditoria(
        id_actor=id_actor,
        rol_actor=rol_actor,
        accion=accion,
        tipo_recurso=tipo_recurso,
        id_recurso=str(id_recurso) if id_recurso is not None else None,
        detalles=detalles,
    )
    session.add(evento)
    return evento
