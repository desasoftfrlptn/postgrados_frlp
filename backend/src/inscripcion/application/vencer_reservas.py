from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.inscripcion.infrastructure.models import Legajo
from src.shared.auditoria.modelos import EventoAuditoria
from src.shared.auditoria.servicio import registrar_evento_auditoria


@dataclass(frozen=True)
class ReservaVencida:
    id: UUID
    numero_legajo: str | None


def vencer_reservas(
    session: Session,
    *,
    ahora: datetime | None = None,
) -> list[ReservaVencida]:
    tiempo_actual = ahora or datetime.now(timezone.utc)
    if tiempo_actual.tzinfo is None:
        tiempo_actual = tiempo_actual.replace(tzinfo=timezone.utc)
    limite = tiempo_actual - timedelta(days=30)

    legajos = list(
        session.scalars(
            select(Legajo)
            .where(Legajo.estado == "Completado")
            .with_for_update()
        )
    )
    if not legajos:
        return []

    ids_legajos = {str(legajo.id) for legajo in legajos}
    eventos = session.scalars(
        select(EventoAuditoria)
        .where(
            EventoAuditoria.tipo_recurso == "legajo",
            EventoAuditoria.accion == "legajo.transicion",
            EventoAuditoria.id_recurso.in_(ids_legajos),
        )
        .order_by(EventoAuditoria.creado_en.desc())
    )
    ultima_transicion: dict[str, EventoAuditoria] = {}
    for evento in eventos:
        if evento.id_recurso is not None:
            ultima_transicion.setdefault(evento.id_recurso, evento)

    vencidos: list[ReservaVencida] = []
    for legajo in legajos:
        evento = ultima_transicion.get(str(legajo.id))
        if evento is None or (evento.detalles or {}).get("estado_nuevo") != "Completado":
            continue
        fecha_completado = evento.creado_en
        if fecha_completado.tzinfo is None:
            fecha_completado = fecha_completado.replace(tzinfo=timezone.utc)
        if fecha_completado > limite:
            continue

        legajo.estado = "Vencido"
        registrar_evento_auditoria(
            session,
            accion="legajo.vencer_reserva",
            tipo_recurso="legajo",
            rol_actor="SISTEMA",
            id_recurso=legajo.id,
            detalles={
                "estado_anterior": "Completado",
                "estado_nuevo": "Vencido",
            },
        )
        vencidos.append(
            ReservaVencida(id=legajo.id, numero_legajo=legajo.numero_legajo)
        )

    if vencidos:
        session.commit()
    return vencidos
