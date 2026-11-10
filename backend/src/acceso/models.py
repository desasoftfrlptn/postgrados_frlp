"""Enlaces temporales y sesiones restringidas de aspirantes."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, func, text
from sqlalchemy.orm import Mapped, mapped_column
from src.shared.database.connection import Base

class EnlaceAcceso(Base):
    __tablename__ = "enlaces_acceso"
    __table_args__ = (CheckConstraint("tipo IN ('INSCRIPCION', 'SEGUIMIENTO')", name="tipo_enlace_valido"),)
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    tipo: Mapped[str] = mapped_column(String(20))  # INSCRIPCION | SEGUIMIENTO
    cohorte_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("cohortes.id", ondelete="CASCADE"), index=True)
    periodo_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("periodos_inscripcion.id", ondelete="SET NULL"))
    legajo_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("legajos.id", ondelete="CASCADE"), index=True)
    expira_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revocado: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    usos_maximos: Mapped[int | None] = mapped_column(Integer)
    usos_realizados: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    creado_por: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),  # ← mapea a TIMESTAMPTZ
        default=lambda: datetime.now(timezone.utc),
    )

class SesionAcceso(Base):
    __tablename__ = "sesiones_acceso"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    enlace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("enlaces_acceso.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expira_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revocada: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),  # ← mapea a TIMESTAMPTZ
        default=lambda: datetime.now(timezone.utc),
    )


class LimiteSolicitud(Base):
    __tablename__ = "limites_solicitud"
    key_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, server_default=text("0"), nullable=False)
