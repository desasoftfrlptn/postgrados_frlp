import argparse
from getpass import getpass

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select

from src.authentication.application.security import hash_password
from src.authentication.infrastructure.models import User
from src.db.session import SessionLocal

ROLES = ("COORDINADOR", "CPR", "ADMIN")
ADAPTADOR_EMAIL = TypeAdapter(EmailStr)


def main() -> None:
    analizador = argparse.ArgumentParser(description="Provisiona una cuenta del sistema")
    analizador.add_argument("email", help="Correo electrónico de la cuenta")
    analizador.add_argument("rol", choices=ROLES, help="Rol asignado a la cuenta")
    argumentos = analizador.parse_args()

    try:
        email = str(ADAPTADOR_EMAIL.validate_python(argumentos.email)).lower()
    except ValidationError as error:
        raise SystemExit("El email ingresado no es válido") from error

    contrasena = getpass("Contraseña: ")
    confirmacion = getpass("Repetí la contraseña: ")
    if contrasena != confirmacion:
        raise SystemExit("Las contraseñas no coinciden")

    longitud_contrasena = len(contrasena.encode("utf-8"))
    if longitud_contrasena < 12 or longitud_contrasena > 72:
        raise SystemExit("La contraseña debe tener entre 12 y 72 bytes")

    with SessionLocal() as sesion:
        if sesion.scalar(select(User.id).where(User.email == email)) is not None:
            raise SystemExit("Ya existe una cuenta con ese email")
        sesion.add(
            User(
                email=email,
                password_hash=hash_password(contrasena),
                role=argumentos.rol,
            )
        )
        sesion.commit()

    print(f"Cuenta {email} creada con rol {argumentos.rol}")


if __name__ == "__main__":
    main()

