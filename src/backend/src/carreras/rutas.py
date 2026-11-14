# Define las rutas para la administración de carreras.

from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy.ext.asyncio import AsyncSession

from src.compartido.conexion import get_db

from src.usuarios.servicio import (
    obtener_administrador_actual,
)

from src.carreras.servicio import (
    cambiar_estado_carrera,
    crear_carrera,
    listar_carreras,
    modificar_carrera,
)

from src.carreras.esquemas import (
    CarreraCrear,
    CarreraEstadoModificar,
    CarreraModificar,
    CarreraRespuesta,
)


enrutador = APIRouter(
    prefix="/api/v1/carreras",
    tags=["Carreras"],
)


seguridad_bearer = HTTPBearer()


async def obtener_admin(
    credenciales: HTTPAuthorizationCredentials = Depends(
        seguridad_bearer
    ),
    db: AsyncSession = Depends(get_db),
):
    return await obtener_administrador_actual(
        credenciales.credentials,
        db,
    )


@enrutador.get(
    "",
    response_model=list[CarreraRespuesta],
)
async def obtener_carreras(
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await listar_carreras(db)


@enrutador.post(
    "",
    response_model=CarreraRespuesta,
    status_code=201,
)
async def registrar_carrera(
    datos: CarreraCrear,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await crear_carrera(
        datos,
        db,
    )


@enrutador.put(
    "/{carrera_id}",
    response_model=CarreraRespuesta,
)
async def actualizar_carrera(
    carrera_id: UUID,
    datos: CarreraModificar,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await modificar_carrera(
        carrera_id,
        datos,
        db,
    )


@enrutador.patch(
    "/{carrera_id}/estado",
    response_model=CarreraRespuesta,
)
async def actualizar_estado_carrera(
    carrera_id: UUID,
    datos: CarreraEstadoModificar,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await cambiar_estado_carrera(
        carrera_id,
        datos.activo,
        db,
    )