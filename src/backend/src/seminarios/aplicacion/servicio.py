# Contiene la lógica necesaria para administrar seminarios.
from datetime import date
from math import isfinite
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from src.compartido.documentos import normalizar_documento
from sqlalchemy.ext.asyncio import AsyncSession

from src.inscripcion.infraestructura.cohortes_modelos import CohorteORM
from src.seminarios.aplicacion.legajos import (
    ESTADOS_HABILITADOS_CURSADA,
    consulta_legajos_academicos,
    obtener_legajo_academico,
)



from src.inscripcion.infraestructura.orm_modelos import(
    LegajoORM,
)

from src.usuarios.modelos import (
    RolORM,
    UsuarioORM,
)
from src.carreras.modelos import (
    CarreraORM,
)
from src.seminarios.infraestructura.orm_modelos import (
    SeminarioORM,
    InscripcionSeminarioORM,
    AsistenciaClaseORM,
)
from src.seminarios.presentacion.esquema import (
    SeminarioCrear,
    SeminarioModificar,
    SeminarioRespuesta,
    AlumnoSeminarioRespuesta,
    CursadaEstudianteRespuesta,
    AsistenciaFechaRespuesta,
    ColegaDocenteRespuesta,
)


async def obtener_carrera(
    carrera_id: UUID,
    db: AsyncSession,
) -> CarreraORM:
    carrera = await db.get(
        CarreraORM,
        carrera_id,
    )

    if carrera is None:
        raise HTTPException(
            status_code=404,
            detail="Carrera no encontrada",
        )

    return carrera


async def obtener_docente(
    docente_id: UUID,
    db: AsyncSession,
) -> UsuarioORM:
    consulta = (
        select(UsuarioORM)
        .where(
            UsuarioORM.id == docente_id
        )
    )

    docente = await db.scalar(
        consulta
    )

    if docente is None:
        raise HTTPException(
            status_code=404,
            detail="Docente no encontrado",
        )

    await db.refresh(
        docente,
        ["rol"],
    )

    if docente.rol.nombre != "DOCENTE":
        raise HTTPException(
            status_code=400,
            detail=(
                "El usuario seleccionado "
                "no tiene rol DOCENTE"
            ),
        )

    return docente


def validar_fechas(
    fecha_inicio,
    fecha_fin,
):
    if fecha_fin < fecha_inicio:
        raise HTTPException(
            status_code=400,
            detail=(
                "La fecha de finalización "
                "no puede ser anterior "
                "a la fecha de inicio"
            ),
        )


async def convertir_respuesta(
    seminario: SeminarioORM,
    db: AsyncSession,
) -> SeminarioRespuesta:
    carrera = await obtener_carrera(
        seminario.carrera_id,
        db,
    )

    docente = await obtener_docente(
        seminario.docente_id,
        db,
    )

    return SeminarioRespuesta(
        id=seminario.id,
        nombre=seminario.nombre,
        carrera_id=seminario.carrera_id,
        carrera_nombre=carrera.nombre,
        docente_id=seminario.docente_id,
        docente_nombre=(
            f"{docente.nombre} "
            f"{docente.apellido}"
        ),
        fecha_inicio=seminario.fecha_inicio,
        fecha_fin=seminario.fecha_fin,
        activo=seminario.activo,
    )


async def listar_seminarios(
    db: AsyncSession,
) -> list[SeminarioRespuesta]:
    consulta = (
        select(SeminarioORM)
        .order_by(
            SeminarioORM.nombre
        )
    )

    resultado = await db.execute(
        consulta
    )

    seminarios = list(
        resultado.scalars().all()
    )

    respuestas: list[
        SeminarioRespuesta
    ] = []

    for seminario in seminarios:
        respuesta = await convertir_respuesta(
            seminario,
            db,
        )

        respuestas.append(
            respuesta
        )

    return respuestas


