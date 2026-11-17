from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint, Uuid
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
    carrera: Mapped[str | None] = mapped_column(String(30), nullable=True)
    es_obligatorio: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    fecha_limite_notas: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ultimo_recordatorio_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class InscripcionSeminario(Base):
    __tablename__ = "inscripciones_seminario"
    __table_args__ = (
        UniqueConstraint("seminario_id", "legajo_id", name="uq_inscripcion_seminario_legajo"),
        CheckConstraint("nota IS NULL OR (nota >= 1 AND nota <= 10)", name="ck_nota_seminario"),
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
    nota: Mapped[Decimal | None] = mapped_column(Numeric(3, 1), nullable=True)
    ultimo_avance_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ClaseSeminario(Base):
    __tablename__ = "clases_seminario"
    __table_args__ = (UniqueConstraint("seminario_id", "fecha", name="uq_clase_seminario_fecha"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    seminario_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("seminarios.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    fecha: Mapped[date] = mapped_column(Date, nullable=False)


class AsistenciaSeminario(Base):
    __tablename__ = "asistencias_seminario"
    __table_args__ = (
        UniqueConstraint("clase_id", "inscripcion_id", name="uq_asistencia_clase_inscripcion"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    clase_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("clases_seminario.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    inscripcion_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("inscripciones_seminario.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    presente: Mapped[bool] = mapped_column(Boolean, nullable=False)


class AccesoDocente(Base):
    __tablename__ = "accesos_docente"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    seminario_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("seminarios.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)