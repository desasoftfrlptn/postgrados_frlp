import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Identity,
    Integer,
    JSON,
    String,
    Text,
    false,
    func,
)

from sqlalchemy.dialects.postgresql import UUID
from src.compartido.conexion import Base

def ahora_utc():
    return datetime.now(timezone.utc)

class GestionLegajoORM(Base):
    __tablename__ = "gestion_legajos"

    legajo_id = Column(
        UUID(as_uuid=True),
        ForeignKey("legajos.id", ondelete="RESTRICT"),
        primary_key=True,
    )

    numero_legajo = Column(
        String(50),
        nullable=True,
        unique=True,
    )

    datos_verificados = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default=false(),
    )

    tiene_titulo_posgrado = Column(
        Boolean,
        nullable=True,
    )

    fecha_aprobacion = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    fecha_matricula = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    fecha_baja = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    observaciones = Column(
        Text,
        nullable=True,
    )


class NumeracionCohorteORM(Base):
    __tablename__ = "numeracion_legajos_cohortes"

    id = Column(
        Integer,
        Identity(),
        primary_key=True,
    )

    cohorte_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cohortes.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )

    ultimo_numero = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )


class AuditoriaConduccionORM(Base):
    __tablename__ = "auditoria_conduccion"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    actor_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    actor_rol = Column(
        String(50),
        nullable=False,
    )

    recurso_tipo = Column(
        String(50),
        nullable=False,
    )

    recurso_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )

    accion = Column(
        String(80),
        nullable=False,
    )

    resultado = Column(
        String(30),
        nullable=False,
        default="EXITOSO",
    )

    anterior = Column(
        JSON,
        nullable=True,
    )

    nuevo = Column(
        JSON,
        nullable=True,
    )

    comentario = Column(
        Text,
        nullable=True,
    )

    fecha = Column(
        DateTime(timezone=True),
        nullable=False,
        default=ahora_utc,
        server_default=func.now(),
    )


class NotificacionConduccionORM(Base):
    __tablename__ = "notificaciones_conduccion"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    destinatario = Column(
        String(255),
        nullable=False,
    )

    asunto = Column(
        String(200),
        nullable=False,
    )

    contenido = Column(
        Text,
        nullable=False,
    )

    enviado = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default=false(),
    )

    intentos = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    ultimo_error = Column(
        String(200),
        nullable=True,
    )

    fecha_creacion = Column(
        DateTime(timezone=True),
        nullable=False,
        default=ahora_utc,
        server_default=func.now(),
    )

    fecha_envio = Column(
        DateTime(timezone=True),
        nullable=True,
    )