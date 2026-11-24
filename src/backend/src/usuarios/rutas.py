from src.usuarios.seguridad import TokenBearer
# Define las rutas de autenticación y administración de usuarios.

from uuid import UUID
from fastapi import Request
from pydantic import EmailStr
from src.usuarios.recuperacion import solicitar_recuperacion
from src.usuarios.acceso import FINALIDAD_RECUPERACION
from src.usuarios.perfil import consultar_perfil, modificar_perfil, exigir_perfil
from src.usuarios.perfil_validaciones import ModificacionPerfil
from src.usuarios.modelos import PerfilUsuarioORM

from fastapi import (
    APIRouter,
    Depends,
    Response,
    HTTPException,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.conduccion.modelos import AuditoriaConduccionORM

from src.compartido.conexion import get_db
from pydantic import BaseModel, Field
from src.usuarios.acceso import activar_cuenta, obtener_usuario_enlace, FINALIDAD
from src.usuarios.cuentas_academicas import (
    candidatos_cuenta, obtener_legajo_matriculado, validar_identidad_alumno, consultar_destino_cuenta,
    nueva_clave_interna, enviar_acceso, asegurar_numero_legajo, asegurar_legajos_usuario, numeros_legajo_usuario, numeros_legajos_usuarios,
)
from src.usuarios.servicio import buscar_usuario_con_rol


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


seguridad = TokenBearer()


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

    numeros = await numeros_legajos_usuarios(db, usuarios)
    respuestas = []
    for usuario in usuarios:
        respuesta = respuesta_usuario(usuario)
        respuesta.numeros_legajo = numeros.get(usuario.id, [])
        respuestas.append(respuesta)
    return respuestas

@enrutador.get("/usuarios/candidatos")
async def listar_candidatos_cuenta(db: AsyncSession = Depends(get_db), administrador=Depends(administrador_actual)):
    return await candidatos_cuenta(db)


@enrutador.get("/usuarios/legajo/{legajo_id}")
async def consultar_legajo_cuenta(legajo_id: UUID, db: AsyncSession = Depends(get_db), administrador=Depends(administrador_actual)):
    return await consultar_destino_cuenta(db, legajo_id)


class ActivacionPeticion(BaseModel):
    token: str = Field(min_length=1, max_length=4096)
    contrasena_nueva: str = Field(min_length=8, max_length=128)
    repetir_contrasena: str = Field(min_length=8, max_length=128)


class ValidarEnlacePeticion(BaseModel):
    token: str = Field(min_length=1, max_length=4096)
    recuperacion: bool = False


@enrutador.post("/validar-enlace-acceso")
async def validar_enlace_acceso(datos: ValidarEnlacePeticion, response: Response, db: AsyncSession = Depends(get_db)):
    finalidad = FINALIDAD_RECUPERACION if datos.recuperacion else FINALIDAD
    await obtener_usuario_enlace(datos.token, db, finalidad)
    response.headers["Cache-Control"] = "no-store"
    return {"valido": True}


@enrutador.post("/activar-cuenta")
async def completar_activacion(datos: ActivacionPeticion, db: AsyncSession = Depends(get_db)):
    await activar_cuenta(datos.token, datos.contrasena_nueva, datos.repetir_contrasena, db)
    return {"message": "Cuenta activada correctamente."}


class RecuperacionPeticion(BaseModel):
    correo_electronico: EmailStr
    captcha: str = Field(min_length=1, max_length=4096)


@enrutador.post("/recuperar-contrasena")
async def recuperar_contrasena(datos: RecuperacionPeticion, request: Request, db: AsyncSession = Depends(get_db)):
    await solicitar_recuperacion(db, datos.correo_electronico, datos.captcha, request.client.host if request.client else "desconocido")
    return {"message": "Si la cuenta está habilitada, recibirás las instrucciones por correo."}


@enrutador.post("/restablecer-contrasena")
async def restablecer_contrasena(datos: ActivacionPeticion, db: AsyncSession = Depends(get_db)):
    await activar_cuenta(datos.token, datos.contrasena_nueva, datos.repetir_contrasena, db, FINALIDAD_RECUPERACION)
    return {"message": "Contraseña restablecida correctamente."}


@enrutador.post("/usuarios/{usuario_id}/reenviar-acceso")
async def reenviar_acceso(usuario_id: UUID, db: AsyncSession = Depends(get_db), administrador=Depends(administrador_actual)):
    usuario = await buscar_usuario_con_rol(usuario_id, db)
    if usuario is None:
        raise HTTPException(404, "Usuario no encontrado.")
    if not usuario.activo or usuario.rol.nombre == "ASPIRANTE":
        raise HTTPException(409, "La cuenta no está habilitada para recibir acceso.")
    if usuario.rol.nombre == "ALUMNO":
        await validar_identidad_alumno(db, usuario.dni, usuario.correo_electronico)
    numeros = await asegurar_legajos_usuario(db, usuario)
    if numeros:
        await db.commit()
        usuario = await buscar_usuario_con_rol(usuario_id, db)
    if not await enviar_acceso(usuario, await numeros_legajo_usuario(db, usuario)):
        raise HTTPException(503, "No se pudo enviar el correo. Verificá la configuración e intentá nuevamente.")
    return {"message": "Correo de acceso enviado."}


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
    numero = None
    if datos.tipo_usuario == "ALUMNO":
        if datos.legajo_id is None:
            raise HTTPException(422, "Seleccioná un alumno matriculado.")
        legajo = await obtener_legajo_matriculado(db, datos.legajo_id)
        nombre, apellido, dni, correo = legajo.nombre, legajo.apellido, legajo.dni_pasaporte, legajo.correo_electronico
    else:
        nombre, apellido, dni, correo = datos.nombre, datos.apellido, datos.dni, datos.correo_electronico
    if len(correo) > 200:
        raise HTTPException(422, "El correo supera la longitud admitida por las cuentas." )
    if datos.tipo_usuario == "ALUMNO":
        numero = await asegurar_numero_legajo(db, legajo)
    usuario = await crear_usuario(
        nombre=nombre,
        apellido=apellido,
        dni=dni,
        correo_electronico=correo,
        contrasena=nueva_clave_interna(),
        tipo_usuario=(
            datos.tipo_usuario
        ),
        db=db,
        administrador=administrador,
    )

    respuesta = respuesta_usuario(usuario)
    respuesta.numeros_legajo = sorted(set([numero, *await numeros_legajo_usuario(db, usuario)])) if numero else []
    respuesta.correo_acceso_enviado = await enviar_acceso(usuario, respuesta.numeros_legajo)
    return respuesta


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
    if datos.tipo_usuario == "ALUMNO":
        await validar_identidad_alumno(db, datos.dni, datos.correo_electronico)
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
            administrador=administrador,
        )
    )

    return respuesta_usuario(
        usuario
    )


