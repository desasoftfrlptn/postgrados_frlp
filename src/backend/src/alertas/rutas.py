from uuid import UUID
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.alertas.modelos import AlertaORM
from src.compartido.conexion import get_db
from src.usuarios.rutas import usuario_actual

router = APIRouter(prefix="/alertas", tags=["Alertas"])


def verificar(usuario):
    if usuario.debe_cambiar_contrasena or usuario.rol.nombre not in {"ADMIN", "ALUMNO", "COORDINADOR", "CPR", "DOCENTE"}:
        raise HTTPException(403, "No tiene acceso a las alertas.")


@router.get("")
async def listar(usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    verificar(usuario)
    filtro = AlertaORM.usuario_id == usuario.id
    registros = (await db.scalars(select(AlertaORM).where(filtro).order_by(
        AlertaORM.fecha.desc(), AlertaORM.id.desc()).limit(100))).all()
    cantidad = await db.scalar(select(func.count()).select_from(AlertaORM).where(filtro, AlertaORM.leida_en.is_(None)))
    rutas = {}
    if usuario.rol.nombre == "ADMIN":
        from src.inscripcion.infraestructura.orm_modelos import LegajoORM
        seguimientos = {}
        for a in registros:
            if a.ruta.rstrip("/") == "/dashboard/administrador/usuarios" and a.titulo in ("Inscripción aprobada", "Acceso académico pendiente"):
                coincidencia = re.search(r"\bINS-\d{4}-\d+\b", a.mensaje)
                if coincidencia:
                    seguimientos[a.id] = coincidencia.group()
        if seguimientos:
            filas = await db.execute(select(LegajoORM.numero_seguimiento, LegajoORM.id).where(LegajoORM.numero_seguimiento.in_(seguimientos.values())))
            destinos = dict(filas.all())
            rutas = {id_: f"/dashboard/administrador/usuarios/legajo/{destinos[numero]}" for id_, numero in seguimientos.items() if numero in destinos}
    return {"sin_leer": cantidad, "alertas": [{"id": a.id, "titulo": a.titulo, "mensaje": a.mensaje,
        "ruta": rutas.get(a.id, a.ruta), "fecha": a.fecha, "leida": a.leida_en is not None} for a in registros]}


@router.patch("/leidas")
async def marcar_todas(usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    verificar(usuario)
    await db.execute(update(AlertaORM).where(AlertaORM.usuario_id == usuario.id,
        AlertaORM.leida_en.is_(None)).values(leida_en=func.now()))
    await db.commit()
    return {"ok": True}


@router.patch("/{alerta_id}/leida")
async def marcar( alerta_id: UUID, usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    verificar(usuario)
    alerta = await db.scalar(select(AlertaORM).where(AlertaORM.id == alerta_id,
        AlertaORM.usuario_id == usuario.id).with_for_update())
    if alerta is None:
        raise HTTPException(404, "Notificación no encontrada.")
    if alerta.leida_en is None:
        alerta.leida_en = func.now()
    await db.commit()
    return {"ok": True}
