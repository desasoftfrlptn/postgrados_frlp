from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class Seminario(Base):
    __tablename__ = "seminarios"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    cohorte_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("cohortes.id", ondelete="RESTRICT"), nullable=False
    )
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    docente_nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    docente_email: Mapped[str] = mapped_column(String(254), nullable=False)
    fecha_fin_cuatrimestre: Mapped[date] = mapped_column(Date, nullable=False)


class InscripcionSeminario(Base):
    __tablename__ = "inscripciones_seminario"
    __table_args__ = (
        UniqueConstraint("seminario_id", "legajo_id", name="uq_inscripcion_seminario_legajo"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    seminario_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("seminarios.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    legajo_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("legajos.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )


class AccesoDocente(Base):
    __tablename__ = "accesos_docente"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    seminario_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("seminarios.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)