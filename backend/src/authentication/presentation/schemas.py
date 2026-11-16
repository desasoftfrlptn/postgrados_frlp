from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

UserRole = Literal["COORDINADOR", "CPR", "ADMIN"]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: UserRole


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=10, max_length=2048)
