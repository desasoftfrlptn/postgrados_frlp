import os
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.alertas.servicio import alertar_rol, alertar_alumno
from src.conduccion.notificaciones import generar_correo_observacion, generar_correo_estado
from src.conduccion.esquemas import (
    AccionLegajoPeticion,
    VerificacionLegajoPeticion,
)
from src.conduccion.modelos import (
    AuditoriaConduccionORM,
    GestionLegajoORM,
    NotificacionConduccionORM,
    NumeracionCohorteORM,
    LegajoPersonalORM,
)
from src.conduccion.reglas import (
    AccionLegajo,
    PermisoDenegadoError,
    ReglaNegocioError,
    exigir_coordinador,
    reserva_esta_vencida,
    validar_cambio_estado,
)
from src.inscripcion.aplicacion.completitud_documental import (
    calcular_completitud_documental,
)
from src.inscripcion.infraestructura.cohortes_modelos import CohorteORM
from src.inscripcion.infraestructura.documentos_modelos import (
    DocumentoLegajoORM,
)
from src.inscripcion.infraestructura.orm_modelos import LegajoORM
from src.usuarios.modelos import RolORM, UsuarioORM

def ahora_utc():
    return datetime.now(timezone.utc)

def comprobar_coordinador(usuario):
    try:
        exigir_coordinador(
            rol=usuario.rol.nombre if usuario.rol else "",
            activo=usuario.activo,
        )
    except PermisoDenegadoError as exc:
        raise HTTPException(
            status_code=403,
            detail=str(exc),
        ) from exc

async def obtener_legajo(
    db: AsyncSession,
    legajo_id: UUID,
    bloquear: bool = False,
):
    consulta = select(LegajoORM).where(
        LegajoORM.id == legajo_id
    )

    if bloquear:
        consulta = (
            consulta
            .with_for_update()
            .execution_options(populate_existing=True)
        )

    legajo = await db.scalar(consulta)

    if legajo is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró el legajo.",
        )

    return legajo

async def obtener_gestion(
    db: AsyncSession,
    legajo_id: UUID,
    crear: bool = False,
):
    gestion = await db.get(GestionLegajoORM, legajo_id)

    if gestion is None and crear:
        gestion = GestionLegajoORM(
            legajo_id=legajo_id,
            datos_verificados=False,
            tiene_titulo_posgrado=None,
        )

        db.add(gestion)
        await db.flush()

    return gestion


def registrar_auditoria(
    db,
    *,
    legajo_id,
    accion,
    usuario=None,
    anterior=None,
    nuevo=None,
    comentario=None,
):
    evento = AuditoriaConduccionORM(
        actor_id=usuario.id if usuario else None,
        actor_rol=(
            usuario.rol.nombre
            if usuario and usuario.rol
            else "SISTEMA"
        ),
        recurso_tipo="LEGAJO",
        recurso_id=legajo_id,
        accion=accion,
        resultado="EXITOSO",
        anterior=anterior,
        nuevo=nuevo,
        comentario=comentario,
    )

    db.add(evento)
    return evento


def encolar_correo(
    db,
    *,
    destinatario,
    asunto,
    contenido,
    documento_id=None,
):
    db.add(
        NotificacionConduccionORM(
            destinatario=destinatario,
            asunto=asunto,
            contenido=contenido,
            documento_id=documento_id,
        )
    )


def error_integridad():
    return HTTPException(
        status_code=409,
        detail=(
            "La operación produjo un conflicto "
            "con los datos existentes."
        ),
    )


async def confirmar_transaccion(db):
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise error_integridad() from exc
    except Exception:
        await db.rollback()
        raise


async def ejecutar_transaccion(db, operacion):
    try:
        resultado = await operacion()
    except IntegrityError as exc:
        await db.rollback()
        raise error_integridad() from exc
    except Exception:
        await db.rollback()
        raise

    # Esta función ya revierte si falla el commit.
    await confirmar_transaccion(db)
    return resultado


def resumen_gestion(legajo, gestion):
    return {
        "legajo_id": legajo.id,
        "estado": legajo.estado,
        "numero_legajo": gestion.numero_legajo if gestion else None,
        "datos_verificados": (
            gestion.datos_verificados if gestion else False
        ),
        "tiene_titulo_posgrado": (
            gestion.tiene_titulo_posgrado if gestion else None
        ),
        "fecha_aprobacion": (
            gestion.fecha_aprobacion if gestion else None
        ),
        "fecha_matricula": (
            gestion.fecha_matricula if gestion else None
        ),
        "fecha_baja": gestion.fecha_baja if gestion else None,
        "observaciones": gestion.observaciones if gestion else None,
    
        "documentacion_a_corregir": (
            gestion.documentacion_a_corregir if gestion else []
            ),
     }


