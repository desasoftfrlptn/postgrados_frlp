
# Define el modelo de los documentos asociados
# a los legajos de inscripción.

import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from src.compartido.conexion import Base


class DocumentoLegajoORM(Base):
    __tablename__ = "documentos_legajo"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    legajo_id = Column(
        UUID(as_uuid=True),
        ForeignKey("legajos.id"),
        nullable=False,
        index=True,
    )

    tipo = Column(
        String(100),
        nullable=False,
    )

    path = Column(
        String(500),
        nullable=False,
    )

    checksum = Column(
        String(64),
        nullable=False,
    )

    fecha = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
