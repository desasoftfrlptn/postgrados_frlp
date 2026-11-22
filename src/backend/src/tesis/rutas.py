"""Operaciones de CPR y consultas académicas con permisos por rol."""
from datetime import date, datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.carreras.modelos import CarreraORM
from src.compartido.conexion import get_db
from src.compartido.documentos import normalizar_documento
from src.inscripcion.infraestructura.cohortes_modelos import CohorteORM
from src.inscripcion.infraestructura.orm_modelos import LegajoORM
from src.tesis.modelos import TesisORM
from src.alertas.servicio import alertar_rol, alertar_alumno
from src.usuarios.rutas import usuario_actual

router = APIRouter(prefix="/tesis", tags=["Tesis"])
TIPOS = ("Maestria", "Doctorado")
ESTADOS = ("ACTIVO", "EN_RIESGO")


class DatosTesis(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    titulo: str = Field(min_length=5, max_length=300)
    director: str = Field(min_length=2, max_length=200)
    codirector: str | None = Field(default=None, min_length=2, max_length=200)
    fecha_aprobacion: date | None = None
    numero_resolucion: str | None = Field(default=None, min_length=1, max_length=100)

    @model_validator(mode="after")
    def validar_aprobacion(self):
        if bool(self.fecha_aprobacion) != bool(self.numero_resolucion):
            raise ValueError("La fecha de aprobación y la resolución deben registrarse juntas.")
        if self.fecha_aprobacion and self.fecha_aprobacion > datetime.now(ZoneInfo("America/Argentina/Buenos_Aires")).date():
            raise ValueError("La fecha de aprobación no puede ser futura.")
        if self.codirector and self.codirector.casefold() == self.director.casefold():
            raise ValueError("El director y el codirector deben ser diferentes.")
        return self


class CrearTesis(DatosTesis):
    legajo_id: UUID


class ModificarTesis(DatosTesis):
    version: int = Field(ge=1)


class Candidato(BaseModel):
    legajo_id: UUID
    estudiante: str
    carrera: str
    tipo: str
    cohorte: str


class Registro(Candidato, DatosTesis):
    id: UUID
    version: int


def exigir_rol(usuario, *roles):
    if usuario.rol.nombre not in roles or usuario.debe_cambiar_contrasena:
        raise HTTPException(403, "No tiene permisos para esta operación.")


def consulta_legajos():
    return (select(LegajoORM, CohorteORM, CarreraORM).select_from(LegajoORM)
            .join(CohorteORM, LegajoORM.cohorte_id == CohorteORM.id)
            .join(CarreraORM, CohorteORM.carrera_id == CarreraORM.id)
            .where(CarreraORM.tipo.in_(TIPOS)))


def candidato(legajo, cohorte, carrera):
    return Candidato(legajo_id=legajo.id, estudiante=f"{legajo.apellido}, {legajo.nombre}",
                     carrera=carrera.nombre, tipo=carrera.tipo, cohorte=cohorte.nombre)


def registro(legajo, cohorte, carrera, tesis):
    return Registro(**candidato(legajo, cohorte, carrera).model_dump(),
                    id=tesis.id, version=tesis.version, titulo=tesis.titulo,
                    director=tesis.director, codirector=tesis.codirector,
                    fecha_aprobacion=tesis.fecha_aprobacion, numero_resolucion=tesis.numero_resolucion)


@router.get("/candidatos", response_model=list[Candidato])
async def listar_candidatos(usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir_rol(usuario, "CPR")
    consulta = consulta_legajos().where(LegajoORM.estado.in_(ESTADOS),
        ~select(TesisORM.id).where(TesisORM.legajo_id == LegajoORM.id).exists())
    filas = (await db.execute(consulta.order_by(LegajoORM.apellido, LegajoORM.nombre))).all()
    return [candidato(*fila) for fila in filas]


@router.get("/registros", response_model=list[Registro])
async def listar_tesis(usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir_rol(usuario, "CPR", "COORDINADOR", "ALUMNO")
    consulta = consulta_legajos().add_columns(TesisORM).join_from(LegajoORM, TesisORM, TesisORM.legajo_id == LegajoORM.id)
    if usuario.rol.nombre == "ALUMNO":
        consulta = consulta.where(
            func.upper(func.regexp_replace(LegajoORM.dni_pasaporte, r"[.\s]", "", "g")) == normalizar_documento(usuario.dni),
            func.lower(LegajoORM.correo_electronico) == usuario.correo_electronico.lower(),
        )
    filas = (await db.execute(consulta.order_by(LegajoORM.apellido, LegajoORM.nombre, TesisORM.id))).all()
    return [registro(*fila) for fila in filas]


@router.post("/registros", response_model=Registro, status_code=201)
async def crear_tesis(datos: CrearTesis, usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir_rol(usuario, "CPR")
    fila = (await db.execute(consulta_legajos().where(LegajoORM.id == datos.legajo_id,
        LegajoORM.estado.in_(ESTADOS)).with_for_update(of=LegajoORM))).one_or_none()
    if fila is None:
        raise HTTPException(422, "El legajo no corresponde a un estudiante habilitado de maestría o doctorado.")
    tesis = TesisORM(**datos.model_dump(), actualizado_por=usuario.id)
    db.add(tesis)
    try:
        await alertar_alumno(db, fila[0], "Tesis registrada", "Se registró información de tu tesis.", "/dashboard/trabajo-final")
        await alertar_rol(db, "COORDINADOR", "Tesis registrada", "CPR registró una tesis.", "/dashboard/conduccion/trabajos-finales")
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "No se pudo registrar la tesis. Verifique si el legajo ya tiene una tesis.")
    return registro(*fila, tesis)


@router.put("/registros/{tesis_id}", response_model=Registro)
async def modificar_tesis(tesis_id: UUID, datos: ModificarTesis, usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir_rol(usuario, "CPR")
    fila = (await db.execute(consulta_legajos().add_columns(TesisORM)
        .join_from(LegajoORM, TesisORM, TesisORM.legajo_id == LegajoORM.id)
        .where(TesisORM.id == tesis_id).with_for_update(of=TesisORM)
        .execution_options(populate_existing=True))).one_or_none()
    if fila is None:
        raise HTTPException(404, "Tesis no encontrada.")
    tesis = fila[3]
    if tesis.version != datos.version:
        raise HTTPException(409, "La tesis fue modificada. Actualice el listado antes de volver a editar.")
    for campo, valor in datos.model_dump(exclude={"version"}).items():
        setattr(tesis, campo, valor)
    tesis.version += 1
    tesis.actualizado_por = usuario.id
    await alertar_alumno(db, fila[0], "Tesis actualizada", "CPR actualizó tu tesis.", "/dashboard/trabajo-final")
    await alertar_rol(db, "COORDINADOR", "Tesis actualizada", "CPR actualizó una tesis.", "/dashboard/conduccion/trabajos-finales")
    await db.commit()
    return registro(*fila)


@router.get("/estudiantes")
async def consultar_estudiantes_cpr(usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    exigir_rol(usuario, "CPR")
    consulta = (select(LegajoORM, CohorteORM, CarreraORM, TesisORM)
        .join(CohorteORM, CohorteORM.id == LegajoORM.cohorte_id)
        .join(CarreraORM, CarreraORM.id == CohorteORM.carrera_id)
        .outerjoin(TesisORM, TesisORM.legajo_id == LegajoORM.id)
        .where(LegajoORM.estado.in_(ESTADOS))
        .order_by(LegajoORM.apellido, LegajoORM.nombre))
    filas = (await db.execute(consulta)).all()
    return [{**candidato(l, c, carrera).model_dump(), "estado": l.estado,
             "trabajo": "Aprobado" if t and t.fecha_aprobacion else "Registrado" if t else "Sin registro"}
            for l, c, carrera, t in filas]


@router.get("/docentes")
async def consultar_docentes_cpr(usuario=Depends(usuario_actual), db: AsyncSession = Depends(get_db)):
    from src.seminarios.infraestructura.orm_modelos import SeminarioORM
    from src.usuarios.modelos import UsuarioORM, RolORM
    exigir_rol(usuario, "CPR")
    consulta = (select(UsuarioORM.id, UsuarioORM.nombre, UsuarioORM.apellido, CarreraORM.nombre, SeminarioORM.nombre)
        .join(RolORM, UsuarioORM.rol_id == RolORM.id)
        .join(SeminarioORM, SeminarioORM.docente_id == UsuarioORM.id)
        .join(CarreraORM, CarreraORM.id == SeminarioORM.carrera_id)
        .where(RolORM.nombre == "DOCENTE", UsuarioORM.activo.is_(True), SeminarioORM.activo.is_(True))
        .order_by(UsuarioORM.apellido, UsuarioORM.nombre, CarreraORM.nombre, SeminarioORM.nombre))
    filas = (await db.execute(consulta)).all()
    return [{"id": str(id), "docente": f"{apellido}, {nombre}", "carrera": carrera, "seminario": seminario}
            for id, nombre, apellido, carrera, seminario in filas]
