# Contiene la lógica de autenticación y administración de usuarios.

import os

from datetime import (
    datetime,
    timedelta,
    timezone,
)
from uuid import UUID

from dotenv import load_dotenv
from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.usuarios.seguridad import (
    hash_password,
    verificar_password,
)
from src.usuarios.modelos import (
    RolORM,
    UsuarioORM,
)


load_dotenv()


SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "Falta definir SECRET_KEY"
    )


ALGORITHM = "HS256"
EXPIRACION_MINUTOS = 60


async def iniciar_sesion(
    correo: str,
    contrasena: str,
    db: AsyncSession,
) -> tuple[UsuarioORM, str]:
    consulta = (
        select(UsuarioORM)
        .options(
            selectinload(
                UsuarioORM.rol
            )
        )
        .where(
            UsuarioORM.correo_electronico
            == correo.strip().lower()
        )
    )

    usuario = await db.scalar(
        consulta
    )

    if (
        usuario is None
        or not usuario.activo
        or not verificar_password(
            contrasena,
            usuario.contrasena_hash,
        )
    ):
        raise HTTPException(
            status_code=401,
            detail=(
                "Correo o contraseña incorrectos"
            ),
        )

    return (
        usuario,
        usuario.rol.nombre,
    )


def crear_token(
    usuario_id: UUID,
    tipo_usuario: str,
) -> str:
    vencimiento = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=EXPIRACION_MINUTOS
        )
    )

    contenido = {
        "sub": str(usuario_id),
        "tipo_usuario": tipo_usuario,
        "exp": vencimiento,
    }

    return jwt.encode(
        contenido,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


async def buscar_usuario_con_rol(
    usuario_id: UUID,
    db: AsyncSession,
) -> UsuarioORM | None:
    consulta = (
        select(UsuarioORM)
        .options(
            selectinload(
                UsuarioORM.rol
            )
        )
        .where(
            UsuarioORM.id
            == usuario_id
        )
    )

    return await db.scalar(
        consulta
    )


async def obtener_usuario_actual(
    token: str,
    db: AsyncSession,
) -> UsuarioORM:
    try:
        contenido = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        usuario_id = contenido.get(
            "sub"
        )

        if not usuario_id:
            raise HTTPException(
                status_code=401,
                detail="Token inválido",
            )

        id_usuario = UUID(
            usuario_id
        )

    except (
        JWTError,
        ValueError,
    ):
        raise HTTPException(
            status_code=401,
            detail="Token inválido",
        )

    usuario = await buscar_usuario_con_rol(
        id_usuario,
        db,
    )

    if (
        usuario is None
        or not usuario.activo
    ):
        raise HTTPException(
            status_code=401,
            detail="Usuario no válido",
        )

    return usuario


async def obtener_administrador_actual(
    token: str,
    db: AsyncSession,
) -> UsuarioORM:
    usuario = await obtener_usuario_actual(
        token,
        db,
    )

    if (
        usuario.rol.nombre
        != "ADMIN"
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Se requieren permisos "
                "de administrador"
            ),
        )

    return usuario


async def obtener_rol(
    nombre_rol: str,
    db: AsyncSession,
) -> RolORM:
    nombre = (
        nombre_rol
        .strip()
        .upper()
    )

    rol = await db.scalar(
        select(RolORM).where(
            RolORM.nombre
            == nombre
        )
    )

    if rol is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "El rol indicado no existe"
            ),
        )

    return rol


async def listar_usuarios(
    db: AsyncSession,
) -> list[UsuarioORM]:
    resultado = await db.execute(
        select(UsuarioORM)
        .options(
            selectinload(
                UsuarioORM.rol
            )
        )
        .order_by(
            UsuarioORM.apellido,
            UsuarioORM.nombre,
        )
    )

    return list(
        resultado.scalars().all()
    )


async def crear_usuario(
    nombre: str,
    apellido: str,
    dni: str,
    correo_electronico: str,
    contrasena: str,
    tipo_usuario: str,
    db: AsyncSession,
) -> UsuarioORM:
    correo = (
        correo_electronico
        .strip()
        .lower()
    )

    dni_limpio = (
        dni.strip()
    )

    nombre_limpio = (
        nombre.strip()
    )

    apellido_limpio = (
        apellido.strip()
    )

    if (
        not nombre_limpio
        or not apellido_limpio
        or not dni_limpio
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Nombre, apellido y DNI "
                "son obligatorios"
            ),
        )

    usuario_correo = await db.scalar(
        select(UsuarioORM).where(
            UsuarioORM.correo_electronico
            == correo
        )
    )

    if usuario_correo:
        raise HTTPException(
            status_code=400,
            detail=(
                "Ya existe un usuario "
                "con ese correo"
            ),
        )

    usuario_dni = await db.scalar(
        select(UsuarioORM).where(
            UsuarioORM.dni
            == dni_limpio
        )
    )

    if usuario_dni:
        raise HTTPException(
            status_code=400,
            detail=(
                "Ya existe un usuario "
                "con ese DNI"
            ),
        )

    rol = await obtener_rol(
        tipo_usuario,
        db,
    )

    usuario = UsuarioORM(
        nombre=nombre_limpio,
        apellido=apellido_limpio,
        dni=dni_limpio,
        correo_electronico=correo,
        contrasena_hash=hash_password(
            contrasena
        ),
        rol_id=rol.id,
        activo=True,
        debe_cambiar_contrasena=True,
    )

    db.add(
        usuario
    )

    try:
        await db.commit()

    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "No se pudo crear el usuario. "
                "Revisá que el correo y el DNI "
                "no estén registrados."
            ),
        )

    usuario = await buscar_usuario_con_rol(
        usuario.id,
        db,
    )

    return usuario