@enrutador.get("/usuarios/{usuario_id}/auditoria")
async def auditoria_usuario(
    usuario_id: UUID,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(administrador_actual),
):
    eventos = await db.scalars(
        select(AuditoriaConduccionORM).where(
            AuditoriaConduccionORM.recurso_tipo == "USUARIO",
            AuditoriaConduccionORM.recurso_id == usuario_id,
        ).order_by(AuditoriaConduccionORM.fecha.desc()).limit(100)
    )
    return [{
        "id": evento.id, "actor_id": evento.actor_id,
        "actor_rol": evento.actor_rol, "accion": evento.accion,
        "fecha": evento.fecha, "anterior": evento.anterior, "nuevo": evento.nuevo,
    } for evento in eventos]


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


@enrutador.get("/mi-perfil")
async def mi_perfil(response: Response, usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    return await consultar_perfil(db, usuario)


@enrutador.patch("/mi-perfil")
async def guardar_mi_perfil(datos: ModificacionPerfil, response: Response, usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    try:
        return await modificar_perfil(db, usuario, datos)
    except Exception:
        await db.rollback()
        raise


@enrutador.get("/mi-perfil/foto")
async def foto_mi_perfil(response: Response, usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir_perfil(usuario)
    response.headers["Cache-Control"] = "no-store"
    perfil = await db.get(PerfilUsuarioORM, usuario.id)
    return {"foto": perfil.foto if perfil else None, "notificaciones_automaticas": perfil.datos.get("notificaciones_automaticas", True) if perfil else True}
