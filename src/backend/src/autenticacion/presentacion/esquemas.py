from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

# Este es el esquema de los datos que el Frontend nos va a ENVIAR
class LegajoCrear(BaseModel):
    dni: str
    apellido: str
    nombre: str
    email: EmailStr  # EmailStr valida automáticamente que sea un correo real
    tipo_carrera: str

# Este es el esquema de lo que nosotros le VAMOS A DEVOLVER al Frontend
class LegajoRespuesta(BaseModel):
    id: UUID
    dni: str
    apellido: str
    nombre: str
    email: str
    estado: str
    tipo_carrera: str
    created_at: datetime
    
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    rol: str

    class Config:
        # Esto permite que Pydantic lea los datos directamente desde tu LegajoORM
        from_attributes = True