async def modificar_usuario(
    usuario_id: UUID,
    nombre: str,
    apellido: str,
    dni: str,
    correo_electronico: str,
    tipo_usuario: str,
    db: AsyncSession,
) -> UsuarioORM:
    usuario = await buscar_usuario_con_rol(
        usuario_id,
        db,
    )

    if usuario is None:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado",
        )

    correo = (
        correo_electronico
        .strip()
        .lower()
    )

    dni_limpio = (
        dni.strip()
    )

    usuario_mismo_correo = await db.scalar(
        select(UsuarioORM).where(
            UsuarioORM.correo_electronico
            == correo,
            UsuarioORM.id
            != usuario_id,
        )
    )

    if usuario_mismo_correo:
        raise HTTPException(
            status_code=400,
            detail=(
                "Ya existe otro usuario "
                "con ese correo"
            ),
        )

    usuario_mismo_dni = await db.scalar(
        select(UsuarioORM).where(
            UsuarioORM.dni
            == dni_limpio,
            UsuarioORM.id
            != usuario_id,
        )
    )

    if usuario_mismo_dni:
        raise HTTPException(
            status_code=400,
            detail=(
                "Ya existe otro usuario "
                "con ese DNI"
            ),
        )

    rol = await obtener_rol(
        tipo_usuario,
        db,
    )

    usuario.nombre = (
        nombre.strip()
    )

    usuario.apellido = (
        apellido.strip()
    )

    usuario.dni = (
        dni_limpio
    )

    usuario.correo_electronico = (
        correo
    )

    usuario.rol_id = (
        rol.id
    )

    try:
        await db.commit()

    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=400,
            detail=(
                "No se pudo modificar "
                "el usuario"
            ),
        )

    usuario = await buscar_usuario_con_rol(
        usuario_id,
        db,
    )

    return usuario


async def cambiar_estado_usuario(
    usuario_id: UUID,
    activo: bool,
    administrador: UsuarioORM,
    db: AsyncSession,
) -> UsuarioORM:
    if (
        usuario_id
        == administrador.id
        and not activo
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "No podés desactivar "
                "tu propio usuario."
            ),
        )

    usuario = await buscar_usuario_con_rol(
        usuario_id,
        db,
    )

    if usuario is None:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado",
        )

    usuario.activo = activo

    await db.commit()

    usuario = await buscar_usuario_con_rol(
        usuario_id,
        db,
    )

    return usuario


async def eliminar_usuario(
    usuario_id: UUID,
    administrador: UsuarioORM,
    db: AsyncSession,
) -> None:
    if (
        usuario_id
        == administrador.id
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "No podés eliminar "
                "tu propio usuario."
            ),
        )

    usuario = await db.get(
        UsuarioORM,
        usuario_id,
    )

    if usuario is None:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado",
        )

    try:
        await db.delete(
            usuario
        )

        await db.commit()

    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "No se puede eliminar el usuario "
                "porque está relacionado con otros "
                "registros del sistema. "
                "Podés desactivarlo en su lugar."
            ),
        )


async def cambiar_contrasena_inicial(
    usuario: UsuarioORM,
    contrasena_nueva: str,
    repetir_contrasena: str,
    db: AsyncSession,
) -> None:
    if (
        not usuario.debe_cambiar_contrasena
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "El usuario ya realizó "
                "el cambio inicial de contraseña"
            ),
        )

    if (
        contrasena_nueva
        != repetir_contrasena
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Las contraseñas "
                "no coinciden"
            ),
        )

    usuario.contrasena_hash = (
        hash_password(
            contrasena_nueva
        )
    )

    usuario.debe_cambiar_contrasena = (
        False
    )

    await db.commit()


async def cambiar_contrasena(
    usuario: UsuarioORM,
    contrasena_actual: str,
    contrasena_nueva: str,
    repetir_contrasena: str,
    db: AsyncSession,
) -> None:
    if not verificar_password(
        contrasena_actual,
        usuario.contrasena_hash,
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "La contraseña actual "
                "es incorrecta"
            ),
        )

    if (
        contrasena_nueva
        != repetir_contrasena
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Las contraseñas nuevas "
                "no coinciden"
            ),
        )

    if verificar_password(
        contrasena_nueva,
        usuario.contrasena_hash,
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "La nueva contraseña debe "
                "ser diferente a la actual"
            ),
        )

    usuario.contrasena_hash = (
        hash_password(
            contrasena_nueva
        )
    )

    usuario.debe_cambiar_contrasena = (
        False
    )

    await db.commit()