async def consultar_gestion(db, legajo_id, usuario):
    comprobar_coordinador(usuario)

    legajo = await obtener_legajo(db, legajo_id)
    gestion = await obtener_gestion(db, legajo_id)

    return resumen_gestion(legajo, gestion)


async def guardar_verificacion(
    db,
    legajo_id,
    datos: VerificacionLegajoPeticion,
    usuario,
):
    comprobar_coordinador(usuario)

    legajo = await obtener_legajo(
        db,
        legajo_id,
        bloquear=True,
    )

    if legajo.estado not in {
        "PENDIENTE",
        "EN_REVISION",
        "OBSERVADO",
    }:
        raise HTTPException(
            status_code=409,
            detail=(
                "La verificación solo puede modificarse "
                "durante la revisión de la inscripción."
            ),
        )

    gestion = await obtener_gestion(
        db,
        legajo_id,
        crear=True,
    )

    anterior = {
        "datos_verificados": gestion.datos_verificados,
        "tiene_titulo_posgrado": gestion.tiene_titulo_posgrado,
    }

    gestion.datos_verificados = datos.datos_verificados
    gestion.tiene_titulo_posgrado = datos.tiene_titulo_posgrado

    registrar_auditoria(
        db,
        legajo_id=legajo_id,
        accion="VERIFICAR_DATOS",
        usuario=usuario,
        anterior=anterior,
        nuevo=datos.model_dump(),
    )

    return resumen_gestion(legajo, gestion)


async def obtener_completitud(db, legajo, gestion):
    if (
        gestion is None
        or gestion.tiene_titulo_posgrado is None
    ):
        return None

    resultado = await db.execute(
        select(DocumentoLegajoORM.tipo).where(
            DocumentoLegajoORM.legajo_id == legajo.id
        )
    )

    return calcular_completitud_documental(
        tipos_presentados=resultado.scalars().all(),
        tiene_titulo_posgrado=gestion.tiene_titulo_posgrado,
        solicito_beca=legajo.solicitud_beca is not None,
    )


async def consultar_completitud(db, legajo_id, usuario):
    comprobar_coordinador(usuario)

    legajo = await obtener_legajo(db, legajo_id)
    gestion = await obtener_gestion(db, legajo_id)
    resultado = await obtener_completitud(db, legajo, gestion)

    if resultado is None:
        return {
            "legajo_id": legajo.id,
            "completitud": None,
            "pendiente": (
                "Verificar si el aspirante tiene título de posgrado."
            ),
        }

    return {
        "legajo_id": legajo.id,
        "completitud": asdict(resultado),
        "pendiente": None,
    }


async def generar_numero_legajo(db, cohorte_id):
    if cohorte_id is None:
        raise HTTPException(
            status_code=409,
            detail="El legajo no tiene cohorte asignada.",
        )

    cohorte = await db.scalar(
        select(CohorteORM)
        .where(CohorteORM.id == cohorte_id)
        .with_for_update()
    )

    if cohorte is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró la cohorte.",
        )

    numeracion = await db.scalar(
        select(NumeracionCohorteORM).where(
            NumeracionCohorteORM.cohorte_id == cohorte_id
        )
    )

    if numeracion is None:
        numeracion = NumeracionCohorteORM(
            cohorte_id=cohorte_id,
            ultimo_numero=0,
        )
        db.add(numeracion)
        await db.flush()

    numeracion.ultimo_numero += 1

    return (
        f"{cohorte.anio % 100:02d}-"
        f"{numeracion.id:03d}-"
        f"{numeracion.ultimo_numero:03d}"
    )


async def asignar_legajo_personal(db, legajo, gestion):
    from src.compartido.documentos import normalizar_documento
    documento = normalizar_documento(legajo.dni_pasaporte)
    if not documento:
        raise HTTPException(422, "El alumno no tiene documento válido.")
    # Serializa asignaciones de distintas inscripciones de la misma persona.
    await db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:documento))"), {"documento": documento})
    personal = await db.get(LegajoPersonalORM, documento)
    if personal is None:
        numero = gestion.numero_legajo or await generar_numero_legajo(db, legajo.cohorte_id)
        personal = LegajoPersonalORM(documento=documento, numero=numero)
        db.add(personal)
    gestion.numero_legajo = personal.numero
    await db.flush()
    return personal.numero


