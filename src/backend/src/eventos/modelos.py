import uuid

from sqlalchemy import Boolean, Column, Date, String, Text
from sqlalchemy.dialects.postgresql import UUID

from src.compartido.conexion import Base


class EventoORM(Base):
    __tablename__ = "eventos_academicos"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=False)
    fecha = Column(Date, nullable=False)
    tipo = Column(String(30), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
