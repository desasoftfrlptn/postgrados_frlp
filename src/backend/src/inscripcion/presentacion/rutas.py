from datetime import datetime
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.carreras.modelos import CarreraORM
from src.compartido.conexion import get_db
from src.conduccion import servicio as servicio_conduccion
from src.conduccion.esquemas import AccionLegajoPeticion
from src.conduccion.modelos import GestionLegajoORM
from src.conduccion.reglas import AccionLegajo

from src.inscripcion.aplicacion.consultar_documentacion import (
    consultar_documentacion_legajo,
)
from src.inscripcion.aplicacion.listar_legajos import (
    listar_legajos,
)
from src.inscripcion.infraestructura.cohortes_modelos import (
    CohorteORM,
)
from src.inscripcion.infraestructura.orm_modelos import LegajoORM
from src.inscripcion.infraestructura.repositorio import (
    LegajoRepositorioPostgres,
)
from src.inscripcion.presentacion.esquemas import (
    DocumentacionLegajoRespuesta,
    LegajoActualizarPerfil,
    LegajoCrear,
    LegajoRespuesta,
)
from src.usuarios.modelos import UsuarioORM
from src.usuarios.rutas import usuario_actual


enrutador = APIRouter(
    prefix="/api/v1/inscripcion",
    tags=["Inscripción"],
)


async def coordinador_actual(
    usuario: UsuarioORM = Depends(usuario_actual),
) -> UsuarioORM:
    if (
        not usuario.activo
        or usuario.rol is None
        or usuario.rol.nombre != "COORDINADOR"
    ):
        raise HTTPException(
            status_code=403,
            detail="Se requieren permisos de coordinador.",
        )

    return usuario


@enrutador.post(
    "/",
    response_model=LegajoRespuesta,
    status_code=201,
)
async def inscribir_aspirante(
    datos: LegajoCrear,
    db: AsyncSession = Depends(get_db),
):
    resultado = await db.execute(
        select(CohorteORM)
        .where(CohorteORM.id == datos.cohorte_id)
        .with_for_update()
    )
    cohorte = resultado.scalar_one_or_none()

    if cohorte is None:
        raise HTTPException(
            status_code=404,
            detail="La cohorte seleccionada no existe.",
        )

    if not cohorte.abierta:
        raise HTTPException(
            status_code=422,
            detail="La inscripción a esta cohorte está cerrada.",
        )

    carrera = await db.get(CarreraORM, cohorte.carrera_id)

    if carrera is None or not carrera.activo:
        raise HTTPException(
            status_code=422,
            detail="La carrera de la cohorte no está disponible.",
        )

    if datos.carrera_elegida.strip() != carrera.nombre.strip():
        raise HTTPException(
            status_code=422,
            detail="La carrera elegida no corresponde a la cohorte.",
        )

    correo_existente = await db.scalar(
        select(LegajoORM.id).where(
            LegajoORM.correo_electronico == datos.correo_electronico
        )
    )

    if correo_existente is not None:
        raise HTTPException(
            status_code=409,
            detail="Ya existe una inscripción con ese correo electrónico.",
        )

    dni_existente = await db.scalar(
        select(LegajoORM.id).where(
            LegajoORM.dni_pasaporte == datos.dni_pasaporte,
            LegajoORM.cohorte_id == datos.cohorte_id,
        )
    )

    if dni_existente is not None:
        raise HTTPException(
            status_code=409,
            detail="El documento ya está registrado en esta cohorte.",
        )

    cantidad = await db.scalar(
        select(func.count(LegajoORM.id)).where(
            LegajoORM.cohorte_id == datos.cohorte_id
        )
    )

    if cantidad >= 500:
        raise HTTPException(
            status_code=409,
            detail="La cohorte alcanzó el cupo máximo de 500 aspirantes.",
        )

    anio = datetime.now(
        ZoneInfo("America/Argentina/Buenos_Aires")
    ).year

    try:
        resultado_contador = await db.execute(
            text(
                """
                INSERT INTO contadores_inscripcion (
                    anio,
                    ultimo_numero
                )
                VALUES (:anio, 1)
                ON CONFLICT (anio)
                DO UPDATE SET
                    ultimo_numero =
                        contadores_inscripcion.ultimo_numero + 1
                RETURNING ultimo_numero
                """
            ),
            {"anio": anio},
        )

        correlativo = resultado_contador.scalar_one()

        nuevo_legajo = LegajoORM(
            **datos.model_dump(),
            numero_seguimiento=f"INS-{anio}-{correlativo}",
            estado="PENDIENTE",
        )

        db.add(nuevo_legajo)

        await db.commit()

    except IntegrityError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=409,
            detail="La inscripción ya existe o contiene datos duplicados.",
        ) from exc

    except Exception:
        await db.rollback()
        raise

    await db.refresh(nuevo_legajo)
    return nuevo_legajo