async def crear_seminario(
    datos: SeminarioCrear,
    db: AsyncSession,
) -> SeminarioRespuesta:
    nombre = datos.nombre.strip()

    if not nombre:
        raise HTTPException(
            status_code=400,
            detail=(
                "El nombre del seminario "
                "es obligatorio"
            ),
        )

    validar_fechas(
        datos.fecha_inicio,
        datos.fecha_fin,
    )

    await obtener_carrera(
        datos.carrera_id,
        db,
    )

    await obtener_docente(
        datos.docente_id,
        db,
    )

    seminario = SeminarioORM(
        nombre=nombre,
        carrera_id=datos.carrera_id,
        docente_id=datos.docente_id,
        fecha_inicio=datos.fecha_inicio,
        fecha_fin=datos.fecha_fin,
        activo=True,
    )

    db.add(seminario)

    await db.commit()
    await db.refresh(seminario)

    return await convertir_respuesta(
        seminario,
        db,
    )


async def modificar_seminario(
    seminario_id: UUID,
    datos: SeminarioModificar,
    db: AsyncSession,
) -> SeminarioRespuesta:
    seminario = await db.scalar(
        select(SeminarioORM).where(SeminarioORM.id == seminario_id)
        .with_for_update().execution_options(populate_existing=True)
    )

    if seminario is None:
        raise HTTPException(
            status_code=404,
            detail="Seminario no encontrado",
        )

    nombre = datos.nombre.strip()

    if not nombre:
        raise HTTPException(
            status_code=400,
            detail=(
                "El nombre del seminario "
                "es obligatorio"
            ),
        )

    validar_fechas(
        datos.fecha_inicio,
        datos.fecha_fin,
    )

    await obtener_carrera(
        datos.carrera_id,
        db,
    )

    await obtener_docente(
        datos.docente_id,
        db,
    )

    if datos.carrera_id != seminario.carrera_id:
        tiene_cursadas = await db.scalar(select(InscripcionSeminarioORM.id).where(
            InscripcionSeminarioORM.seminario_id == seminario_id).limit(1))
        if tiene_cursadas is not None:
            raise HTTPException(409, "No se puede cambiar la carrera de un seminario con alumnos inscriptos.")
    seminario.nombre = nombre
    seminario.carrera_id = (
        datos.carrera_id
    )
    seminario.docente_id = (
        datos.docente_id
    )
    seminario.fecha_inicio = (
        datos.fecha_inicio
    )
    seminario.fecha_fin = (
        datos.fecha_fin
    )

    await db.commit()
    await db.refresh(seminario)

    return await convertir_respuesta(
        seminario,
        db,
    )


async def cambiar_estado_seminario(
    seminario_id: UUID,
    activo: bool,
    db: AsyncSession,
) -> SeminarioRespuesta:
    seminario = await db.get(
        SeminarioORM,
        seminario_id,
    )

    if seminario is None:
        raise HTTPException(
            status_code=404,
            detail="Seminario no encontrado",
        )

    seminario.activo = activo

    await db.commit()
    await db.refresh(seminario)

    return await convertir_respuesta(
        seminario,
        db,
    )

async def listar_seminarios_docente(
    docente_id: UUID,
    db: AsyncSession,
) -> list[SeminarioRespuesta]:
        consulta = (
            select(SeminarioORM)
            .where(
                SeminarioORM.docente_id == docente_id,
                SeminarioORM.activo == True,
            )
            .order_by(
                SeminarioORM.nombre
            )
        )
        resultado = await db.execute(
                consulta
            )
        
        seminarios = list(
                resultado.scalars().all()
        )
        
        respuestas: list[
                SeminarioRespuesta
        ] = []
        
        for seminario in seminarios:
            respuesta = await convertir_respuesta(
                seminario,
                db,
            )
        
            respuestas.append(
                    respuesta
            )
        
        return respuestas

def calcular_porcentaje_asistencia(
    asistencias: int,
    total_clases: int,
) -> float | None:
    if total_clases <= 0:
        return None
    return round((asistencias / total_clases) * 100, 1)


