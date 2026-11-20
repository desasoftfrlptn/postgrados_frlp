# Define el modelo de persistencia de las noticias públicas.

import uuid

from sqlalchemy import Boolean, Column, Date, String, Text
from sqlalchemy.dialects.postgresql import UUID

from src.compartido.conexion import Base


class NoticiaORM(Base):
    __tablename__ = "noticias"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    titulo = Column(
        String(250),
        nullable=False,
    )

    categoria = Column(
        String(100),
        nullable=False,
    )

    resumen = Column(
        Text,
        nullable=False,
    )

    contenido = Column(
        Text,
        nullable=False,
    )

    fecha = Column(
        Date,
        nullable=False,
    )

    imagen_url = Column(
        String(500),
        nullable=True,
    )

    activo = Column(
        Boolean,
        nullable=False,
        default=True,
    )