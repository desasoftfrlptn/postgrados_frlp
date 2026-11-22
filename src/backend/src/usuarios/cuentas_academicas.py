"""Alta de cuentas académicas y entrega segura de acceso."""
from asyncio import to_thread
import logging

logger = logging.getLogger(__name__)
from secrets import token_urlsafe
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from src.compartido.documentos import normalizar_documento
from src.compartido.correo import enviar_correo
from src.inscripcion.infraestructura.orm_modelos import LegajoORM
from src.usuarios.modelos import UsuarioORM
from src.usuarios.acceso import construir_enlace_activacion, FINALIDAD, FINALIDAD_RECUPERACION

ESTADOS_MATRICULADOS = ("ACTIVO", "EN_RIESGO")


def documento_sql(columna):
    return func.upper(func.regexp_replace(columna, r"[.\s]", "", "g"))


async def obtener_legajo_matriculado(db, legajo_id: UUID):
    legajo = await db.scalar(select(LegajoORM).where(
        LegajoORM.id == legajo_id, LegajoORM.estado.in_(ESTADOS_MATRICULADOS)
    ).with_for_update())
    if legajo is None:
        raise HTTPException(422, "Seleccioná un legajo matriculado válido.")
    return legajo


async def candidatos_cuenta(db):
    ocupados = select(UsuarioORM.id).where(or_(
        documento_sql(UsuarioORM.dni) == documento_sql(LegajoORM.dni_pasaporte),
        func.lower(UsuarioORM.correo_electronico) == func.lower(LegajoORM.correo_electronico),
    )).exists()
    filas = await db.scalars(select(LegajoORM).where(
        LegajoORM.estado.in_(ESTADOS_MATRICULADOS), ~ocupados
    ).order_by(LegajoORM.apellido, LegajoORM.nombre))
    return [{"id": l.id, "nombre": l.nombre, "apellido": l.apellido,
             "dni": l.dni_pasaporte, "correo_electronico": l.correo_electronico,
             "carrera": l.carrera_elegida, "numero_seguimiento": l.numero_seguimiento}
            for l in filas]


async def validar_identidad_alumno(db, dni, correo):
    legajo = await db.scalar(select(LegajoORM.id).where(
        LegajoORM.estado.in_(ESTADOS_MATRICULADOS),
        documento_sql(LegajoORM.dni_pasaporte) == normalizar_documento(dni),
        func.lower(LegajoORM.correo_electronico) == correo.strip().lower(),
    ).limit(1))
    if legajo is None:
        raise HTTPException(422, "Los datos no corresponden a un alumno matriculado.")


def nueva_clave_interna():
    return token_urlsafe(48)


async def enviar_acceso(usuario):
    """No persistir ni devolver el enlace/token o una contraseña en la API."""
    try:
        finalidad = FINALIDAD if usuario.debe_cambiar_contrasena else FINALIDAD_RECUPERACION
        enlace = construir_enlace_activacion(usuario, finalidad)
        activacion = finalidad == FINALIDAD
        await to_thread(enviar_correo, usuario.correo_electronico,
            ("Activación de cuenta" if activacion else "Recuperación de contraseña") + " | Posgrados UTN FRLP",
            f"Hola, {usuario.nombre} {usuario.apellido}:\n\n" +
            ("Tu cuenta de acceso al sistema de Posgrados ha sido habilitada.\n" if activacion else "Se solicitó recuperar el acceso a tu cuenta de Posgrados.\n") +
            f"Usuario: {usuario.correo_electronico}\n\n"
            "Para establecer tu contraseña personal, ingresá al siguiente enlace:\n"
            f"{enlace}\n\n"
            f"El enlace vence en {24 if activacion else 1} hora(s) y deja de ser válido después de utilizarlo. "
            "Si no esperabas este correo, comunicate con Posgrados.\n\n"
            "Departamento de Posgrado - UTN Facultad Regional La Plata")
        return True
    except Exception as error:
        logger.warning("Fallo de correo de acceso: %s; codigo SMTP: %s", type(error).__name__, getattr(error, "smtp_code", None))
        # La cuenta ya existe; el administrador puede reenviar el acceso.
        return False


async def consultar_destino_cuenta(db, legajo_id: UUID):
    legajo = await db.get(LegajoORM, legajo_id)
    if legajo is None:
        raise HTTPException(404, "Legajo no encontrado.")
    usuarios = (await db.scalars(select(UsuarioORM).where(or_(
        documento_sql(UsuarioORM.dni) == normalizar_documento(legajo.dni_pasaporte),
        func.lower(UsuarioORM.correo_electronico) == legajo.correo_electronico.strip().lower(),
    )))).all()
    coincidencia = next((u for u in usuarios if normalizar_documento(u.dni) == normalizar_documento(legajo.dni_pasaporte)
        and u.correo_electronico.lower() == legajo.correo_electronico.lower()), None)
    return {"id": legajo.id, "nombre": legajo.nombre, "apellido": legajo.apellido,
        "dni": legajo.dni_pasaporte, "correo_electronico": legajo.correo_electronico,
        "carrera": legajo.carrera_elegida, "numero_seguimiento": legajo.numero_seguimiento,
        "estado": legajo.estado, "usuario_id": coincidencia.id if coincidencia else None,
        "conflicto": bool(usuarios) and (coincidencia is None or len(usuarios) != 1),
        "habilitado": legajo.estado in ESTADOS_MATRICULADOS and not usuarios}
