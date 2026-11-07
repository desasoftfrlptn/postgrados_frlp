from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from src.shared.auth.jwt import crear_token_acceso
from src.shared.auth.orm_models import Usuario
from src.shared.auth.passwords import verificar_contrasena
from src.shared.auth.schemas import LoginRequest, LoginResponse
from src.shared.database.session import get_db

from src.shared.auth.dependencies import get_current_user
from src.shared.auth.schemas import UsuarioResponse
router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=LoginResponse)
async def iniciar_sesion(
    datos: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    consulta = select(Usuario).where(Usuario.email == datos.email.strip())
    resultado = await db.execute(consulta)
    usuario = resultado.scalar_one_or_none()

    if usuario is not None and usuario.activo:
        coincide = await run_in_threadpool(
            verificar_contrasena,
            datos.password.get_secret_value(),
            usuario.password_hash,
        )
        if coincide:
            return LoginResponse(access_token=crear_token_acceso(usuario.id))

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
    )

@router.get("/me", response_model=UsuarioResponse)
async def consultar_usuario_actual(
    usuario: Usuario = Depends(get_current_user),
) -> Usuario:
    return usuario