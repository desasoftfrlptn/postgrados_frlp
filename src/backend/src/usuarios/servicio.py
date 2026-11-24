import os
import math

from datetime import (
    datetime,
    timedelta,
    timezone,
)
from uuid import UUID, uuid4
from dotenv import load_dotenv
from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.compartido.documentos import normalizar_documento
from src.usuarios.seguridad import (
    hash_password,
    verificar_password,
)
from src.usuarios.modelos import (
    RolORM,
    UsuarioORM,
)
from src.conduccion.modelos import AuditoriaConduccionORM


def auditar_usuario(db, actor, usuario, accion, anterior=None):
    """Se persiste junto con la operación, sin hashes ni contraseñas."""
    if actor is None:
        return
    db.add(AuditoriaConduccionORM(
        actor_id=actor.id,
        actor_rol=actor.rol.nombre,
        recurso_tipo="USUARIO",
        recurso_id=usuario.id,
        accion=accion,
        anterior=anterior,
        nuevo=estado_auditable(usuario) if accion != "ELIMINAR_USUARIO" else None,
    ))


def estado_auditable(usuario):
    return {
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "dni": usuario.dni,
        "correo_electronico": usuario.correo_electronico,
        "rol_id": str(usuario.rol_id),
        "activo": usuario.activo,
    }


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
            func.lower(UsuarioORM.correo_electronico)
            == correo.strip().lower()
        )
    )

    usuario = await db.scalar(
        consulta
    )

    if (
        usuario is None
        or not usuario.activo
        or usuario.rol is None
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
            headers={"WWW-Authenticate": "Bearer"},
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
        "finalidad": "sesion",
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
        .execution_options(populate_existing=True)
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
            options={"require_exp": True, "require_sub": True},
        )

        if contenido.get("finalidad", "sesion") != "sesion" or not isinstance(contenido.get("tipo_usuario"), str):
            raise JWTError("Finalidad o rol de token incorrecto.")

        if (not isinstance(contenido["exp"], (int, float))
                or isinstance(contenido["exp"], bool)
                or not math.isfinite(contenido["exp"])):
            raise ValueError("Vencimiento inválido")

        usuario_id = contenido.get(
            "sub"
        )

        if not usuario_id:
            raise HTTPException(
                status_code=401,
                detail="Token inválido",
                headers={"WWW-Authenticate": "Bearer"},
            )

        id_usuario = UUID(
            usuario_id
        )

    except (
        JWTError,
        ValueError,
        TypeError,
        OverflowError,
    ):
        raise HTTPException(
            status_code=401,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    usuario = await buscar_usuario_con_rol(
        id_usuario,
        db,
    )

    if (
        usuario is None
        or not usuario.activo
        or usuario.rol is None
    ):
        raise HTTPException(
            status_code=401,
            detail="Usuario no válido",
            headers={"WWW-Authenticate": "Bearer"},
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

    if nombre not in {"ADMIN", "ALUMNO", "COORDINADOR", "CPR", "DOCENTE"}:
        raise HTTPException(400, "El rol indicado no permite crear cuentas privadas.")

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
    administrador=None,
) -> UsuarioORM:
    correo = (
        correo_electronico
        .strip()
        .lower()
    )

    dni_limpio = (
        normalizar_documento(dni)
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
            func.lower(UsuarioORM.correo_electronico)
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
            func.upper(func.regexp_replace(UsuarioORM.dni, r"[.\s]", "", "g"))
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
        id=uuid4(),
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
    auditar_usuario(db, administrador, usuario, "CREAR_USUARIO")

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
    administrador=None,
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

    if not all(valor.strip() for valor in (nombre, apellido, dni)):
        raise HTTPException(status_code=400, detail="Nombre, apellido y DNI son obligatorios")
    if administrador and administrador.id == usuario_id and tipo_usuario.strip().upper() != "ADMIN":
        raise HTTPException(status_code=400, detail="No podés quitarte tu propio rol de administrador.")

    anterior = estado_auditable(usuario)

    correo = (
        correo_electronico
        .strip()
        .lower()
    )

    dni_limpio = (
        normalizar_documento(dni)
    )

    usuario_mismo_correo = await db.scalar(
        select(UsuarioORM).where(
            func.lower(UsuarioORM.correo_electronico)
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
            func.upper(func.regexp_replace(UsuarioORM.dni, r"[.\s]", "", "g"))
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
    auditar_usuario(db, administrador, usuario, "EDITAR_USUARIO", anterior)

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

    anterior = estado_auditable(usuario)
    usuario.activo = activo
    auditar_usuario(db, administrador, usuario, "ACTIVAR_USUARIO" if activo else "DESACTIVAR_USUARIO", anterior)

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
        from src.seminarios.infraestructura.orm_modelos import SeminarioORM
        auditar_usuario(db, administrador, usuario, "ELIMINAR_USUARIO", estado_auditable(usuario))
        # El seminario se conserva, pero no admite nuevas cursadas hasta reasignar docente.
        await db.execute(update(SeminarioORM).where(SeminarioORM.docente_id == usuario_id)
                         .values(activo=False))
        await db.delete(
            usuario
        )

        await db.commit()

    except IntegrityError:
        await db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "No se pudo eliminar el usuario sin afectar registros existentes. "
                "Verificá que las migraciones estén aplicadas."
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