def validar_y_calcular_estado_nota(
    nota: float,
    porcentaje_asistencia: float | None,
) -> tuple[float, str]:
    if not isfinite(nota) or nota < 1 or nota > 10:
        raise HTTPException(
            status_code=400,
            detail="La nota final debe estar entre 1 y 10.",
        )

    # Verificamos que tenga como máximo 1 decimal (ej: 7.5 * 10 == 75)
    if round(nota, 1) != nota:
        raise HTTPException(
            status_code=400,
            detail="La nota final solo permite hasta un decimal (ej: 7.5).",
        )

    # Regla de Negocio BR-003: Aprobado = Asistencia >= 75% AND Nota >= 4
    if nota >= 4 and porcentaje_asistencia is None:
        estado = "CURSANDO"
    elif nota >= 4 and porcentaje_asistencia is not None and porcentaje_asistencia >= 75.0:
        estado = "APROBADO"
    else:
        estado = "DESAPROBADO"

    return round(nota, 1), estado

def construir_alumno_seminario_respuesta(
    inscripcion: InscripcionSeminarioORM,
    legajo: LegajoORM,
) -> AlumnoSeminarioRespuesta:
    porcentaje = calcular_porcentaje_asistencia(
        inscripcion.asistencias,
        inscripcion.total_clases,
    )
    return AlumnoSeminarioRespuesta(
        inscripcion_id=inscripcion.id,
        legajo_id=legajo.id,
        dni_pasaporte=legajo.dni_pasaporte,
        apellido=legajo.apellido,
        nombre=legajo.nombre,
        correo_electronico=legajo.correo_electronico,
        carrera_elegida=legajo.carrera_elegida,
        asistencias=inscripcion.asistencias,
        total_clases=inscripcion.total_clases,
        porcentaje_asistencia=porcentaje,
        nota_final=inscripcion.nota_final,
        estado=inscripcion.estado,
    )


async def verificar_seminario_docente(
    seminario_id: UUID,
    docente_id: UUID,
    db: AsyncSession,
) -> SeminarioORM:
    seminario = await db.get(SeminarioORM, seminario_id)
    if seminario is None:
        raise HTTPException(
            status_code=404,
            detail="Seminario no encontrado",
        )
    if seminario.docente_id != docente_id:
        raise HTTPException(
            status_code=403,
            detail="No tenés permiso para acceder a este seminario (BR-007)",
        )
    return seminario

async def listar_alumnos_seminario(
    seminario_id: UUID,
    docente_id: UUID,
    db: AsyncSession,
) -> list[AlumnoSeminarioRespuesta]:
    await verificar_seminario_docente(seminario_id, docente_id, db)

    consulta = (
        select(InscripcionSeminarioORM, LegajoORM)
        .join(
            LegajoORM,
            InscripcionSeminarioORM.legajo_id == LegajoORM.id,
        )
        .where(InscripcionSeminarioORM.seminario_id == seminario_id)
        .order_by(LegajoORM.apellido, LegajoORM.nombre)
    )

    resultado = await db.execute(consulta)
    filas = resultado.all()

    return [
        construir_alumno_seminario_respuesta(inscripcion, legajo)
        for inscripcion, legajo in filas
    ]

