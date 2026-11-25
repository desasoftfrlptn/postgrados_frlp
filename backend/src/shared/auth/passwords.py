##En el login, contrasena va a ser lo que ingrese el usuario y password_hash 
## va a salir de Usuario.password_hash. Si bcrypt rechaza la entrada, por ejemplo
## porque el hash guardado tiene un formato inválido, la función devuelve False

import bcrypt 

def hash_contrasena(contrasena: str) -> str:
    """Genera un hash con la contraseña encriptada"""
    if len(contrasena.encode("utf-8")) > 72:
        raise ValueError("La contraseña no puede exceder 72 bytes")
    return bcrypt.hashpw(contrasena.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verificar_contrasena(contrasena: str, password_hash: str) -> bool:
    """Comprueba si la contraseña coincide con el hash guardado."""
    try:
        return bcrypt.checkpw(
            contrasena.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except ValueError:
        return False