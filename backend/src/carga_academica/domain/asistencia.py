"""Reglas de asistencia de un seminario (funciones puras, sin base de datos)."""


def calcular_porcentaje_asistencia(presentes: int, total_clases: int) -> float:
    """Porcentaje de clases a las que asistió, con un decimal. Sin clases da 0."""
    if total_clases == 0:
        return 0.0
    return round(presentes / total_clases * 100, 1)


def marca_asistencia(presente: bool | None) -> str:
    """P si estuvo, A si faltó o si no hay registro de esa clase."""
    return "P" if presente else "A"

# Roles que pueden ver la planilla de cualquier seminario
ROLES_VEN_TODO = ("coordinador", "admin")


def puede_ver_planilla(rol: str, email_usuario: str, email_docente: str) -> bool:
    """Quién puede ver la planilla de un seminario (BR-007).

    - coordinador y admin: cualquier seminario.
    - docente: solo el suyo (su email es el email_docente del seminario).
    - el resto de los roles: ninguno.
    """
    if rol in ROLES_VEN_TODO:
        return True
    if rol == "docente":
        # lower() para que no falle por mayúsculas: Juan@utn.edu.ar == juan@utn.edu.ar
        return email_usuario.lower() == email_docente.lower()
    return False