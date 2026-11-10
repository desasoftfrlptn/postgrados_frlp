# Define el modelo de persistencia de los seminarios.

import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
    String,
    Float,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID

from src.compartido.conexion import Base


class SeminarioORM(Base):
    __tablename__ = "seminarios"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    nombre = Column(
        String(200),
        nullable=False,
    )

    carrera_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "carreras.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    docente_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "usuarios.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    fecha_inicio = Column(
        Date,
        nullable=False,
    )

    fecha_fin = Column(
        Date,
        nullable=False,
    )

    activo = Column(
        Boolean,
        nullable=False,
        default=True,
    )

class InscripcionSeminarioORM(Base):
    __tablename__ = "inscripciones_seminario"
     
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4, 
    )

    legajo_id = Column(
        UUID(as_uuid=True),
        ForeignKey("legajos.id", ondelete="CASCADE"),
        nullable=False
    )

    seminario_id = Column(
        UUID(as_uuid=True),
        ForeignKey("seminarios.id", ondelete="CASCADE"), 
        nullable=False
    )

    nota_final = Column(
        Float,nullable=True
    )

    asistencias = Column(
        Integer, 
        nullable=False, 
        default=0

    )

    total_clases = Column(
        Integer, 
        nullable=False, 
        default=0
    )

    estado = Column(
        String(30), 
        nullable=False, 
        default="CURSANDO"
    )   