from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from src.compartido.conexion import get_db
from src.usuarios.seguridad import TokenBearer
from src.usuarios.servicio import obtener_administrador_actual

from src.eventos.esquemas import (
    EventoCrear,
    EventoModificar,
    EventoEstadoModificar,
    EventoRespuesta,
)

from src.eventos.servicio import (
    listar_eventos_publicos,
    listar_eventos_admin,
    crear_evento,
    modificar_evento,
    cambiar_estado_evento,
)


enrutador = APIRouter(
    prefix="/api/v1/eventos",
    tags=["Eventos académicos"],
)

seguridad_bearer = TokenBearer()


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
    "/publicos",
    response_model=list[EventoRespuesta],
)
async def obtener_eventos_publicos(
    db: AsyncSession = Depends(get_db),
):
    return await listar_eventos_publicos(db)


@enrutador.get(
    "",
    response_model=list[EventoRespuesta],
)
async def obtener_eventos_admin(
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await listar_eventos_admin(db)


@enrutador.post(
    "",
    response_model=EventoRespuesta,
    status_code=201,
)
async def registrar_evento(
    datos: EventoCrear,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await crear_evento(datos, db)


@enrutador.put(
    "/{evento_id}",
    response_model=EventoRespuesta,
)
async def actualizar_evento(
    evento_id: UUID,
    datos: EventoModificar,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await modificar_evento(evento_id, datos, db)


@enrutador.patch(
    "/{evento_id}/estado",
    response_model=EventoRespuesta,
)
async def actualizar_estado_evento(
    evento_id: UUID,
    datos: EventoEstadoModificar,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await cambiar_estado_evento(
        evento_id,
        datos.activo,
        db,
    )
