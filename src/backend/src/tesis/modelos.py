"""Registro de tesis de maestría y doctorado."""
from uuid import uuid4

from sqlalchemy import CheckConstraint, Column, Date, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from src.compartido.conexion import Base


class TesisORM(Base):
    __tablename__ = "tesis"
    __table_args__ = (
        CheckConstraint("version >= 1", name="ck_tesis_version"),
        CheckConstraint(
            "(fecha_aprobacion IS NULL) = (numero_resolucion IS NULL)",
            name="ck_tesis_aprobacion_completa",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    legajo_id = Column(UUID(as_uuid=True), ForeignKey("legajos.id", ondelete="RESTRICT"), nullable=False, unique=True)
    titulo = Column(String(300), nullable=False)
    director = Column(String(200), nullable=False)
    codirector = Column(String(200), nullable=True)
    fecha_aprobacion = Column(Date, nullable=True)
    numero_resolucion = Column(String(100), nullable=True)
    version = Column(Integer, nullable=False, default=1, server_default="1")
    actualizado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
