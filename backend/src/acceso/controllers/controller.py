import os
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from app.acceso.services.service import AccesoError, AccesoService
from app.acceso.schemas.schemas import CrearEnlaceRequest, TokenRequest
from app.acceso.controllers.dependencies import get_acceso_service
from app.shared.auth.dependencies import UsuarioActual, require_role

router = APIRouter(prefix="/accesos", tags=["Accesos temporales"])
COOKIE = "acceso_aspirante"


@router.post("", status_code=201)
async def crear_enlace(datos: CrearEnlaceRequest, usuario: UsuarioActual = Depends(require_role("COORDINADOR")),
                       service: AccesoService = Depends(get_acceso_service)):
    try:
        return await service.crear_enlace(**datos.model_dump(), creado_por=usuario.email,
            frontend_url=os.getenv("FRONTEND_URL", "http://localhost:5173"))
    except AccesoError as e: raise HTTPException(422, str(e)) from e

@router.post("/validar")
async def validar(datos: TokenRequest, request: Request, service: AccesoService = Depends(get_acceso_service)):
    try: await service.verificar_limite(request.client.host if request.client else "unknown", "validar_enlace")
    except AccesoError as e: raise HTTPException(429, str(e)) from e
    return await service.validar_token(datos.token)

@router.post("/intercambiar")
async def intercambiar(datos: TokenRequest, response: Response, request: Request, service: AccesoService = Depends(get_acceso_service)):
    try:
        await service.verificar_limite(request.client.host if request.client else "unknown", "intercambiar_enlace")
    except AccesoError as e: raise HTTPException(429, str(e)) from e
    try:
        session_token, enlace = await service.intercambiar(datos.token)
    except AccesoError as e: raise HTTPException(401, str(e)) from e
    response.set_cookie(COOKIE, session_token, httponly=True, secure=os.getenv("COOKIE_SECURE", "false").lower() == "true",
                        samesite="lax", max_age=7200, path="/")
    return {"tipo": enlace.tipo, "requiere_autenticacion": False}

@router.get("/sesion")
async def consultar_sesion(request: Request, service: AccesoService = Depends(get_acceso_service)):
    contexto = await service.obtener_contexto(request.cookies.get(COOKIE, ""))
    if not contexto: raise HTTPException(401, "Sesión de acceso inválida o vencida")
    return {"tipo": contexto["tipo"]}

@router.delete("/sesion", status_code=204)
async def cerrar_sesion(request: Request, response: Response, service: AccesoService = Depends(get_acceso_service)):
    await service.cerrar_sesion(request.cookies.get(COOKIE, ""))
    response.delete_cookie(COOKIE, path="/")

@router.post("/{enlace_id}/revocar")
async def revocar(enlace_id: UUID, usuario: UsuarioActual = Depends(require_role("COORDINADOR")),
                  service: AccesoService = Depends(get_acceso_service)):
    try:
        enlace = await service.revocar(enlace_id)
        return {"id": enlace.id, "revocado": True}
    except AccesoError as e: raise HTTPException(404, str(e)) from e

@router.get("/legajo")
async def consultar_legajo(request: Request, service: AccesoService = Depends(get_acceso_service)):
    from app.inscripcion.presentation.schemas import LegajoResponse
    try:
        legajo = await service.obtener_legajo_seguimiento(request.cookies.get(COOKIE, ""))
        return LegajoResponse.model_validate(legajo)
    except AccesoError as e:
        raise HTTPException(403 if "seguimiento" in str(e).lower() else 404, str(e)) from e
