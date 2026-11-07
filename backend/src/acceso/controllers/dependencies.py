from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.acceso.repositories.repository import AccesoRepository
from app.acceso.services.service import AccesoService
from app.shared.database.session import get_db

def get_acceso_service(db: AsyncSession = Depends(get_db)):
    return AccesoService(AccesoRepository(db))

async def get_acceso_actual(request: Request, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get("acceso_aspirante", "")
    contexto = await AccesoService(AccesoRepository(db)).obtener_contexto(token)
    if not contexto:
        raise HTTPException(401, "Se requiere un enlace de acceso válido")
    return contexto

def require_tipo_enlace(tipo: str):
    async def dependency(contexto=Depends(get_acceso_actual)):
        if contexto["tipo"] != tipo:
            raise HTTPException(403, "El enlace no permite esta operación")
        return contexto
    return dependency
