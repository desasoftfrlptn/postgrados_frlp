import os
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database.session import get_db
from app.shared.security.tokens import hash_token
from app.usuarios.models import SesionUsuario
from app.usuarios.repositories.repository import UsuarioRepository
from app.usuarios.services.service import UsuarioError, UsuarioService
from app.usuarios.schemas.schemas import ActivarCuentaRequest, LoginRequest

router = APIRouter(prefix="/auth", tags=["Autenticación"])
COOKIE = "sesion_estudiante"
def get_service(db: AsyncSession = Depends(get_db)): return UsuarioService(UsuarioRepository(db))

@router.post("/activar-cuenta")
async def activar(datos: ActivarCuentaRequest, service: UsuarioService = Depends(get_service)):
    try:
        await service.activar_cuenta(datos.token, datos.password)
        return {"mensaje": "Cuenta activada. Ya puede iniciar sesión."}
    except UsuarioError as e: raise HTTPException(400, str(e)) from e

@router.post("/login")
async def login(datos: LoginRequest, response: Response, service: UsuarioService = Depends(get_service)):
    try: token, usuario = await service.login(str(datos.email), datos.password)
    except UsuarioError as e: raise HTTPException(401, str(e)) from e
    response.set_cookie(COOKIE, token, httponly=True, secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
                        samesite="lax", max_age=43200, path="/")
    return {"id": usuario.id, "email": usuario.email, "rol": usuario.rol}

@router.get("/me")
async def me(request: Request, db: AsyncSession = Depends(get_db)):
    usuario = await UsuarioService(UsuarioRepository(db)).usuario_de_sesion(request.cookies.get(COOKIE, ""))
    if not usuario: raise HTTPException(401, "Sesión inválida o vencida")
    return {"id": usuario.id, "email": usuario.email, "rol": usuario.rol}

@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get(COOKIE, "")
    if token:
        from sqlalchemy import update
        await db.execute(update(SesionUsuario).where(SesionUsuario.token_hash == hash_token(token)).values(revocada=True))
        await db.commit()
    response.delete_cookie(COOKIE, path="/")
