from datetime import date
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class TrabajoFinal(Base):
    __tablename__ = "trabajos_finales"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('TFI', 'Maestría', 'Doctorado')",
            name="ck_trabajos_finales_tipo",
        ),
        Index("ix_trabajos_finales_legajo_id", "legajo_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    legajo_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("legajos.id", ondelete="RESTRICT"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    titulo: Mapped[str] = mapped_column(String(500), nullable=False)
    director_nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    director_email: Mapped[str] = mapped_column(String(254), nullable=False)
    codirector: Mapped[str | None] = mapped_column(String(200), nullable=True)
    fecha_aprobacion_cpr: Mapped[date] = mapped_column(Date, nullable=False)
    numero_resolucion: Mapped[str] = mapped_column(String(100), nullable=False)
