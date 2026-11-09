from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from src.shared.auth.dependencies import get_current_user
from src.shared.auth.jwt import crear_token_acceso
from src.shared.auth.orm_models import Usuario
from src.shared.auth.passwords import verificar_contrasena
from src.shared.auth.refresh import crear_sesion_refresh
from src.shared.auth.schemas import (
    LoginRequest,
    LoginResponse,
    UsuarioResponse,
)
from src.shared.database.session import get_db

from src.shared.auth.refresh import renovar_sesion
from src.shared.auth.schemas import RefreshRequest, ActivarCuentaRequest

from src.shared.auth.activar_cuenta_repository import UsuarioRepository
from src.shared.auth.activar_cuenta_service import UsuarioError, UsuarioService

from fastapi import Response
from src.shared.auth.refresh import revocar_sesion

router = APIRouter(prefix="/auth", tags=["Autenticación"])

def get_service(db: AsyncSession = Depends(get_db)): return UsuarioService(UsuarioRepository(db))

@router.post("/activar-cuenta")
async def activar(datos: ActivarCuentaRequest, service: UsuarioService = Depends(get_service)):
    try:
        await service.activar_cuenta(datos.token, datos.password)
        return {"mensaje": "Cuenta activada. Ya puede iniciar sesión."}
    except UsuarioError as e: raise HTTPException(400, str(e)) from e



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
            access_token = crear_token_acceso(usuario.id)
            refresh_token = crear_sesion_refresh(db, usuario.id)

            await db.commit()

            return LoginResponse(
                access_token=access_token,
                refresh_token=refresh_token,
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
    )


@router.get("/me", response_model=UsuarioResponse)
async def consultar_usuario_actual(
    usuario: Usuario = Depends(get_current_user),
) -> Usuario:
    return usuario

@router.post("/refresh", response_model=LoginResponse)
async def refrescar_sesion(
    datos: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    try:
        access_token, refresh_token = await renovar_sesion(
            db,
            datos.refresh_token.get_secret_value(),
        )
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o vencida",
        ) from exc

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def cerrar_sesion(
    datos: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> Response:
    await revocar_sesion(db, datos.refresh_token.get_secret_value())
    return Response(status_code=status.HTTP_204_NO_CONTENT)