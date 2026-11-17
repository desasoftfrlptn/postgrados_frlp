from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class Cohorte(Base):
    __tablename__ = "cohortes"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    anio: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    inscripcion_abierta: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    fecha_inicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_proxima_apertura: Mapped[date | None] = mapped_column(Date, nullable=True)

    legajos: Mapped[list["Legajo"]] = relationship(back_populates="cohorte")


class Legajo(Base):
    __tablename__ = "legajos"
    __table_args__ = (
        UniqueConstraint("cohorte_id", "dni", name="uq_legajos_cohorte_dni"),
        UniqueConstraint("cohorte_id", "email", name="uq_legajos_cohorte_email"),
        Index("ix_legajos_cohorte_estado", "cohorte_id", "estado"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    numero_legajo: Mapped[str | None] = mapped_column(String(40), nullable=True, unique=True)
    cohorte_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("cohortes.id", ondelete="RESTRICT"), nullable=False
    )
    estado: Mapped[str] = mapped_column(String(30), nullable=False, default="Pendiente")
    carreras: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    dni: Mapped[str] = mapped_column(String(20), nullable=False)
    apellido: Mapped[str] = mapped_column(String(120), nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    nacionalidad: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    email_alternativo: Mapped[str] = mapped_column(String(254), nullable=False)
    telefono_movil: Mapped[str] = mapped_column(String(40), nullable=False)
    telefono_fijo: Mapped[str | None] = mapped_column(String(40), nullable=True)
    domicilio: Mapped[str] = mapped_column(String(200), nullable=False)
    ciudad: Mapped[str] = mapped_column(String(100), nullable=False)
    provincia: Mapped[str] = mapped_column(String(100), nullable=False)
    pais: Mapped[str] = mapped_column(String(100), nullable=False)
    titulo_grado: Mapped[str] = mapped_column(String(200), nullable=False)
    titulo_posgrado: Mapped[str | None] = mapped_column(String(200), nullable=True)
    como_conocio: Mapped[str] = mapped_column(String(40), nullable=False)
    motivacion: Mapped[str] = mapped_column(String(5000), nullable=False)
    solicita_beca: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    tipo_beca: Mapped[str | None] = mapped_column(String(10), nullable=True)
    token_correccion_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    token_correccion_expira_en: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    fecha_inscripcion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    cohorte: Mapped[Cohorte] = relationship(back_populates="legajos")
    documentos: Mapped[list["DocumentoInscripcion"]] = relationship(
        back_populates="legajo", cascade="all, delete-orphan"
    )


class DocumentoInscripcion(Base):
    __tablename__ = "documentos_inscripcion"
    __table_args__ = (
        UniqueConstraint("legajo_id", "tipo", name="uq_documento_legajo_tipo"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    legajo_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("legajos.id", ondelete="CASCADE"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    path_storage: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    fecha_subida: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    legajo: Mapped[Legajo] = relationship(back_populates="documentos")