async def inscribir_alumno_seminario(
    seminario_id: UUID,
    legajo_id: UUID | None,
    dni_pasaporte: str | None,
    docente_id: UUID,
    db: AsyncSession,
) -> AlumnoSeminarioRespuesta:
    seminario = await db.scalar(select(SeminarioORM).where(SeminarioORM.id == seminario_id)
        .with_for_update().execution_options(populate_existing=True))
    if seminario is None:
        raise HTTPException(404, "Seminario no encontrado.")
    if seminario.docente_id != docente_id:
        raise HTTPException(403, "No tenés permiso para acceder a este seminario.")

    if not seminario.activo:
        raise HTTPException(
            status_code=409,
            detail="El seminario no está activo.",
        )

    if legajo_id is not None:
        legajo = await db.get(LegajoORM, legajo_id)

        if legajo is None:
            raise HTTPException(
                status_code=404,
                detail="Legajo no encontrado.",
            )

        cohorte = (
            await db.get(CohorteORM, legajo.cohorte_id)
            if legajo.cohorte_id is not None
            else None
        )

        if (
            cohorte is None
            or cohorte.carrera_id != seminario.carrera_id
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "El legajo no corresponde a la carrera "
                    "del seminario."
                ),
            )

        if legajo.estado not in ESTADOS_HABILITADOS_CURSADA:
            raise HTTPException(
                status_code=409,
                detail="El legajo no está habilitado para cursar.",
            )

    elif dni_pasaporte and dni_pasaporte.strip():
        legajo = await obtener_legajo_academico(
            db=db,
            dni=dni_pasaporte,
            carrera_id=seminario.carrera_id,
        )

    else:
        raise HTTPException(
            status_code=422,
            detail="Ingresá un DNI o identificador de legajo.",
        )

    existente = await db.scalar(
        select(InscripcionSeminarioORM).where(
            InscripcionSeminarioORM.seminario_id == seminario_id,
            InscripcionSeminarioORM.legajo_id == legajo.id,
        )
    )
    if existente is not None:
        raise HTTPException(
            status_code=409,
            detail="El estudiante ya está inscripto en este seminario.",
        )

    nueva = InscripcionSeminarioORM(
        seminario_id=seminario_id,
        legajo_id=legajo.id,
        asistencias=0,
        total_clases=0,
        estado="CURSANDO",
    )
    db.add(nueva)
    await db.commit()
    await db.refresh(nueva)

    return construir_alumno_seminario_respuesta(nueva, legajo)


async def desvincular_alumno_seminario(
    seminario_id: UUID,
    legajo_id: UUID,
    docente_id: UUID,
    db: AsyncSession,
) -> None:
    await verificar_seminario_docente(seminario_id, docente_id, db)

    inscripcion = await db.scalar(
        select(InscripcionSeminarioORM).where(
            InscripcionSeminarioORM.seminario_id == seminario_id,
            InscripcionSeminarioORM.legajo_id == legajo_id,
        )
    )
    if inscripcion is None:
        raise HTTPException(
            status_code=404,
            detail="El estudiante no está inscripto en este seminario.",
        )

    if inscripcion.nota_final is not None or inscripcion.total_clases > 0:
        raise HTTPException(
            status_code=400,
            detail="No se puede desvincular a un estudiante que ya tiene asistencia o nota final registrada.",
        )

    await db.delete(inscripcion)
    await db.commit()


async def registrar_calificacion_seminario(
    seminario_id: UUID,
    legajo_id: UUID,
    nota_final: float,
    docente_id: UUID,
    db: AsyncSession,
) -> AlumnoSeminarioRespuesta:
    await verificar_seminario_docente(seminario_id, docente_id, db)

    inscripcion = await db.scalar(
        select(InscripcionSeminarioORM).where(
            InscripcionSeminarioORM.seminario_id == seminario_id,
            InscripcionSeminarioORM.legajo_id == legajo_id,
        )
    )
    if inscripcion is None:
        raise HTTPException(
            status_code=404,
            detail="El estudiante no está inscripto en este seminario",
        )

    legajo = await db.get(LegajoORM, legajo_id)
    porcentaje = (
        inscripcion.asistencias * 100 / inscripcion.total_clases
        if inscripcion.total_clases > 0 else None
    )

    nota_validada, nuevo_estado = validar_y_calcular_estado_nota(
        nota_final,
        porcentaje,
    )

    inscripcion.nota_final = nota_validada
    inscripcion.estado = nuevo_estado

    await db.commit()
    await db.refresh(inscripcion)

    return construir_alumno_seminario_respuesta(inscripcion, legajo)

