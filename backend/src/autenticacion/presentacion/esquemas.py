import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

UserRole = Literal["COORDINADOR", "CPR", "ADMIN"]


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str

    @field_validator("email")
    @classmethod
    def validar_email(cls, value: str) -> str:
        email = value.strip().lower()
        if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) is None:
            raise ValueError("Ingresá un email válido")
        return email


class UserResponse(BaseModel):
    id: UUID
    email: str = Field(min_length=3, max_length=254)
    role: UserRole


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=10, max_length=2048)

