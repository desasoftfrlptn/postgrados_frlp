##El token ya se genera y devuelve el ID correcto.

from pydantic import BaseModel, SecretStr
from uuid import UUID
from pydantic import ConfigDict

class LoginRequest(BaseModel):
    email: str
    password: SecretStr


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UsuarioResponse(BaseModel):
    id: UUID
    nombre: str
    email: str
    rol: str
    model_config = ConfigDict(from_attributes=True)    