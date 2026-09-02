from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timedelta
from .esquemas import LoginRequest, TokenResponse
from ..infraestructura.orm_modelos import Usuario
from src.compartido.baseDeDatos.conexion import get_db 
from src.compartido.seguridad import verify_password, created_token_access

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/login", response_model=TokenResponse)
async def login(credenciales: LoginRequest, db: AsyncSession = Depends(get_db)):
    resultado = await db.execute(select(Usuario).where(Usuario.email == credenciales.email))
    usuario = resultado.scalars().first()
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    password_valida = await run_in_threadpool(
        verify_password, 
        credenciales.password, 
        usuario.password_hash
    )
    
    if not password_valida:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=60)
    token = created_token_access(
        data={"sub": usuario.email, "rol": usuario.rol},
        expires_delta=access_token_expires
    )
    
    return {"access_token": token, "token_type": "bearer", "rol": usuario.rol}