async def registrar_asistencia_clase(
    seminario_id: UUID,
    fecha_clase: date,
    presentes_legajo_ids: list[UUID],
    docente_id: UUID,
    db: AsyncSession,
) -> list[AlumnoSeminarioRespuesta]:
    await verificar_seminario_docente(seminario_id, docente_id, db)

    if fecha_clase > date.today():
        raise HTTPException(
            status_code=400,
            detail="No se puede registrar asistencia para una fecha futura (BR-002).",
        )

    resultado = await db.execute(
        select(InscripcionSeminarioORM).where(
            InscripcionSeminarioORM.seminario_id == seminario_id
        )
    )
    inscripciones = list(resultado.scalars().all())

    resultado_clases = await db.execute(
        select(AsistenciaClaseORM).where(
            AsistenciaClaseORM.seminario_id == seminario_id,
            AsistenciaClaseORM.fecha == fecha_clase,
        )
    )
    existentes_por_legajo = {
        reg.legajo_id: reg for reg in resultado_clases.scalars().all()
    }

    presentes_set = set(presentes_legajo_ids)

    for inscripcion in inscripciones:
        esta_presente = inscripcion.legajo_id in presentes_set
        registro_previo = existentes_por_legajo.get(inscripcion.legajo_id)

        if registro_previo is None:
            nuevo_registro = AsistenciaClaseORM(
                seminario_id=seminario_id,
                legajo_id=inscripcion.legajo_id,
                fecha=fecha_clase,
                presente=esta_presente,
            )
            db.add(nuevo_registro)
            inscripcion.total_clases += 1
            if esta_presente:
                inscripcion.asistencias += 1
        else:
            if registro_previo.presente != esta_presente:
                if esta_presente:
                    inscripcion.asistencias += 1
                else:
                    inscripcion.asistencias = max(0, inscripcion.asistencias - 1)
                registro_previo.presente = esta_presente

        if inscripcion.nota_final is not None:
            porcentaje = (
                inscripcion.asistencias * 100 / inscripcion.total_clases
                if inscripcion.total_clases > 0 else None
            )
            _, nuevo_estado = validar_y_calcular_estado_nota(
                inscripcion.nota_final,
                porcentaje,
            )
            inscripcion.estado = nuevo_estado

    await db.commit()
    return await listar_alumnos_seminario(seminario_id, docente_id, db)


async def listar_historial_asistencias_docente(
    docente_id: UUID,
    db: AsyncSession,
) -> list[AsistenciaFechaRespuesta]:
    consulta = (
        select(
            AsistenciaClaseORM,
            SeminarioORM,
            LegajoORM,
            InscripcionSeminarioORM,
        )
        .join(
            SeminarioORM,
            AsistenciaClaseORM.seminario_id == SeminarioORM.id,
        )
        .join(
            LegajoORM,
            AsistenciaClaseORM.legajo_id == LegajoORM.id,
        )
        .join(
            InscripcionSeminarioORM,
            (InscripcionSeminarioORM.seminario_id == SeminarioORM.id)
            & (InscripcionSeminarioORM.legajo_id == LegajoORM.id),
        )
        .where(
            SeminarioORM.docente_id == docente_id,
            SeminarioORM.activo == True,
        )
        .order_by(
            AsistenciaClaseORM.fecha.desc(),
            LegajoORM.apellido,
            LegajoORM.nombre,
        )
    )

    resultado = await db.execute(consulta)
    filas = resultado.all()

    respuestas: list[AsistenciaFechaRespuesta] = []
    for asistencia_clase, seminario, legajo, inscripcion in filas:
        porcentaje = calcular_porcentaje_asistencia(
            inscripcion.asistencias,
            inscripcion.total_clases,
        )
        respuestas.append(
            AsistenciaFechaRespuesta(
                id=asistencia_clase.id,
                seminario_id=seminario.id,
                seminario_nombre=seminario.nombre,
                legajo_id=legajo.id,
                dni_pasaporte=legajo.dni_pasaporte,
                alumno=f"{legajo.apellido}, {legajo.nombre}",
                carrera_elegida=legajo.carrera_elegida,
                fecha=asistencia_clase.fecha,
                presente=asistencia_clase.presente,
                porcentaje_asistencia=porcentaje,
            )
        )
    return respuestas

