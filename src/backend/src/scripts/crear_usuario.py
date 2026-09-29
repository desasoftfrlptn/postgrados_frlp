import asyncio
from getpass import getpass
from dotenv import load_dotenv
load_dotenv()
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from src.autenticacion.aplicacion.seguridad import hash_password
from src.autenticacion.infraestructura.orm_modelos import RolORM, UsuarioORM
from src.compartido.conexion import AsyncSessionLocal, engine


async def crear_usuario() -> None:
    try:
        async with AsyncSessionLocal() as session:
            resultado = await session.scalars(
                select(RolORM.nombre).order_by(RolORM.nombre)
            )
            roles = resultado.all()

        if not roles:
            print("No hay roles cargados. Ejecutá primero seed_roles.")
            return

        print("Roles disponibles:", ", ".join(roles))
        rol_nombre = input("Rol de la cuenta: ").strip().upper()

        if rol_nombre not in roles:
            print("Ese rol no existe.")
            return

        nombre = input("Nombre: ").strip()
        apellido = input("Apellido: ").strip()
        dni = input("DNI: ").strip()
        correo_ingresado = input("Correo electrónico: ").strip()

        if not nombre or not apellido or not dni:
            print("Nombre, apellido y dni son obligatorios.")
            return

        try:
            correo = str(
                TypeAdapter(EmailStr).validate_python(correo_ingresado)
            ).lower()
        except ValidationError:
            print("Ingresá un correo electrónico válido.")
            return

        contrasena = getpass("Contraseña (mínimo 8 caracteres): ")
        confirmacion = getpass("Repetí la contraseña: ")

        if len(contrasena) < 8:
            print("La contraseña debe tener al menos 8 caracteres.")
            return

        if contrasena != confirmacion:
            print("Las contraseñas no coinciden.")
            return

        async with AsyncSessionLocal() as session:
            rol = await session.scalar(
                select(RolORM).where(RolORM.nombre == rol_nombre)
            )
            existente = await session.scalar(
                select(UsuarioORM.id).where(
                    UsuarioORM.correo_electronico == correo
                )
            )

            if existente:
                print("Ya existe una cuenta con ese correo.")
                return

            usuario = UsuarioORM(
                nombre=nombre,
                apellido=apellido,
                dni=dni,
                correo_electronico=correo,
                contrasena_hash=hash_password(contrasena),
                rol_id=rol.id,
            )
            session.add(usuario)

            try:
                await session.commit()
            except IntegrityError:
                await session.rollback()
                print("No se pudo crear la cuenta; revisá si el correo ya existe.")
                return

        print(f"Cuenta creada para {correo} con rol {rol_nombre}.")

    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(crear_usuario())