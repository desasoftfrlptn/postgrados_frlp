"""Tablas del módulo de carga académica: seminarios, clases y asistencia (Módulo B)."""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String, UniqueConstraint, func, text, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.database.connection import Base


class Seminario(Base):
    __tablename__ = "seminarios"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    nombre: Mapped[str] = mapped_column(String(150))
    codigo: Mapped[str] = mapped_column(String(20), unique=True)
    horas_catedra: Mapped[int]
    es_obligatorio: Mapped[bool] = mapped_column(server_default=text("false"))
    docente: Mapped[str] = mapped_column(String(150))
    email_docente: Mapped[str] = mapped_column(String(255))
        # US-B-005: hasta cuándo puede cargar notas el docente (None = sin fecha límite todavía)
    fecha_limite_notas: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),  # ← mapea a TIMESTAMPTZ
        default=lambda: datetime.now(timezone.utc),
    )


class InscripcionSeminario(Base):
    """Qué legajo cursa qué seminario (los 'alumnos' de la planilla del docente)."""

    __tablename__ = "inscripciones_seminario"
    __table_args__ = (UniqueConstraint("seminario_id", "legajo_id", name="uq_inscripcion_seminario"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    seminario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seminarios.id"), index=True)
    legajo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("legajos.id"), index=True)
    nota_final: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))  # la carga el docente al cerrar
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),  # ← mapea a TIMESTAMPTZ
        default=lambda: datetime.now(timezone.utc),
    )


class Clase(Base):
    __tablename__ = "clases"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    seminario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seminarios.id"), index=True)
    fecha: Mapped[date]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),  # ← mapea a TIMESTAMPTZ
        default=lambda: datetime.now(timezone.utc),
    )


class Asistencia(Base):
    __tablename__ = "asistencias"
    __table_args__ = (UniqueConstraint("clase_id", "legajo_id", name="uq_asistencia_clase_legajo"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    clase_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clases.id", ondelete="CASCADE"), index=True)
    legajo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("legajos.id"), index=True)
    presente: Mapped[bool] = mapped_column(server_default=text("false"))
