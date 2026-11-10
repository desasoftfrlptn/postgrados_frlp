import uuid

from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID

from src.compartido.conexion import Base


class LegajoORM(Base):
    __tablename__ = "legajos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    carrera_elegida = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    nombre = Column(String(100), nullable=False)
    nacionalidad = Column(String(100), nullable=False)
    dni_pasaporte = Column(String(100), nullable=False, unique=True)
    telefono_movil = Column(String(100), nullable=True)
    correo_electronico = Column(String(255), nullable=False, unique=True)
    correo_alternativo = Column(String(255), nullable=True)
    domicilio = Column(String(255), nullable=True)
    estado = Column(String(30), nullable=False, default="PENDIENTE")
    pais = Column(String(100), nullable=False)
    provincia = Column(String(200), nullable=False)
    ciudad = Column(String(200), nullable=False)
    titulo_anterior = Column(String(200), nullable=False)
    universidad_anterior = Column(String(200), nullable=False)
