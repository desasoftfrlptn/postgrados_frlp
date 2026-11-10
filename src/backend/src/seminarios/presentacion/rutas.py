# Define las rutas para la administración de seminarios.

from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from sqlalchemy.ext.asyncio import AsyncSession

from src.usuarios.servicio import (
    obtener_administrador_actual,
)
from src.compartido.conexion import get_db
from src.seminarios.aplicacion.servicio import (
    cambiar_estado_seminario,
    crear_seminario,
    listar_seminarios,
    modificar_seminario,
)
from src.seminarios.presentacion.esquema import (
    SeminarioCrear,
    SeminarioEstadoModificar,
    SeminarioModificar,
    SeminarioRespuesta,
)


enrutador = APIRouter(
    prefix="/api/v1/seminarios",
    tags=["Seminarios"],
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
    response_model=list[SeminarioRespuesta],
)
async def obtener_seminarios(
    db: AsyncSession = Depends(get_db),
    administrador=Depends(
        obtener_admin
    ),
):
    return await listar_seminarios(
        db
    )


@enrutador.post(
    "",
    response_model=SeminarioRespuesta,
    status_code=201,
)
async def registrar_seminario(
    datos: SeminarioCrear,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(
        obtener_admin
    ),
):
    return await crear_seminario(
        datos,
        db,
    )


@enrutador.put(
    "/{seminario_id}",
    response_model=SeminarioRespuesta,
)
async def actualizar_seminario(
    seminario_id: UUID,
    datos: SeminarioModificar,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(
        obtener_admin
    ),
):
    return await modificar_seminario(
        seminario_id,
        datos,
        db,
    )


@enrutador.patch(
    "/{seminario_id}/estado",
    response_model=SeminarioRespuesta,
)
async def actualizar_estado_seminario(
    seminario_id: UUID,
    datos: SeminarioEstadoModificar,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(
        obtener_admin
    ),
):
    return await cambiar_estado_seminario(
        seminario_id,
        datos.activo,
        db,
    )