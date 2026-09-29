import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from src.compartido.conexion import Base

class UsuarioORM(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)    
    nombre = Column(String(200), nullable=False)
    apellido = Column(String(200), nullable=False)
    dni = Column(String(100), nullable=False, unique=True)
    correo_electronico = Column(String(200), nullable=False, unique=True)
    contrasena_hash = Column(String(255), nullable=False) 
    rol_id = Column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable = False,
    ) 
    activo = Column(Boolean, nullable=False, default=True)
    rol = relationship("RolORM", back_populates="usuarios")
    historial = relationship("HistorialAccesoORM", back_populates="usuario")

class RolORM(Base):
    __tablename__="roles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(50), nullable=False)
    usuarios = relationship("UsuarioORM", back_populates="rol")
        
        
class HistorialAccesoORM(Base):
    __tablename__= "historial_accesos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    ) #Caso de cuando un usuario quiera entrar con un correo inexistente
    tipo_rol = Column(String(20), nullable=True) 
    fecha_acceso = Column(
        DateTime(timezone=True),
        nullable=False,
        default = lambda: datetime.now(timezone.utc),
        )
    exitoso = Column(Boolean, nullable=False, default=True)
    usuario = relationship("UsuarioORM", back_populates="historial")