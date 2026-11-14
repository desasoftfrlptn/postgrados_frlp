# Define el modelo de persistencia de las carreras de posgrado.

import uuid

from sqlalchemy import Boolean, Column, String, Text
from sqlalchemy.dialects.postgresql import UUID

from src.compartido.conexion import Base


class CarreraORM(Base):
    __tablename__ = "carreras"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    nombre = Column(
        String(200),
        nullable=False,
        unique=True,
    )

    tipo = Column(
        String(50),
        nullable=False,
    )

    duracion = Column(
        String(100),
        nullable=False,
    )

    descripcion = Column(
        Text,
        nullable=False,
    )

    activo = Column(
        Boolean,
        nullable=False,
        default=True,
    )