async def listar_cursada_estudiante(
    email: str,
    dni: str,
    db: AsyncSession,
) -> list[CursadaEstudianteRespuesta]:
    legajos_propios = select(LegajoORM.id).where(
        func.lower(LegajoORM.correo_electronico)
        == email.strip().lower(),
        LegajoORM.dni_pasaporte == normalizar_documento(dni),
    )

    consulta = (
        select(InscripcionSeminarioORM, SeminarioORM, CarreraORM)
        .join(
            SeminarioORM,
            InscripcionSeminarioORM.seminario_id == SeminarioORM.id,
        )
        .join(
            CarreraORM,
            SeminarioORM.carrera_id == CarreraORM.id,
        )
        .where(InscripcionSeminarioORM.legajo_id.in_(legajos_propios))
        .order_by(SeminarioORM.fecha_inicio.desc())
    )

    resultado = await db.execute(consulta)
    filas = resultado.all()

    respuestas: list[CursadaEstudianteRespuesta] = []
    for inscripcion, seminario, carrera in filas:
        porcentaje = calcular_porcentaje_asistencia(
            inscripcion.asistencias,
            inscripcion.total_clases,
        )
        respuestas.append(
            CursadaEstudianteRespuesta(
                inscripcion_id=inscripcion.id,
                seminario_id=seminario.id,
                seminario_nombre=seminario.nombre,
                carrera_nombre=carrera.nombre,
                fecha_inicio=seminario.fecha_inicio,
                fecha_fin=seminario.fecha_fin,
                asistencias=inscripcion.asistencias,
                total_clases=inscripcion.total_clases,
                porcentaje_asistencia=porcentaje,
                nota_final=inscripcion.nota_final,
                estado=inscripcion.estado,
            )
        )
    return respuestas

async def listar_colegas_docentes(
    db: AsyncSession,
) -> list[ColegaDocenteRespuesta]:
    consulta_docentes = (
        select(UsuarioORM)
        .join(RolORM, UsuarioORM.rol_id == RolORM.id)
        .where(
            RolORM.nombre == "DOCENTE",
            UsuarioORM.activo == True,
        )
        .order_by(UsuarioORM.apellido, UsuarioORM.nombre)
    )
    resultado_docentes = await db.execute(consulta_docentes)
    docentes = list(resultado_docentes.scalars().all())

    respuestas: list[ColegaDocenteRespuesta] = []
    for doc in docentes:
        resultado_sem = await db.execute(
            select(SeminarioORM.nombre)
            .where(
                SeminarioORM.docente_id == doc.id,
                SeminarioORM.activo == True,
            )
            .order_by(SeminarioORM.nombre)
        )
        nombres_seminarios = list(resultado_sem.scalars().all())
        respuestas.append(
            ColegaDocenteRespuesta(
                id=doc.id,
                nombre=doc.nombre,
                apellido=doc.apellido,
                correo_electronico=doc.correo_electronico,
                seminarios=nombres_seminarios,
            )
        )
    return respuestas

async def anular_calificacion_seminario(
    seminario_id: UUID,
    legajo_id: UUID,
    docente_id: UUID,
    db: AsyncSession,
) -> AlumnoSeminarioRespuesta:
    await verificar_seminario_docente(seminario_id, docente_id, db)

    inscripcion = await db.scalar(
        select(InscripcionSeminarioORM).where(
            InscripcionSeminarioORM.seminario_id == seminario_id,
            InscripcionSeminarioORM.legajo_id == legajo_id,
        )
    )
    if inscripcion is None:
        raise HTTPException(
            status_code=404,
            detail="El estudiante no está inscripto en este seminario.",
        )

    legajo = await db.get(LegajoORM, legajo_id)
    inscripcion.nota_final = None
    inscripcion.estado = "CURSANDO"

    await db.commit()
    await db.refresh(inscripcion)

    return construir_alumno_seminario_respuesta(inscripcion, legajo)

