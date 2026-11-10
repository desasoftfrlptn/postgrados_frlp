"""Utilidades criptográficas sin dependencia de terceros para los enlaces de acceso"""
import hashlib
import secrets


def generar_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
