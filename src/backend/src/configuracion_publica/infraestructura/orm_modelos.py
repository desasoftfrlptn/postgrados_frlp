# Define los parámetros editables del contenido público del sitio.

import uuid

from sqlalchemy import Column, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from src.compartido.conexion import Base


class ConfiguracionPublicaORM(Base):
    __tablename__ = "configuracion_publica"

    __table_args__ = (
        UniqueConstraint(
            "seccion",
            "clave",
            name="uq_configuracion_publica_seccion_clave",
        ),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    seccion = Column(
        String(50),
        nullable=False,
    )

    clave = Column(
        String(100),
        nullable=False,
    )

    valor = Column(
        Text,
        nullable=False,
    )