from pwdlib import PasswordHash


_password_hash = PasswordHash.recommended()


def hash_password(contrasena: str) -> str:
    if not contrasena:
        raise ValueError("La contraseña no puede estar vacía.")
    return _password_hash.hash(contrasena)


def verificar_password(contrasena: str, contrasena_hash: str) -> bool:
    return _password_hash.verify(contrasena, contrasena_hash)