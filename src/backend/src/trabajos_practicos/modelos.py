"""Registro de trabajos prácticos asociados al legajo académico."""
from uuid import uuid4
from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from src.compartido.conexion import Base


class TrabajoPracticoORM(Base):
    __tablename__ = "trabajos_practicos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    legajo_id = Column(UUID(as_uuid=True), ForeignKey("legajos.id", ondelete="RESTRICT"), nullable=False, index=True)
    titulo = Column(String(300), nullable=False)
    descripcion = Column(Text, nullable=False)
    fecha = Column(Date, nullable=False)
    activo = Column(Boolean, nullable=False, default=True, server_default="true")
    version = Column(Integer, nullable=False, default=1, server_default="1")
