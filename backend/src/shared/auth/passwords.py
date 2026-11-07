##En el login, contrasena va a ser lo que ingrese el usuario y password_hash 
## va a salir de Usuario.password_hash. Si bcrypt rechaza la entrada, por ejemplo
## porque el hash guardado tiene un formato inválido, la función devuelve False

import bcrypt



def verificar_contrasena(contrasena: str, password_hash: str) -> bool:
    """Comprueba si la contraseña coincide con el hash guardado."""
    try:
        return bcrypt.checkpw(
            contrasena.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except ValueError:
        return False