async def listar_seminarios_disponibles_estudiante(
    email: str,
    dni: str,
    db: AsyncSession,
) -> list[SeminarioRespuesta]:
    carreras_habilitadas = consulta_legajos_academicos(
        dni=dni,
        email=email,
    ).with_only_columns(CohorteORM.carrera_id)

    consulta = select(SeminarioORM).where(
        SeminarioORM.activo.is_(True),
        SeminarioORM.carrera_id.in_(carreras_habilitadas),
    )

    resultado = await db.execute(consulta.order_by(SeminarioORM.fecha_inicio))
    seminarios = list(resultado.scalars().all())

    respuestas: list[SeminarioRespuesta] = []
    for sem in seminarios:
        respuestas.append(await convertir_respuesta(sem, db))
    return respuestas


async def autoinscribir_estudiante_seminario(
    seminario_id: UUID,
    email: str,
    dni: str,
    db: AsyncSession,
) -> CursadaEstudianteRespuesta:
    seminario = await db.scalar(select(SeminarioORM).where(SeminarioORM.id == seminario_id)
        .with_for_update().execution_options(populate_existing=True))

    if seminario is None or not seminario.activo:
        raise HTTPException(
            status_code=404,
            detail="El seminario seleccionado no está disponible.",
        )

    legajo = await obtener_legajo_academico(
        db=db,
        dni=dni,
        email=email,
        carrera_id=seminario.carrera_id,
    )

    existente = await db.scalar(
        select(InscripcionSeminarioORM).where(
            InscripcionSeminarioORM.seminario_id == seminario_id,
            InscripcionSeminarioORM.legajo_id == legajo.id,
        )
    )
    if existente is not None:
        raise HTTPException(
            status_code=409,
            detail="Ya estás inscripto en este seminario.",
        )

    nueva = InscripcionSeminarioORM(
        seminario_id=seminario_id,
        legajo_id=legajo.id,
        asistencias=0,
        total_clases=0,
        estado="CURSANDO",
    )
    db.add(nueva)
    await db.commit()
    await db.refresh(nueva)

    carrera = await obtener_carrera(seminario.carrera_id, db)
    return CursadaEstudianteRespuesta(
        inscripcion_id=nueva.id,
        seminario_id=seminario.id,
        seminario_nombre=seminario.nombre,
        carrera_nombre=carrera.nombre,
        fecha_inicio=seminario.fecha_inicio,
        fecha_fin=seminario.fecha_fin,
        asistencias=0,
        total_clases=0,
        porcentaje_asistencia=None,
        nota_final=None,
        estado="CURSANDO",
    )


async def autodesinscribir_estudiante_seminario(
    seminario_id: UUID,
    email: str,
    dni: str,
    db: AsyncSession,
) -> None:
    consulta = (
        select(InscripcionSeminarioORM)
        .join(
            LegajoORM,
            InscripcionSeminarioORM.legajo_id == LegajoORM.id,
        )
        .where(
            InscripcionSeminarioORM.seminario_id == seminario_id,
            func.lower(LegajoORM.correo_electronico)
            == email.strip().lower(),
            LegajoORM.dni_pasaporte == normalizar_documento(dni),
            LegajoORM.estado.in_(ESTADOS_HABILITADOS_CURSADA),
        )
        .with_for_update(of=InscripcionSeminarioORM)
        .limit(2)
    )

    resultado = await db.execute(consulta)
    inscripciones = resultado.scalars().all()

    if len(inscripciones) > 1:
        raise HTTPException(
            status_code=409,
            detail=(
                "Existe más de una inscripción para este seminario. "
                "Se requiere identificar el legajo correspondiente."
            ),
        )

    inscripcion = inscripciones[0] if inscripciones else None

    if inscripcion is None:
        raise HTTPException(
            status_code=404,
            detail="No estás inscripto en este seminario.",
        )

    if inscripcion.nota_final is not None or inscripcion.total_clases > 0:
        raise HTTPException(
            status_code=400,
            detail="No podés desinscribirte de un seminario que ya registra clases o nota final.",
        )

    await db.delete(inscripcion)
    await db.commit()