# Define el modelo de persistencia de los seminarios.

import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
    String,
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