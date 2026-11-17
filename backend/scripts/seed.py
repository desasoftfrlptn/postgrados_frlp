from sqlalchemy import select

from src.autenticacion.aplicacion.seguridad import hash_password
from src.autenticacion.infraestructura.modelos import User
from src.core.config import settings
from src.db.session import SessionLocal

DEVELOPMENT_USERS = (
    ("admin@fenix.test", "Admin1234!", "COORDINADOR"),
    ("cpr@fenix.test", "Cpr1234!", "CPR"),
)


def main() -> None:
    if settings.environment.lower() != "development":
        raise RuntimeError("El seed de cuentas de prueba solo puede ejecutarse en development")

    with SessionLocal() as session:
        for email, password, role in DEVELOPMENT_USERS:
            existing = session.scalar(select(User).where(User.email == email))
            if existing is None:
                session.add(
                    User(
                        email=email,
                        password_hash=hash_password(password),
                        role=role,
                    )
                )
        session.commit()


if __name__ == "__main__":
    main()
