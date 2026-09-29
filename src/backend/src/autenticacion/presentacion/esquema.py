from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class LoginPeticion(BaseModel):
    correo_electronico: EmailStr
    contrasena: str
    
class LoginRespuesta(BaseModel):
    id: UUID
    nombre: str
    apellido: str
    correo_electronico: str
    tipo_usuario: str
    token: str
    
class HistorialItem(BaseModel):
    fecha_acceso: datetime
    exitoso: bool
    
    class Config:
        from_attributes = True