async def aplicar_accion(
    db,
    legajo_id,
    datos: AccionLegajoPeticion,
    usuario,
    ahora=None,
):
    comprobar_coordinador(usuario)
    ahora = ahora if ahora is not None else ahora_utc()

    legajo = await obtener_legajo(
        db,
        legajo_id,
        bloquear=True,
    )

    if legajo.estado != datos.estado_esperado:
        raise HTTPException(
            status_code=409,
            detail=(
                "El estado del legajo cambió. "
                "Actualizá la pantalla e intentá nuevamente."
            ),
        )

    gestion = await obtener_gestion(
        db,
        legajo_id,
        crear=True,
    )

    documentacion_completa = False

    if datos.accion == AccionLegajo.APROBAR:
        completitud = await obtener_completitud(
            db,
            legajo,
            gestion,
        )

        if completitud is None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Primero deben verificarse "
                    "los requisitos documentales."
                ),
            )

        documentacion_completa = completitud.completo

    reserva_vencida = False

    if datos.accion == AccionLegajo.MATRICULAR:
        if gestion.fecha_aprobacion is None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Falta la fecha de aprobación. "
                    "Debe revisarse el registro histórico."
                ),
            )

        reserva_vencida = reserva_esta_vencida(
            gestion.fecha_aprobacion,
            ahora,
        )

    try:
        cambio = validar_cambio_estado(
            estado_actual=legajo.estado,
            accion=datos.accion,
            rol=usuario.rol.nombre,
            activo=usuario.activo,
            comentario=datos.comentario,
            documentacion_completa=documentacion_completa,
            datos_verificados=gestion.datos_verificados,
            reserva_vencida=reserva_vencida,
            documentacion_a_corregir=datos.documentacion_a_corregir,
        )
    except ReglaNegocioError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc
    except PermisoDenegadoError as exc:
        raise HTTPException(
            status_code=403,
            detail=str(exc),
        ) from exc

    if datos.accion == AccionLegajo.APROBAR:
        await asignar_legajo_personal(db, legajo, gestion)
        gestion.fecha_aprobacion = ahora

    elif datos.accion == AccionLegajo.REVISAR and cambio.estado_anterior != "PENDIENTE":
        gestion.fecha_aprobacion = None
        gestion.datos_verificados = False

    elif datos.accion == AccionLegajo.MATRICULAR:
        gestion.fecha_matricula = ahora

    elif datos.accion == AccionLegajo.DAR_BAJA:
        gestion.fecha_baja = ahora

    elif datos.accion == AccionLegajo.OBSERVAR:
        gestion.observaciones = cambio.comentario
        gestion.documentacion_a_corregir = (
            datos.documentacion_a_corregir
        )
        gestion.datos_verificados = False
    legajo.estado = cambio.estado_nuevo

    registrar_auditoria(
        db,
        legajo_id=legajo.id,
        accion=datos.accion.value,
        usuario=usuario,
        anterior={"estado": cambio.estado_anterior},
        nuevo={
            "estado": cambio.estado_nuevo,
            "numero_legajo": gestion.numero_legajo,
        },
        comentario=cambio.comentario,
    )

    if datos.accion == AccionLegajo.OBSERVAR:
        encolar_correo(
            db,
            destinatario=legajo.correo_electronico,
            asunto="Observaciones sobre tu inscripción",
            contenido=generar_correo_observacion(
                nombre=legajo.nombre,
                apellido=legajo.apellido,
                carrera=legajo.carrera_elegida,
                numero_seguimiento=legajo.numero_seguimiento,
                comentario=cambio.comentario,
                documentos=datos.documentacion_a_corregir,
            ),
        )

    elif cambio.estado_anterior != cambio.estado_nuevo:
        asunto, contenido = generar_correo_estado(legajo, cambio.estado_nuevo, cambio.comentario)
        if datos.accion in (AccionLegajo.APROBAR, AccionLegajo.MATRICULAR) and gestion.numero_legajo:
            contenido += f"\nNúmero de legajo: {gestion.numero_legajo}\n"
        encolar_correo(db, destinatario=legajo.correo_electronico, asunto=asunto, contenido=contenido)

    if datos.accion in (AccionLegajo.APROBAR, AccionLegajo.MATRICULAR):
        destinatario = os.getenv("ADMIN_EMAIL", "").strip()
        if not destinatario:
            raise HTTPException(status_code=503, detail="Falta configurar el correo de Administración.")
        matriculado = datos.accion == AccionLegajo.MATRICULAR
        encolar_correo(
            db, destinatario=destinatario,
            asunto="Acceso académico pendiente" if matriculado else "Inscripción aprobada",
            contenido=(f"Estudiante: {legajo.nombre} {legajo.apellido}\n"
                       f"Carrera: {legajo.carrera_elegida}\n"
                       f"Seguimiento: {legajo.numero_seguimiento}\n"
                       f"Número de legajo: {gestion.numero_legajo}\n"
                       + ("Verificá si ya existe una cuenta ALUMNO y gestioná su acceso." if matriculado
                          else "La inscripción está aprobada. Esperá la matriculación antes de habilitar el acceso.")),
        )

    if datos.accion in (AccionLegajo.APROBAR, AccionLegajo.MATRICULAR):
        matriculado = datos.accion == AccionLegajo.MATRICULAR
        await alertar_rol(db, "ADMIN", "Acceso académico pendiente" if matriculado else "Inscripción aprobada",
            f"{legajo.nombre} {legajo.apellido} · {legajo.numero_seguimiento}. " +
            ("Verificá o habilitá su cuenta." if matriculado else "Pendiente de matriculación."),
            f"/dashboard/administrador/usuarios/legajo/{legajo.id}")
    if cambio.estado_anterior != cambio.estado_nuevo:
        await alertar_alumno(db, legajo, "Actualización académica",
            f"{legajo.carrera_elegida}: nuevo estado {cambio.estado_nuevo}.", "/dashboard")
    return resumen_gestion(legajo, gestion)


