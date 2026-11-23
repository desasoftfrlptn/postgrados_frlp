import re


def normalizar_documento(valor: str) -> str:
    """Normaliza un DNI o pasaporte para su almacenamiento y consulta."""
    return re.sub(r"[.\s]", "", valor).upper()
