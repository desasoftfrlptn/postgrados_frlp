from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Index, JSON, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class EventoAuditoria(Base):
    __tablename__ = "eventos_auditoria"
    __table_args__ = (
        Index("ix_eventos_auditoria_recurso", "tipo_recurso", "id_recurso"),
        Index("ix_eventos_auditoria_creado_en", "creado_en"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    id_actor: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    rol_actor: Mapped[str | None] = mapped_column(String(20), nullable=True)
    accion: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo_recurso: Mapped[str] = mapped_column(String(100), nullable=False)
    id_recurso: Mapped[str | None] = mapped_column(String(100), nullable=True)
    detalles: Mapped[dict[str, object] | None] = mapped_column(JSON, nullable=True)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
