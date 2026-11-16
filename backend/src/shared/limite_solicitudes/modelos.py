from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class ContadorLimiteSolicitudes(Base):
    __tablename__ = "contadores_limite_solicitudes"
    __table_args__ = (
        UniqueConstraint(
            "hash_clave",
            "inicio_ventana",
            name="uq_contador_limite_clave_ventana",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    hash_clave: Mapped[str] = mapped_column(String(64), nullable=False)
    inicio_ventana: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
