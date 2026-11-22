
import uuid

from sqlalchemy import (
    Column,
    String,
    ForeignKey,
    Text,
    Integer,
    Index,
    text,
)
from sqlalchemy.dialects.postgresql import UUID

from src.compartido.conexion import Base


class LegajoORM(Base):
    __tablename__ = "legajos"
    __table_args__ = (
        Index(
            "uq_legajos_cohorte_dni_sin_baja",
            "cohorte_id", "dni_pasaporte",
            unique=True,
            postgresql_where=text("estado <> 'BAJA'"),
        ),
        Index("ix_legajos_correo_normalizado", text("lower(correo_electronico)")),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    numero_seguimiento = Column(
        String(30),
        nullable=False,
        unique=True,
    )

    cohorte_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "cohortes.id",
            name="fk_legajos_cohorte_id",
        ),
        nullable=True,
    )

    carrera_elegida = Column(String(200), nullable=False)
    apellido = Column(String(100), nullable=False)
    nombre = Column(String(100), nullable=False)
    nacionalidad = Column(String(100), nullable=False)
    dni_pasaporte = Column(String(100), nullable=False)
    telefono_movil = Column(String(100), nullable=True)

    correo_electronico = Column(
        String(255),
        nullable=False,
    )

    correo_alternativo = Column(String(255), nullable=False)
    domicilio = Column(String(255), nullable=False)

    estado = Column(
        String(30),
        nullable=False,
        default="PENDIENTE",
    )

    pais = Column(String(100), nullable=False)
    provincia = Column(String(200), nullable=False)
    ciudad = Column(String(200), nullable=False)
    titulo_anterior = Column(String(200), nullable=False)
    universidad_anterior = Column(String(200), nullable=False)

    forma_conocio_ofertas = Column(
        String(100),
        nullable=False,
    )

    motivos_cursar = Column(
        Text,
        nullable=False,
    )

    solicitud_beca = Column(
        Integer,
        nullable=True,
    )


class ContadorInscripcionORM(Base):
    __tablename__ = "contadores_inscripcion"

    anio = Column(Integer, primary_key=True)
    ultimo_numero = Column(Integer, nullable=False, server_default="0")
