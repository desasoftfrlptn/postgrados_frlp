from uuid import uuid4
from sqlalchemy import Boolean, Column, Date, ForeignKey, String, Text, CheckConstraint, Integer
from sqlalchemy.dialects.postgresql import UUID
from src.compartido.conexion import Base


class TutoriaORM(Base):
    __tablename__ = "tutorias"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    legajo_id = Column(UUID(as_uuid=True), ForeignKey("legajos.id", ondelete="RESTRICT"), nullable=False, unique=True)
    tutor_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    activa = Column(Boolean, nullable=False, default=True, server_default="true")


class EncuentroORM(Base):
    __tablename__ = "encuentros_tutoria"
    __table_args__ = (CheckConstraint("estado IN ('PENDIENTE', 'REALIZADA', 'CANCELADA')", name="ck_encuentro_estado"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tutoria_id = Column(UUID(as_uuid=True), ForeignKey("tutorias.id", ondelete="RESTRICT"), nullable=False, index=True)
    autor_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    fecha = Column(Date, nullable=False)
    estado = Column(String(12), nullable=False)
    observaciones = Column(Text, nullable=False)
    version = Column(Integer, nullable=False, default=1, server_default="1")
