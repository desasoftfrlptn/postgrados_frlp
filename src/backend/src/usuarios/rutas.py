# Define las rutas de autenticación y administración de usuarios.

from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    Response,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy.ext.asyncio import AsyncSession

from src.compartido.conexion import get_db

from src.usuarios.servicio import (
    cambiar_contrasena,
    cambiar_contrasena_inicial,
    cambiar_estado_usuario,
    crear_token,
    crear_usuario,
    eliminar_usuario,
    iniciar_sesion,
    listar_usuarios,
    modificar_usuario,
    obtener_administrador_actual,
    obtener_usuario_actual,
)

from src.usuarios.esquemas import (
    CambiarContrasenaInicialPeticion,
    CambiarContrasenaPeticion,
    LoginPeticion,
    LoginRespuesta,
    UsuarioCrear,
    UsuarioEstadoModificar,
    UsuarioModificar,
    UsuarioRespuesta,
)


enrutador = APIRouter(
    prefix="/api/v1/autenticacion",
    tags=["Autenticación"],
)


seguridad = HTTPBearer()


async def usuario_actual(
    credenciales:
        HTTPAuthorizationCredentials = Depends(
            seguridad
        ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return await obtener_usuario_actual(
        credenciales.credentials,
        db,
    )


async def administrador_actual(
    credenciales:
        HTTPAuthorizationCredentials = Depends(
            seguridad
        ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    return await obtener_administrador_actual(
        credenciales.credentials,
        db,
    )


def respuesta_usuario(
    usuario,
) -> UsuarioRespuesta:
    return UsuarioRespuesta(
        id=usuario.id,
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        dni=usuario.dni,
        correo_electronico=(
            usuario.correo_electronico
        ),
        tipo_usuario=(
            usuario.rol.nombre
        ),
        activo=usuario.activo,
        debe_cambiar_contrasena=(
            usuario.debe_cambiar_contrasena
        ),
    )


@enrutador.post(
    "/login",
    response_model=LoginRespuesta,
)
async def login(
    datos: LoginPeticion,
    db: AsyncSession = Depends(get_db),
):
    usuario, tipo_usuario = (
        await iniciar_sesion(
            datos.correo_electronico,
            datos.contrasena,
            db,
        )
    )

    token = crear_token(
        usuario.id,
        tipo_usuario,
    )

    return LoginRespuesta(
        id=usuario.id,
        nombre=usuario.nombre,
        apellido=usuario.apellido,
        dni=usuario.dni,
        correo_electronico=(
            usuario.correo_electronico
        ),
        tipo_usuario=tipo_usuario,
        token=token,
        debe_cambiar_contrasena=(
            usuario.debe_cambiar_contrasena
        ),
    )


@enrutador.get(
    "/me",
    response_model=UsuarioRespuesta,
)
async def obtener_perfil_usuario(usuario=Depends(usuario_actual),):
    return respuesta_usuario(usuario)

@enrutador.get(
    "/usuarios",
    response_model=list[UsuarioRespuesta],
)
async def obtener_usuarios(
    db: AsyncSession = Depends(get_db),
    administrador=Depends(administrador_actual),
):
    usuarios = await listar_usuarios(db)

    return [
        respuesta_usuario(usuario)
        for usuario in usuarios
    ]

@enrutador.post(
    "/usuarios",
    response_model=UsuarioRespuesta,
    status_code=201,
)
async def registrar_usuario(
    datos: UsuarioCrear,
    db: AsyncSession = Depends(
        get_db
    ),
    administrador=Depends(
        administrador_actual
    ),
):
    usuario = await crear_usuario(
        nombre=datos.nombre,
        apellido=datos.apellido,
        dni=datos.dni,
        correo_electronico=(
            datos.correo_electronico
        ),
        contrasena=(
            datos.contrasena
        ),
        tipo_usuario=(
            datos.tipo_usuario
        ),
        db=db,
    )

    return respuesta_usuario(
        usuario
    )


@enrutador.put(
    "/usuarios/{usuario_id}",
    response_model=UsuarioRespuesta,
)
async def actualizar_usuario(
    usuario_id: UUID,
    datos: UsuarioModificar,
    db: AsyncSession = Depends(
        get_db
    ),
    administrador=Depends(
        administrador_actual
    ),
):
    usuario = (
        await modificar_usuario(
            usuario_id=usuario_id,
            nombre=datos.nombre,
            apellido=datos.apellido,
            dni=datos.dni,
            correo_electronico=(
                datos.correo_electronico
            ),
            tipo_usuario=(
                datos.tipo_usuario
            ),
            db=db,
        )
    )

    return respuesta_usuario(
        usuario
    )


@enrutador.patch(
    "/usuarios/{usuario_id}/estado",
    response_model=UsuarioRespuesta,
)
async def actualizar_estado_usuario(
    usuario_id: UUID,
    datos: UsuarioEstadoModificar,
    db: AsyncSession = Depends(
        get_db
    ),
    administrador=Depends(
        administrador_actual
    ),
):
    usuario = (
        await cambiar_estado_usuario(
            usuario_id=usuario_id,
            activo=datos.activo,
            administrador=administrador,
            db=db,
        )
    )

    return respuesta_usuario(
        usuario
    )


@enrutador.delete(
    "/usuarios/{usuario_id}",
    status_code=204,
)
async def borrar_usuario(
    usuario_id: UUID,
    db: AsyncSession = Depends(
        get_db
    ),
    administrador=Depends(
        administrador_actual
    ),
):
    await eliminar_usuario(
        usuario_id=usuario_id,
        administrador=administrador,
        db=db,
    )

    return Response(
        status_code=204
    )


@enrutador.post(
    "/cambiar-contrasena-inicial",
)
async def actualizar_contrasena_inicial(
    datos:
        CambiarContrasenaInicialPeticion,
    usuario=Depends(
        usuario_actual
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    await cambiar_contrasena_inicial(
        usuario=usuario,
        contrasena_nueva=(
            datos.contrasena_nueva
        ),
        repetir_contrasena=(
            datos.repetir_contrasena
        ),
        db=db,
    )

    return {
        "message": (
            "Contraseña actualizada "
            "correctamente"
        )
    }


@enrutador.post(
    "/cambiar-contrasena",
)
async def actualizar_contrasena(
    datos:
        CambiarContrasenaPeticion,
    usuario=Depends(
        usuario_actual
    ),
    db: AsyncSession = Depends(
        get_db
    ),
):
    await cambiar_contrasena(
        usuario=usuario,
        contrasena_actual=(
            datos.contrasena_actual
        ),
        contrasena_nueva=(
            datos.contrasena_nueva
        ),
        repetir_contrasena=(
            datos.repetir_contrasena
        ),
        db=db,
    )

    return {
        "message": (
            "Contraseña actualizada "
            "correctamente"
        )
    }