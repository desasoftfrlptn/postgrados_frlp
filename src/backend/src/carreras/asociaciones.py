"""Consulta las relaciones académicas existentes sin duplicar su persistencia."""
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from src.carreras.modelos import CarreraORM
from src.inscripcion.infraestructura.cohortes_modelos import CohorteORM
from src.inscripcion.infraestructura.orm_modelos import LegajoORM
from src.seminarios.infraestructura.orm_modelos import SeminarioORM
from src.usuarios.modelos import UsuarioORM
from src.conduccion.modelos import LegajoPersonalORM
from src.compartido.documentos import normalizar_documento
from src.conduccion.servicio import asignar_legajo_personal, obtener_gestion, ahora_utc, registrar_auditoria
from src.usuarios.cuentas_academicas import documento_sql


async def consultar_asociaciones(carrera_id: UUID, db: AsyncSession):
    if await db.get(CarreraORM, carrera_id) is None:
        raise HTTPException(404, "Carrera no encontrada.")
    alumnos = (await db.execute(
        select(LegajoORM, CohorteORM, LegajoPersonalORM.numero)
        .join(CohorteORM, CohorteORM.id == LegajoORM.cohorte_id)
        .outerjoin(LegajoPersonalORM, LegajoPersonalORM.documento == documento_sql(LegajoORM.dni_pasaporte))
        .where(CohorteORM.carrera_id == carrera_id,
               LegajoORM.estado.in_(("ACTIVO", "EN_RIESGO", "GRADUADO")))
        .order_by(LegajoORM.apellido, LegajoORM.nombre, CohorteORM.anio)
    )).all()
    docentes = (await db.execute(
        select(SeminarioORM, UsuarioORM)
        .join(UsuarioORM, UsuarioORM.id == SeminarioORM.docente_id)
        .where(SeminarioORM.carrera_id == carrera_id)
        .order_by(UsuarioORM.apellido, UsuarioORM.nombre, SeminarioORM.nombre)
    )).all()
    return {
        "alumnos": [{"id": str(l.id), "alumno": f"{l.apellido}, {l.nombre}",
                     "legajo": numero or "Sin asignar", "cohorte": c.nombre, "estado": l.estado,
                     "dni": l.dni_pasaporte, "correo": l.correo_electronico}
                    for l, c, numero in alumnos],
        "docentes": [{"id": str(s.id), "docente": f"{u.apellido}, {u.nombre}",
                      "seminario": s.nombre, "activo": bool(s.activo and u.activo)}
                     for s, u in docentes],
    }


async def candidatos_asociacion(carrera_id, db):
    carrera = await db.get(CarreraORM, carrera_id)
    if carrera is None:
        raise HTTPException(404, "Carrera no encontrada.")
    cohortes = (await db.scalars(select(CohorteORM).where(CohorteORM.carrera_id == carrera_id).order_by(CohorteORM.anio.desc()))).all()
    filas = (await db.execute(select(LegajoORM, LegajoPersonalORM.numero).outerjoin(
        LegajoPersonalORM, LegajoPersonalORM.documento == documento_sql(LegajoORM.dni_pasaporte)
    ).where(LegajoORM.estado.in_(("ACTIVO", "EN_RIESGO", "GRADUADO"))).order_by(LegajoORM.apellido, LegajoORM.nombre, LegajoORM.id))).all()
    asociados = (await db.scalars(select(documento_sql(LegajoORM.dni_pasaporte))
        .join(CohorteORM, CohorteORM.id == LegajoORM.cohorte_id)
        .where(CohorteORM.carrera_id == carrera_id, LegajoORM.estado != "BAJA"))).all()
    documentos_asociados = set(asociados)
    alumnos = {}
    for l, numero in filas:
        if normalizar_documento(l.dni_pasaporte) in documentos_asociados:
            continue
        alumnos.setdefault(normalizar_documento(l.dni_pasaporte), {"id": str(l.id), "nombre": f"{l.apellido}, {l.nombre}", "dni": l.dni_pasaporte, "legajo": numero})
    return {"alumnos": list(alumnos.values()), "cohortes": [{"id": str(c.id), "nombre": c.nombre} for c in cohortes]}


