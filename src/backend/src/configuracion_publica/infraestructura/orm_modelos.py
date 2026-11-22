# Define los parámetros editables del contenido público del sitio.

import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
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

class PreguntaFrecuenteORM(Base):
    """Pregunta administrable del sitio público."""

    __tablename__ = "preguntas_frecuentes"

    __table_args__ = (
        CheckConstraint(
            "orden >= 1",
            name="ck_preguntas_frecuentes_orden",
        ),
    )

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    categoria = Column(String(100), nullable=False)
    pregunta = Column(String(300), nullable=False)
    respuesta = Column(Text, nullable=False)
    orden = Column(Integer, nullable=False, default=1)
    activa = Column(Boolean, nullable=False, default=True)
