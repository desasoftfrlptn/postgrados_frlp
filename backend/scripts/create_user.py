import argparse
from getpass import getpass

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select

from src.authentication.application.security import hash_password
from src.authentication.infrastructure.models import User
from src.db.session import SessionLocal

ROLES = ("COORDINADOR", "CPR", "ADMIN")
EMAIL_ADAPTER = TypeAdapter(EmailStr)


def main() -> None:
    parser = argparse.ArgumentParser(description="Provisiona una cuenta del sistema")
    parser.add_argument("email")
    parser.add_argument("role", choices=ROLES)
    arguments = parser.parse_args()

    try:
        email = str(EMAIL_ADAPTER.validate_python(arguments.email)).lower()
    except ValidationError as error:
        raise SystemExit("El email ingresado no es válido") from error

    password = getpass("Contraseña: ")
    confirmation = getpass("Repetí la contraseña: ")
    if password != confirmation:
        raise SystemExit("Las contraseñas no coinciden")
    password_length = len(password.encode("utf-8"))
    if password_length < 12 or password_length > 72:
        raise SystemExit("La contraseña debe tener entre 12 y 72 bytes")

    with SessionLocal() as session:
        if session.scalar(select(User.id).where(User.email == email)) is not None:
            raise SystemExit("Ya existe una cuenta con ese email")
        session.add(
            User(
                email=email,
                password_hash=hash_password(password),
                role=arguments.role,
            )
        )
        session.commit()

    print(f"Cuenta {email} creada con rol {arguments.role}")


if __name__ == "__main__":
    main()
