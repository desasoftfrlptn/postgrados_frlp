# Contiene la lógica necesaria para administrar seminarios.
from datetime import date
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession


from src.inscripcion.infraestructura.orm_modelos import(
    LegajoORM,
)

from src.usuarios.modelos import (
    UsuarioORM,
)
from src.carreras.modelos import (
    CarreraORM,
)
from src.seminarios.infraestructura.orm_modelos import (
    SeminarioORM,
    InscripcionSeminarioORM,
)
from src.seminarios.presentacion.esquema import (
    SeminarioCrear,
    SeminarioModificar,
    SeminarioRespuesta,
    AlumnoSeminarioRespuesta,
    CursadaEstudianteRespuesta,
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
    seminario = await db.get(
        SeminarioORM,
        seminario_id,
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
) -> float:
    if total_clases <= 0:
        return 100.0
    return round((asistencias / total_clases) * 100, 1)


def validar_y_calcular_estado_nota(
    nota: float,
    porcentaje_asistencia: float,
) -> tuple[float, str]:
    if nota < 1 or nota > 10:
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
    if nota >= 4 and porcentaje_asistencia >= 75.0:
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
    db: AsyncSession,
) -> AlumnoSeminarioRespuesta:
    seminario = await db.get(SeminarioORM, seminario_id)
    if seminario is None:
        raise HTTPException(status_code=404, detail="Seminario no encontrado")

    legajo = None
    if legajo_id is not None:
        legajo = await db.get(LegajoORM, legajo_id)
    elif dni_pasaporte and dni_pasaporte.strip():
        legajo = await db.scalar(
            select(LegajoORM).where(
                LegajoORM.dni_pasaporte == dni_pasaporte.strip()
            )
        )

    if legajo is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró un estudiante con ese DNI o legajo",
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
            detail="El estudiante ya está inscripto en este seminario",
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
    porcentaje = calcular_porcentaje_asistencia(
        inscripcion.asistencias,
        inscripcion.total_clases,
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

    presentes_set = set(presentes_legajo_ids)

    for inscripcion in inscripciones:
        inscripcion.total_clases += 1
        if inscripcion.legajo_id in presentes_set:
            inscripcion.asistencias += 1

        if inscripcion.nota_final is not None:
            porcentaje = calcular_porcentaje_asistencia(
                inscripcion.asistencias,
                inscripcion.total_clases,
            )
            _, nuevo_estado = validar_y_calcular_estado_nota(
                inscripcion.nota_final,
                porcentaje,
            )
            inscripcion.estado = nuevo_estado

    await db.commit()
    return await listar_alumnos_seminario(seminario_id, docente_id, db)

async def listar_cursada_estudiante(
    email: str,
    dni: str,
    db: AsyncSession,
) -> list[CursadaEstudianteRespuesta]:
    condiciones = [LegajoORM.correo_electronico == email]
    if dni:
        condiciones.append(LegajoORM.dni_pasaporte == dni)

    legajo = await db.scalar(select(LegajoORM).where(or_(*condiciones)))
    if legajo is None:
        return []

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
        .where(InscripcionSeminarioORM.legajo_id == legajo.id)
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