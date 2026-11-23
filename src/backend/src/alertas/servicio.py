from sqlalchemy import select, func
from src.alertas.modelos import AlertaORM
from src.usuarios.modelos import UsuarioORM, RolORM
from src.compartido.documentos import normalizar_documento


async def alertar_rol(db, rol, titulo, mensaje, ruta):
    ids = await db.scalars(select(UsuarioORM.id).join(RolORM).where(
        RolORM.nombre == rol, UsuarioORM.activo.is_(True)))
    db.add_all([AlertaORM(usuario_id=id_, titulo=titulo, mensaje=mensaje, ruta=ruta) for id_ in ids])


async def alertar_alumno(db, legajo, titulo, mensaje, ruta):
    # La identidad debe coincidir por correo y documento, nunca solo por nombre.
    usuarios = await db.scalars(select(UsuarioORM).join(RolORM).where(
        RolORM.nombre == "ALUMNO", UsuarioORM.activo.is_(True),
        func.lower(func.trim(UsuarioORM.correo_electronico)) == legajo.correo_electronico.strip().lower()))
    for usuario in usuarios:
        if normalizar_documento(usuario.dni) == normalizar_documento(legajo.dni_pasaporte):
            db.add(AlertaORM(usuario_id=usuario.id, titulo=titulo, mensaje=mensaje, ruta=ruta))
