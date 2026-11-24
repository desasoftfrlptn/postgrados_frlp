from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID
from src.compartido.conexion import Base


class AlertaORM(Base):
    __tablename__ = "alertas_usuario"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    titulo = Column(String(160), nullable=False)
    mensaje = Column(Text, nullable=False)
    ruta = Column(String(250), nullable=False)
    fecha = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    leida_en = Column(DateTime(timezone=True), nullable=True)
    __table_args__ = (Index("ix_alertas_usuario_fecha", "usuario_id", "fecha"),)
