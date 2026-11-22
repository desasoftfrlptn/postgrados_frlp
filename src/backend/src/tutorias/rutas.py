"""Tutorías asociadas al legajo, con acceso limitado por rol y asignación."""
from datetime import date, datetime
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.compartido.conexion import get_db
from src.compartido.documentos import normalizar_documento
from src.inscripcion.infraestructura.orm_modelos import LegajoORM
from src.inscripcion.infraestructura.cohortes_modelos import CohorteORM
from src.carreras.modelos import CarreraORM
from src.usuarios.modelos import UsuarioORM, RolORM
from src.usuarios.rutas import usuario_actual
from src.tutorias.modelos import TutoriaORM, EncuentroORM

router = APIRouter(prefix="/api/v1/tutorias", tags=["Tutorías"])
ESTADOS = ("ACTIVO", "EN_RIESGO")


class Asignacion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    legajo_id: UUID
    tutor_id: UUID


class Encuentro(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    fecha: date
    estado: Literal["PENDIENTE", "REALIZADA", "CANCELADA"]
    observaciones: str = Field(min_length=1, max_length=3000)

    @model_validator(mode="after")
    def validar_fecha(self):
        if self.estado == "REALIZADA" and self.fecha > datetime.now(ZoneInfo("America/Argentina/Buenos_Aires")).date():
            raise ValueError("Un encuentro realizado no puede tener fecha futura.")
        return self


def exigir(usuario, *roles):
    if usuario.rol.nombre not in roles or usuario.debe_cambiar_contrasena:
        raise HTTPException(403, "No tiene permisos para esta operación.")


def legajos():
    return (select(LegajoORM, CohorteORM, CarreraORM).select_from(LegajoORM)
            .join(CohorteORM, LegajoORM.cohorte_id == CohorteORM.id)
            .join(CarreraORM, CohorteORM.carrera_id == CarreraORM.id))


def resumen(l, c, carrera):
    return {"legajo_id": str(l.id), "estudiante": f"{l.apellido}, {l.nombre}",
            "cohorte": c.nombre, "carrera": carrera.nombre, "estado_legajo": l.estado}


@router.get("/candidatos")
async def candidatos(usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir(usuario, "ADMIN")
    filas = (await db.execute(legajos().where(LegajoORM.estado.in_(ESTADOS),
        ~select(TutoriaORM.id).where(TutoriaORM.legajo_id == LegajoORM.id).exists())
        .order_by(LegajoORM.apellido, LegajoORM.nombre))).all()
    docentes = (await db.scalars(select(UsuarioORM).join(RolORM, UsuarioORM.rol_id == RolORM.id)
        .where(RolORM.nombre == "DOCENTE", UsuarioORM.activo.is_(True))
        .order_by(UsuarioORM.apellido, UsuarioORM.nombre))).all()
    return {"legajos": [resumen(*fila) for fila in filas],
            "docentes": [{"id": str(d.id), "nombre": f"{d.apellido}, {d.nombre}"} for d in docentes]}


@router.get("")
async def listar(usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir(usuario, "ADMIN", "COORDINADOR", "DOCENTE", "ALUMNO")
    consulta = legajos().add_columns(TutoriaORM, UsuarioORM).join_from(LegajoORM, TutoriaORM, TutoriaORM.legajo_id == LegajoORM.id).join_from(TutoriaORM, UsuarioORM, UsuarioORM.id == TutoriaORM.tutor_id)
    if usuario.rol.nombre == "DOCENTE":
        consulta = consulta.where(TutoriaORM.tutor_id == usuario.id)
    if usuario.rol.nombre == "ALUMNO":
        consulta = consulta.where(func.upper(func.regexp_replace(LegajoORM.dni_pasaporte, r"[.\s]", "", "g")) == normalizar_documento(usuario.dni),
                                  func.lower(LegajoORM.correo_electronico) == usuario.correo_electronico.strip().lower())
    filas = (await db.execute(consulta.order_by(LegajoORM.apellido, LegajoORM.nombre))).all()
    ids = [t.id for _, _, _, t, _ in filas]
    encuentros = {}
    if ids:
        registros = (await db.scalars(select(EncuentroORM).where(EncuentroORM.tutoria_id.in_(ids)).order_by(EncuentroORM.fecha.desc(), EncuentroORM.id))).all()
        for e in registros:
            encuentros.setdefault(e.tutoria_id, []).append({"id": str(e.id), "fecha": e.fecha, "estado": e.estado, "observaciones": e.observaciones, "version": e.version})
    return [{**resumen(l, c, carrera), "id": str(t.id), "tutor": f"{u.apellido}, {u.nombre}", "activa": t.activa,
             "editable": t.activa and l.estado in ESTADOS and u.activo,
             "encuentros": encuentros.get(t.id, [])} for l, c, carrera, t, u in filas]


@router.post("", status_code=201)
async def asignar(datos: Asignacion, usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir(usuario, "ADMIN")
    legajo = await db.scalar(select(LegajoORM).where(LegajoORM.id == datos.legajo_id).with_for_update())
    if not legajo or legajo.estado not in ESTADOS:
        raise HTTPException(422, "Seleccioná un legajo matriculado y habilitado.")
    tutor = await db.scalar(select(UsuarioORM).join(RolORM, UsuarioORM.rol_id == RolORM.id)
        .where(UsuarioORM.id == datos.tutor_id, UsuarioORM.activo.is_(True), RolORM.nombre == "DOCENTE"))
    if not tutor:
        raise HTTPException(422, "Seleccioná un docente activo.")
    tutoria = TutoriaORM(**datos.model_dump())
    db.add(tutoria)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "El legajo ya tiene una tutoría asignada.")
    return {"id": str(tutoria.id)}


@router.post("/{tutoria_id}/encuentros", status_code=201)
async def registrar(tutoria_id: UUID, datos: Encuentro, usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir(usuario, "DOCENTE")
    tutoria = await db.scalar(select(TutoriaORM).where(TutoriaORM.id == tutoria_id, TutoriaORM.tutor_id == usuario.id).with_for_update())
    if not tutoria:
        raise HTTPException(404, "Tutoría no encontrada.")
    legajo = await db.scalar(select(LegajoORM).where(LegajoORM.id == tutoria.legajo_id).with_for_update())
    if not tutoria.activa or not legajo or legajo.estado not in ESTADOS:
        raise HTTPException(409, "La tutoría ya no admite encuentros.")
    encuentro = EncuentroORM(tutoria_id=tutoria.id, autor_id=usuario.id, **datos.model_dump())
    db.add(encuentro)
    await db.commit()
    return {"id": str(encuentro.id)}


class ModificarEncuentro(Encuentro):
    version: int = Field(ge=1)


@router.put("/{tutoria_id}/encuentros/{encuentro_id}")
async def modificar(tutoria_id: UUID, encuentro_id: UUID, datos: ModificarEncuentro,
                    usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir(usuario, "DOCENTE")
    tutoria = await db.scalar(select(TutoriaORM).where(TutoriaORM.id == tutoria_id,
        TutoriaORM.tutor_id == usuario.id).with_for_update())
    if not tutoria:
        raise HTTPException(404, "Tutoría no encontrada.")
    legajo = await db.scalar(select(LegajoORM).where(LegajoORM.id == tutoria.legajo_id).with_for_update())
    if not tutoria.activa or not legajo or legajo.estado not in ESTADOS:
        raise HTTPException(409, "La tutoría ya no admite cambios.")
    encuentro = await db.scalar(select(EncuentroORM).where(EncuentroORM.id == encuentro_id,
        EncuentroORM.tutoria_id == tutoria.id).with_for_update().execution_options(populate_existing=True))
    if not encuentro:
        raise HTTPException(404, "Encuentro no encontrado.")
    if encuentro.version != datos.version or encuentro.estado != "PENDIENTE":
        raise HTTPException(409, "El encuentro cambió o ya fue finalizado. Volvé al listado y actualizá los datos.")
    for campo, valor in datos.model_dump(exclude={"version"}).items():
        setattr(encuentro, campo, valor)
    encuentro.version += 1
    await db.commit()
    return {"id": str(encuentro.id)}
