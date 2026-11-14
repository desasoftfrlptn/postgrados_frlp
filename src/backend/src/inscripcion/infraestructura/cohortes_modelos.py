
# Modelo de persistencia de las cohortes.
# Basado en docs/ARQUITECTURA.md.

import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Integer,
    String,
    false,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from src.compartido.conexion import Base


class CohorteORM(Base):
    __tablename__ = "cohortes"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    anio = Column(
        Integer,
        nullable=False,
    )

    nombre = Column(
        String(50),
        nullable=False,
        unique=True,
    )

    abierta = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default=false(),
    )

    fecha_inicio = Column(
        Date,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        nullable=True,
        server_default=func.now(),
    )
