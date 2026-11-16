import argparse
from getpass import getpass

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.autenticacion.aplicacion.seguridad import cifrar_contrasena
from src.autenticacion.infraestructura.modelos import Usuario
from src.autenticacion.presentacion.esquemas import SolicitudInicioSesion
from src.db.session import SessionLocal

ROLES_PERMITIDOS = ("COORDINADOR", "CPR", "ADMIN")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Crea una cuenta interna para el sistema de posgrado."
    )
    parser.add_argument("email")
    parser.add_argument("rol", choices=ROLES_PERMITIDOS)
    argumentos = parser.parse_args()

    try:
        email = str(
            SolicitudInicioSesion(
                email=argumentos.email,
                contrasena="validacion-temporal",
            ).email
        )
    except ValidationError as error:
        parser.error(f"Email invalido: {error.errors()[0]['msg']}")

    contrasena = getpass("Contrasena (minimo 12 caracteres): ")
    confirmacion = getpass("Repetir contrasena: ")
    if contrasena != confirmacion:
        parser.error("Las contrasenas no coinciden")
    if len(contrasena) < 12:
        parser.error("La contrasena debe tener al menos 12 caracteres")
    if len(contrasena.encode("utf-8")) > 72:
        parser.error("La contrasena supera el maximo admitido por bcrypt")

    with SessionLocal() as sesion:
        existente = sesion.scalar(select(Usuario).where(Usuario.email == email))
        if existente is not None:
            parser.error("Ya existe una cuenta con ese email")
        sesion.add(
            Usuario(
                email=email,
                hash_contrasena=cifrar_contrasena(contrasena),
                rol=argumentos.rol,
            )
        )
        try:
            sesion.commit()
        except IntegrityError:
            sesion.rollback()
            parser.error("Ya existe una cuenta con ese email")

    print(f"Cuenta creada para {email} con rol {argumentos.rol}")


if __name__ == "__main__":
    main()
