from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.autenticacion.aplicacion.seguridad import (
    obtener_usuario_actual,
    renovar_tokens,
    revocar_sesion,
    crear_par_tokens,
    verificar_credenciales,
)
from src.autenticacion.infraestructura.modelos import Usuario
from src.autenticacion.presentacion.esquemas import (
    RespuestaInicioSesion,
    SolicitudInicioSesion,
    SolicitudRenovacion,
    UsuarioRespuesta,
)
from src.db.session import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["autenticacion"])


@router.post("/login", response_model=RespuestaInicioSesion)
def iniciar_sesion(
    datos: SolicitudInicioSesion,
    sesion: Session = Depends(get_db),
) -> RespuestaInicioSesion:
    usuario = verificar_credenciales(
        sesion,
        str(datos.email),
        datos.contrasena,
    )
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_acceso, token_renovacion, expira_en = crear_par_tokens(
        sesion,
        usuario,
    )
    sesion.commit()
    return RespuestaInicioSesion(
        token_acceso=token_acceso,
        token_renovacion=token_renovacion,
        expira_en=expira_en,
        usuario=UsuarioRespuesta(
            id=usuario.id,
            email=usuario.email,
            rol=usuario.rol,
        ),
    )


@router.post("/refresh", response_model=RespuestaInicioSesion)
def renovar_sesion(
    datos: SolicitudRenovacion,
    sesion: Session = Depends(get_db),
) -> RespuestaInicioSesion:
    usuario, token_acceso, token_renovacion, expira_en = renovar_tokens(
        sesion,
        datos.token_renovacion,
    )
    return RespuestaInicioSesion(
        token_acceso=token_acceso,
        token_renovacion=token_renovacion,
        expira_en=expira_en,
        usuario=UsuarioRespuesta(
            id=usuario.id,
            email=usuario.email,
            rol=usuario.rol,
        ),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def cerrar_sesion(
    datos: SolicitudRenovacion,
    sesion: Session = Depends(get_db),
) -> None:
    revocar_sesion(sesion, datos.token_renovacion)


@router.get("/me", response_model=UsuarioRespuesta)
def obtener_perfil(
    usuario: Usuario = Depends(obtener_usuario_actual),
) -> UsuarioRespuesta:
    return UsuarioRespuesta(
        id=usuario.id,
        email=usuario.email,
        rol=usuario.rol,
    )
