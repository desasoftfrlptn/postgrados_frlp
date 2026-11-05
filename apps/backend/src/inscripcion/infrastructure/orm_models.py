import uuid

from sqlalchemy import (
    Column,
    String,
    Date,
    DateTime,
    Boolean,
    Integer,
    Text,
    UUID,
    ForeignKey,
    create_engine,
    Index,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime

Base = declarative_base()


class Cohorte(Base):
    __tablename__ = "cohortes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    anio = Column(Integer, nullable=False)
    nombre = Column(String(50), nullable=False, unique=True)
    abierta = Column(Boolean, nullable=False, default=False)
    fecha_inicio = Column(Date)
    created_at = Column(DateTime, default=datetime.now)

    legajos = relationship("Legajo", back_populates="cohorte", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Cohorte {self.nombre} ({self.anio})>"


class LegajoModel(Base):
    __tablename__ = "legajos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    numero_legajo = Column(String(20), unique=True, nullable=False)
    cohorte_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cohortes.id", ondelete="CASCADE"),
        nullable=False,
    )
    dni = Column(String(20), nullable=False)
    apellido = Column(String(100), nullable=False)
    nombre = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    tipo_carrera = Column(String(30), nullable=False)
    solicita_beca = Column(Boolean, nullable=False, default=False)
    tipo_beca = Column(String(10))
    estado = Column(
        String(30),
        nullable=False,
        default="BORRADOR",
    )
    fecha_inscripcion = Column(DateTime, nullable=True)
    fecha_activacion = Column(DateTime, nullable=True)
    semaforo = Column(
        String(10),
        nullable=False,
        default="VERDE",
    )
    semaforo_manual = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(
        DateTime,
        default=datetime.now,
        onupdate=datetime.now,
    )

    # Relaciones
    cohorte = relationship("Cohorte", back_populates="legajos")
    documentos = relationship("DocumentoModel", back_populates="legajo", cascade="all, delete-orphig")

    __table_args__ = (
        Index("idx_legajos_dni", "dni"),
        Index("idx_legajos_email", "email"),
        Index("idx_legajos_cohorte_est", "cohorte_id", "estado"),
        Index(
            "idx_legajos_semaforo_rojo",
            "semaforo",
            postgresql_where="(semaforo = 'ROJO')",
        ),
    )

    def __repr__(self) -> str:
        return f"<Legajo {self.numero_legajo} - {self.apellido}, {self.nombre}>"


class DocumentoModel(Base):
    __tablename__ = "documentos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    legajo_id = Column(
        UUID(as_uuid=True),
        ForeignKey("legajos.id", ondelete="CASCADE"),
        nullable=False,
    )
    tipo = Column(
        String(50),
        nullable=False,
    )
    path_storage = Column(String(500), nullable=False)  # Nunca pública, solo endpoint
    nombre_original = Column(String(255), nullable=False)
    checksum_sha256 = Column(String(64), nullable=False)
    tamanio_bytes = Column(Integer, nullable=True)
    fecha_subida = Column(DateTime, default=datetime.now)

    # Relaciones
    legajo = relationship("LegajoModel", back_populates="documentos")

    __table_args__ = (
        Index("idx_docs_legajo", "legajo_id"),
    )

    def __repr__(self) -> str:
        return f"<Documento {self.id} para legajo {self.legajo_id}>"