@enrutador.get(
    "/",
    response_model=list[LegajoRespuesta],
)
async def listar_legajos_conduccion(
    dni: str | None = None,
    apellido: str | None = None,
    carrera: str | None = None,
    estado: str | None = None,
    cohorte_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(coordinador_actual),
):
    repositorio = LegajoRepositorioPostgres(db)

    return await listar_legajos(
        repositorio=repositorio,
        dni=dni,
        apellido=apellido,
        carrera=carrera,
        estado=estado,
        cohorte_id=cohorte_id,
    )


@enrutador.get(
    "/mi-legajo",
    response_model=LegajoRespuesta,
)
async def obtener_mi_legajo(
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(usuario_actual),
):
    repositorio = LegajoRepositorioPostgres(db)

    legajo = await repositorio.obtener_por_email_o_dni(
        email=usuario.correo_electronico,
        dni=usuario.dni,
    )

    if legajo is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró el legajo.",
        )

    return legajo


@enrutador.patch(
    "/mi-legajo",
    response_model=LegajoRespuesta,
)
async def actualizar_mi_legajo(
    datos: LegajoActualizarPerfil,
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(usuario_actual),
):
    repositorio = LegajoRepositorioPostgres(db)

    legajo_entidad = await repositorio.obtener_por_email_o_dni(
        email=usuario.correo_electronico,
        dni=usuario.dni,
    )

    if legajo_entidad is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró el legajo.",
        )

    async def actualizar():
        legajo_orm = await db.scalar(
            select(LegajoORM)
            .where(
                LegajoORM.id == legajo_entidad.id,
                LegajoORM.correo_electronico == usuario.correo_electronico,
                LegajoORM.dni_pasaporte == usuario.dni,
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )

        if legajo_orm is None:
            raise HTTPException(
                status_code=404,
                detail="No se encontró el legajo.",
            )

        hubo_cambios = False

        for campo, valor in datos.model_dump(
            exclude_unset=True
        ).items():
            if (
                valor is not None
                and getattr(legajo_orm, campo) != valor
            ):
                setattr(legajo_orm, campo, valor)
                hubo_cambios = True

        if hubo_cambios:
            gestion = await db.get(
                GestionLegajoORM,
                legajo_orm.id,
            )

            if gestion is not None:
                verificacion_anterior = gestion.datos_verificados
                gestion.datos_verificados = False

                servicio_conduccion.registrar_auditoria(
                    db,
                    legajo_id=legajo_orm.id,
                    accion="INVALIDAR_VERIFICACION_POR_EDICION",
                    usuario=usuario,
                    anterior={
                        "datos_verificados": verificacion_anterior,
                    },
                    nuevo={"datos_verificados": False},
                )

        return legajo_orm

    legajo_actualizado = await servicio_conduccion.ejecutar_transaccion(
        db,
        actualizar,
    )

    await db.refresh(legajo_actualizado)
    return legajo_actualizado


@enrutador.get(
    "/{legajo_id}",
    response_model=LegajoRespuesta,
)
async def obtener_detalle_legajo(
    legajo_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(coordinador_actual),
):
    repositorio = LegajoRepositorioPostgres(db)
    legajo = await repositorio.obtener_por_id(legajo_id)

    if legajo is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró el legajo.",
        )

    return legajo


@enrutador.get(
    "/{legajo_id}/documentos",
    response_model=DocumentacionLegajoRespuesta,
)
async def obtener_documentacion_legajo(
    legajo_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(coordinador_actual),
):
    repositorio = LegajoRepositorioPostgres(db)

    documentacion = await consultar_documentacion_legajo(
        repositorio=repositorio,
        legajo_id=legajo_id,
    )

    if documentacion is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró el legajo.",
        )

    return documentacion


@enrutador.patch(
    "/{legajo_id}/iniciar-revision",
    response_model=LegajoRespuesta,
)
async def iniciar_revision_legajo(
    legajo_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(coordinador_actual),
):
    await servicio_conduccion.ejecutar_transaccion(
        db,
        lambda: servicio_conduccion.aplicar_accion(
            db,
            legajo_id,
            AccionLegajoPeticion(
                accion=AccionLegajo.REVISAR,
                estado_esperado="PENDIENTE",
            ),
            usuario,
        ),
    )

    return await db.get(LegajoORM, legajo_id)