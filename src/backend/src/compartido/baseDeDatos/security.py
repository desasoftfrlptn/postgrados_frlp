import jwt
import os
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext


SECRET_KEY = os.getenv("SECRET_KEY", "producto")
ALGORITHM = "HS256"
EXPIRE_MINUTES: int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hashear_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hash_guardado: str) -> bool:
    return pwd_context.verify(password, hash_guardado)

def create_token_access(dato: dict) -> str:
    payload = datos.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=[ALGORITHM])