async def asociar_alumno(carrera_id, origen_id, cohorte_id, db, administrador=None):
    carrera = await db.get(CarreraORM, carrera_id)
    cohorte = await db.get(CohorteORM, cohorte_id)
    origen = await db.get(LegajoORM, origen_id)
    if not carrera or not carrera.activo or not cohorte or cohorte.carrera_id != carrera_id:
        raise HTTPException(422, "Seleccioná una cohorte de una carrera activa.")
    if not origen or origen.estado not in ("ACTIVO", "EN_RIESGO", "GRADUADO"):
        raise HTTPException(422, "Seleccioná un alumno con historial académico válido.")
    documento = normalizar_documento(origen.dni_pasaporte)
    await db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:documento))"), {"documento": documento})
    existente = await db.scalar(select(LegajoORM.id).join(CohorteORM, CohorteORM.id == LegajoORM.cohorte_id).where(CohorteORM.carrera_id == carrera_id,
        documento_sql(LegajoORM.dni_pasaporte) == documento, LegajoORM.estado != "BAJA").limit(1))
    if existente:
        raise HTTPException(409, "El alumno ya tiene una inscripción en esta carrera.")
    anio = ahora_utc().year
    correlativo = (await db.execute(text("""INSERT INTO contadores_inscripcion(anio, ultimo_numero)
        VALUES (:anio, 1) ON CONFLICT (anio) DO UPDATE SET ultimo_numero = contadores_inscripcion.ultimo_numero + 1
        RETURNING ultimo_numero"""), {"anio": anio})).scalar_one()
    campos = ("apellido", "nombre", "nacionalidad", "dni_pasaporte", "telefono_movil", "correo_electronico",
              "correo_alternativo", "domicilio", "pais", "provincia", "ciudad", "titulo_anterior", "universidad_anterior")
    nuevo = LegajoORM(**{campo: getattr(origen, campo) for campo in campos}, cohorte_id=cohorte_id,
        carrera_elegida=carrera.nombre, numero_seguimiento=f"INS-{anio}-{correlativo}", estado="ACTIVO",
        forma_conocio_ofertas="Asociación administrativa", motivos_cursar="Asociación administrativa")
    db.add(nuevo)
    await db.flush()
    gestion = await obtener_gestion(db, nuevo.id, crear=True)
    await asignar_legajo_personal(db, nuevo, gestion)
    gestion.fecha_matricula = ahora_utc()
    registrar_auditoria(db, legajo_id=nuevo.id, accion="ASOCIAR_CARRERA", usuario=administrador,
        nuevo={"estado": "ACTIVO", "cohorte_id": str(cohorte_id), "numero_legajo": gestion.numero_legajo})
    await db.commit()
    return {"id": str(nuevo.id)}


async def desasociar_alumno(carrera_id, legajo_id, db, administrador=None):
    legajo = await db.scalar(select(LegajoORM).join(CohorteORM, CohorteORM.id == LegajoORM.cohorte_id)
        .where(LegajoORM.id == legajo_id, CohorteORM.carrera_id == carrera_id).with_for_update(of=LegajoORM))
    if not legajo or legajo.estado not in ("ACTIVO", "EN_RIESGO", "GRADUADO"):
        raise HTTPException(404, "No se encontró una asociación vigente.")
    gestion = await obtener_gestion(db, legajo.id, crear=True)
    await asignar_legajo_personal(db, legajo, gestion)
    anterior = legajo.estado
    legajo.estado = "BAJA"
    gestion.fecha_baja = ahora_utc()
    registrar_auditoria(db, legajo_id=legajo.id, accion="DESASOCIAR_CARRERA", usuario=administrador,
        anterior={"estado": anterior}, nuevo={"estado": "BAJA"})
    await db.commit()
