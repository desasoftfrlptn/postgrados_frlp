"""Perfil del usuario autenticado. El legajo conserva los datos de admisión."""
from fastapi import HTTPException
from sqlalchemy import select, func
from src.usuarios.modelos import UsuarioORM, PerfilUsuarioORM
from src.usuarios.perfil_validaciones import DatosPerfil, ModificacionPerfil
from src.usuarios.cuentas_academicas import documento_sql, ESTADOS_MATRICULADOS
from src.compartido.documentos import normalizar_documento
from src.inscripcion.infraestructura.orm_modelos import LegajoORM
from src.inscripcion.infraestructura.cohortes_modelos import CohorteORM


def exigir_perfil(usuario):
    if usuario.rol.nombre not in {"ADMIN", "ALUMNO", "DOCENTE", "COORDINADOR", "CPR"} or usuario.debe_cambiar_contrasena:
        raise HTTPException(403, "La cuenta no está habilitada para consultar el perfil.")


async def consultar_perfil(db, usuario):
    exigir_perfil(usuario)
    perfil = await db.get(PerfilUsuarioORM, usuario.id)
    filas = []
    if usuario.rol.nombre == "ALUMNO":
        filas = (await db.execute(select(LegajoORM, CohorteORM.nombre).outerjoin(CohorteORM, CohorteORM.id == LegajoORM.cohorte_id).where(
            documento_sql(LegajoORM.dni_pasaporte) == normalizar_documento(usuario.dni),
            func.lower(LegajoORM.correo_electronico) == usuario.correo_electronico.strip().lower(),
            LegajoORM.estado.in_(ESTADOS_MATRICULADOS),
        ).order_by(LegajoORM.numero_seguimiento))).all()
    datos = DatosPerfil().model_dump()
    # Solo heredar valores coincidentes entre todas las inscripciones activas.
    for campo in datos:
        if campo == "notificaciones_automaticas" or not filas:
            continue
        valores = {getattr(legajo, campo) or "" for legajo, _ in filas}
        if len(valores) == 1:
            datos[campo] = valores.pop() or (None if campo == "correo_alternativo" else "")
    if perfil:
        datos.update(perfil.datos)
    return {"datos": datos, "foto": perfil.foto if perfil else None,
            "version": perfil.version if perfil else 0,
            "carreras": [{"id": str(l.id), "carrera": l.carrera_elegida, "cohorte": c or "Sin cohorte registrada"} for l, c in filas]}


async def modificar_perfil(db, usuario, cambio: ModificacionPerfil):
    exigir_perfil(usuario)
    # Bloquear la cuenta incluso cuando el perfil todavía no existe.
    await db.scalar(select(UsuarioORM.id).where(UsuarioORM.id == usuario.id).with_for_update())
    perfil = await db.get(PerfilUsuarioORM, usuario.id, populate_existing=True)
    if cambio.version != (perfil.version if perfil else 0):
        raise HTTPException(409, "El perfil cambió en otra sesión. Volvé a cargarlo antes de guardar.")
    if (cambio.datos is None or not cambio.datos.model_fields_set) and "foto" not in cambio.model_fields_set:
        raise HTTPException(400, "No hay cambios para guardar.")
    if cambio.datos and "correo_alternativo" in cambio.datos.model_fields_set and cambio.datos.correo_alternativo and cambio.datos.correo_alternativo.lower() == usuario.correo_electronico.lower():
        raise HTTPException(422, "El correo alternativo debe ser diferente al correo de acceso.")
    if perfil is None:
        perfil = PerfilUsuarioORM(usuario_id=usuario.id, datos={}, version=0)
        db.add(perfil)
    if cambio.datos is not None:
        perfil.datos = {**perfil.datos, **cambio.datos.model_dump(mode="json", exclude_unset=True)}
    if "foto" in cambio.model_fields_set:
        perfil.foto = cambio.foto
    perfil.version += 1
    await db.commit()
    return await consultar_perfil(db, usuario)
