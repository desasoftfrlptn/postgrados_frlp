
# Rutas públicas de inscripción y consultas
# protegidas del Equipo de Conducción.

from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.compartido.conexion import get_db
from src.inscripcion.aplicacion.cambiar_estado_legajo import (
    cambiar_estado_legajo,
)
from src.inscripcion.aplicacion.consultar_documentacion import (
    consultar_documentacion_legajo,
)
from src.inscripcion.infraestructura.orm_modelos import (
    LegajoORM,
)
from src.inscripcion.infraestructura.repositorio import (
    LegajoRepositorioPostgres,
)
from src.inscripcion.presentacion.esquemas import (
    DocumentacionLegajoRespuesta,
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
    """
    Verifica que el usuario autenticado
    pertenezca al Equipo de Conducción.
    """

    if (
        not usuario.activo
        or usuario.rol is None
        or usuario.rol.nombre != "COORDINADOR"
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Se requieren permisos "
                "de coordinador."
            ),
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
    """
    Conserva el registro público de aspirantes.
    """

    duplicado = await db.scalar(
        select(LegajoORM.id).where(
            or_(
                LegajoORM.correo_electronico
                == datos.correo_electronico,
                LegajoORM.dni_pasaporte
                == datos.dni_pasaporte,
            )
        )
    )

    if duplicado is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe una inscripción con ese "
                "correo electrónico o documento."
            ),
        )

    nuevo_legajo = LegajoORM(
        **datos.model_dump(),
        estado="PENDIENTE",
    )

    db.add(nuevo_legajo)

    try:
        await db.commit()
        await db.refresh(nuevo_legajo)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Ya existe una inscripción con ese "
                "correo electrónico o documento."
            ),
        ) from exc

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
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(
        coordinador_actual
    ),
):
    """
    Lista los legajos para Conducción,
    aplicando filtros opcionales.
    """

    repositorio = LegajoRepositorioPostgres(
        db
    )

    return await repositorio.listar_legajos(
        dni=dni,
        apellido=apellido,
        carrera=carrera,
        estado=estado,
    )

@enrutador.get(
        "/mi-legajo", 
        response_model=LegajoRespuesta)
async def obtener_mi_legajo(
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(usuario_actual),
):
    repositorio = LegajoRepositorioPostgres(
        db
    )
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

@enrutador.get(
    "/{legajo_id}",
    response_model=LegajoRespuesta,
)
async def obtener_detalle_legajo(
    legajo_id: UUID,
    db: AsyncSession = Depends(get_db),
    usuario: UsuarioORM = Depends(
        coordinador_actual
    ),
):
    """
    Devuelve los datos de un legajo
    al coordinador autenticado.
    """

    repositorio = LegajoRepositorioPostgres(
        db
    )

    legajo = await repositorio.obtener_por_id(
        legajo_id
    )

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
    usuario: UsuarioORM = Depends(
        coordinador_actual
    ),
):
    """
    Permite al Equipo de Conducción consultar
    los metadatos documentales de un legajo.

    No expone rutas físicas ni archivos privados.
    """

    repositorio = LegajoRepositorioPostgres(
        db
    )

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
    usuario: UsuarioORM = Depends(
        coordinador_actual
    ),
):
    """
    Permite al coordinador iniciar
    la revisión de un legajo pendiente.
    """

    repositorio = LegajoRepositorioPostgres(
        db
    )

    return await cambiar_estado_legajo(
        repositorio=repositorio,
        legajo_id=legajo_id,
        estado_nuevo="EN_REVISION",
        usuario=usuario,
    )
