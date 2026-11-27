"""Recuperación de acceso sin revelar si una cuenta existe."""
import hashlib
import json
import logging
import os
from asyncio import to_thread
from collections import OrderedDict
from time import monotonic
from urllib.parse import urlencode
from urllib.request import urlopen

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from src.compartido.correo import enviar_correo
from src.usuarios.acceso import construir_enlace_activacion, FINALIDAD_RECUPERACION
from src.usuarios.cuentas_academicas import validar_identidad_alumno
from src.usuarios.modelos import UsuarioORM

logger = logging.getLogger(__name__)
intentos = OrderedDict()


def limitar(clave, maximo, ventana):
    ahora = monotonic()
    registros = [t for t in intentos.get(clave, []) if ahora - t < ventana]
    if len(registros) >= maximo:
        return False
    intentos[clave] = registros + [ahora]
    intentos.move_to_end(clave)
    while len(intentos) > 10000:
        intentos.popitem(last=False)
    return True


def verificar_captcha(token):
    secreto = os.getenv("RECAPTCHA_SECRET_KEY", "").strip()
    if not secreto:
        if os.getenv("ENVIRONMENT") == "development":
            return bool(token)  # Solo desarrollo; producción exige verificación remota.
        raise HTTPException(503, "Recuperación temporalmente no disponible.")
    try:
        with urlopen("https://www.google.com/recaptcha/api/siteverify", data=urlencode({"secret": secreto, "response": token}).encode(), timeout=5) as respuesta:
            return bool(json.load(respuesta).get("success"))
    except Exception:
        raise HTTPException(503, "No se pudo verificar el CAPTCHA.")


async def solicitar_recuperacion(db, correo, captcha, ip):
    if not limitar("ip:" + ip, 12, 600):
        raise HTTPException(429, "Demasiadas solicitudes. Intentá más tarde.")
    if not await to_thread(verificar_captcha, captcha):
        raise HTTPException(400, "Completá nuevamente el CAPTCHA.")
    correo = correo.strip().lower()
    if not limitar("correo:" + hashlib.sha256(correo.encode()).hexdigest(), 2, 600):
        return
    usuario = await db.scalar(select(UsuarioORM).options(selectinload(UsuarioORM.rol)).where(func.lower(UsuarioORM.correo_electronico) == correo))
    if not usuario or not usuario.activo or not usuario.rol or usuario.rol.nombre == "ASPIRANTE":
        return
    if usuario.rol.nombre == "ALUMNO":
        try:
            await validar_identidad_alumno(db, usuario.dni, usuario.correo_electronico)
        except HTTPException:
            return
    try:
        enlace = construir_enlace_activacion(usuario, FINALIDAD_RECUPERACION)
        await to_thread(enviar_correo, usuario.correo_electronico,
            "Recuperación de contraseña | Posgrados UTN FRLP",
            f"Hola, {usuario.nombre} {usuario.apellido}:\n\n"
            "Recibimos una solicitud para recuperar el acceso a tu cuenta de Posgrados.\n\n"
            "Establecé tu nueva contraseña desde este enlace:\n"
            f"{enlace}\n\n"
            "El enlace vence en una hora y solo puede utilizarse una vez. Si no solicitaste este cambio, ignorá este mensaje.\n\n"
            "Departamento de Posgrado - UTN FRLP")
    except Exception as error:
        logger.warning("Fallo de correo de recuperación: %s; codigo SMTP: %s", type(error).__name__, getattr(error, "smtp_code", None))