async def consultar_auditoria(db, legajo_id, usuario):
    comprobar_coordinador(usuario)
    await obtener_legajo(db, legajo_id)

    resultado = await db.execute(
        select(AuditoriaConduccionORM)
        .where(
            AuditoriaConduccionORM.recurso_tipo == "LEGAJO",
            AuditoriaConduccionORM.recurso_id == legajo_id,
        )
        .order_by(
            AuditoriaConduccionORM.fecha,
            AuditoriaConduccionORM.id,
        )
    )

    return [
        {
            "id": evento.id,
            "actor_id": evento.actor_id,
            "actor_rol": evento.actor_rol,
            "accion": evento.accion,
            "resultado": evento.resultado,
            "anterior": evento.anterior,
            "nuevo": evento.nuevo,
            "comentario": evento.comentario,
            "fecha": evento.fecha,
        }
        for evento in resultado.scalars().all()
    ]


async def vencer_reservas(db, ahora=None):
    """
    Procesa reservas con fecha de aprobación conocida.
    No modifica registros históricos sin esa fecha.
    """
    ahora = ahora if ahora is not None else ahora_utc()
    limite = ahora - timedelta(days=30)

    resultado = await db.execute(
        select(LegajoORM, GestionLegajoORM)
        .join(
            GestionLegajoORM,
            GestionLegajoORM.legajo_id == LegajoORM.id,
        )
        .where(
            LegajoORM.estado == "COMPLETADO",
            GestionLegajoORM.fecha_aprobacion <= limite,
        )
        .with_for_update(
            of=LegajoORM,
            skip_locked=True,
        )
        .execution_options(populate_existing=True)
    )

    vencidos = []

    for legajo, gestion in resultado.all():
        legajo.estado = "VENCIDO"

        registrar_auditoria(
            db,
            legajo_id=legajo.id,
            accion="VENCER_RESERVA",
            anterior={"estado": "COMPLETADO"},
            nuevo={"estado": "VENCIDO"},
        )

        asunto, contenido = generar_correo_estado(legajo, "VENCIDO")
        encolar_correo(db, destinatario=legajo.correo_electronico, asunto=asunto, contenido=contenido)

        vencidos.append(
            {
                "id": str(legajo.id),
                "numero_seguimiento": legajo.numero_seguimiento,
                "numero_legajo": gestion.numero_legajo,
            }
        )

    if vencidos:
        correos = await db.execute(
            select(UsuarioORM.correo_electronico)
            .join(
                RolORM,
                UsuarioORM.rol_id == RolORM.id,
            )
            .where(
                UsuarioORM.activo.is_(True),
                RolORM.nombre == "COORDINADOR",
            )
        )

        listado = "\n".join(
            item["numero_legajo"] or item["numero_seguimiento"]
            for item in vencidos
        )

        for correo in set(correos.scalars().all()):
            encolar_correo(
                db,
                destinatario=correo,
                asunto="Reservas de vacante vencidas",
                contenido=(
                    "Vencieron las siguientes reservas:\n\n"
                    f"{listado}"
                ),
            )

    return {
        "cantidad": len(vencidos),
        "legajos": vencidos,
    }