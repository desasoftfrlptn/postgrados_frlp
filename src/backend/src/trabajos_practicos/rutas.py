"""ABML de trabajos prácticos para CPR; conserva las bajas en el historial."""
from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.compartido.conexion import get_db
from src.inscripcion.infraestructura.orm_modelos import LegajoORM
from src.trabajos_practicos.modelos import TrabajoPracticoORM
from src.usuarios.rutas import usuario_actual

router = APIRouter(prefix="/trabajos-practicos", tags=["Trabajos prácticos"])
ESTADOS = ("ACTIVO", "EN_RIESGO")


def exigir_cpr(usuario):
    if not usuario.activo or not usuario.rol or usuario.rol.nombre != "CPR" or usuario.debe_cambiar_contrasena:
        raise HTTPException(403, "No tiene permisos para gestionar trabajos prácticos.")


class DatosTrabajo(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    titulo: str = Field(min_length=1, max_length=300)
    descripcion: str = Field(min_length=1, max_length=3000)
    fecha: date


class AltaTrabajo(DatosTrabajo):
    legajo_id: UUID


class ModificarTrabajo(DatosTrabajo):
    version: int = Field(ge=1)


class EstadoTrabajo(BaseModel):
    model_config = ConfigDict(extra="forbid")
    activo: bool
    version: int = Field(ge=1)


def resumen(t, l):
    return {"id": str(t.id), "legajo_id": str(t.legajo_id), "estudiante": f"{l.apellido}, {l.nombre}",
        "carrera": l.carrera_elegida, "titulo": t.titulo, "descripcion": t.descripcion,
        "fecha": t.fecha, "activo": t.activo, "version": t.version, "estado_legajo": l.estado}


@router.get("")
async def listar(usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir_cpr(usuario)
    filas = (await db.execute(select(TrabajoPracticoORM, LegajoORM)
        .join(LegajoORM, LegajoORM.id == TrabajoPracticoORM.legajo_id)
        .order_by(TrabajoPracticoORM.fecha.desc(), LegajoORM.apellido))).all()
    return [resumen(t, l) for t, l in filas]


@router.post("", status_code=201)
async def crear(datos: AltaTrabajo, usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir_cpr(usuario)
    legajo = await db.scalar(select(LegajoORM).where(LegajoORM.id == datos.legajo_id).with_for_update())
    if not legajo or legajo.estado not in ESTADOS:
        raise HTTPException(422, "Seleccioná un estudiante matriculado y habilitado.")
    trabajo = TrabajoPracticoORM(**datos.model_dump())
    db.add(trabajo)
    await db.flush()
    respuesta = resumen(trabajo, legajo)
    await db.commit()
    return respuesta


async def obtener_editable(db, trabajo_id, version):
    trabajo = await db.scalar(select(TrabajoPracticoORM).where(TrabajoPracticoORM.id == trabajo_id).with_for_update())
    if not trabajo:
        raise HTTPException(404, "Trabajo práctico no encontrado.")
    if trabajo.version != version:
        raise HTTPException(409, "El registro cambió. Actualizá el listado.")
    legajo = await db.scalar(select(LegajoORM).where(LegajoORM.id == trabajo.legajo_id).with_for_update())
    if not legajo or legajo.estado not in ESTADOS:
        raise HTTPException(409, "El estudiante ya no está habilitado para modificaciones.")
    return trabajo, legajo


@router.put("/{trabajo_id}")
async def modificar(trabajo_id: UUID, datos: ModificarTrabajo, usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir_cpr(usuario)
    trabajo, legajo = await obtener_editable(db, trabajo_id, datos.version)
    if not trabajo.activo:
        raise HTTPException(409, "Reactivá el trabajo antes de modificarlo.")
    for campo, valor in datos.model_dump(exclude={"version"}).items():
        setattr(trabajo, campo, valor)
    trabajo.version += 1
    respuesta = resumen(trabajo, legajo)
    await db.commit()
    return respuesta


@router.patch("/{trabajo_id}/estado")
async def cambiar_estado(trabajo_id: UUID, datos: EstadoTrabajo, usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir_cpr(usuario)
    trabajo, legajo = await obtener_editable(db, trabajo_id, datos.version)
    trabajo.activo = datos.activo
    trabajo.version += 1
    respuesta = resumen(trabajo, legajo)
    await db.commit()
    return respuesta
