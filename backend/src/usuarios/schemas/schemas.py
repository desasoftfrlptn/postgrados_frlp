from pydantic import BaseModel, EmailStr, Field

class ActivarCuentaRequest(BaseModel): token: str = Field(min_length=20, max_length=200); password: str = Field(min_length=12, max_length=128)
class LoginRequest(BaseModel): email: EmailStr; password: str = Field(min_length=1, max_length=128)
