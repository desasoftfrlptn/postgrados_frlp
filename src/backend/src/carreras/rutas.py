from src.usuarios.seguridad import TokenBearer
# Define las rutas para la administración de carreras.

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from fastapi.security import (
    HTTPAuthorizationCredentials,
)
from sqlalchemy.ext.asyncio import AsyncSession

from src.compartido.conexion import get_db

from src.usuarios.servicio import (
    obtener_administrador_actual,
)

from src.carreras.asociaciones import consultar_asociaciones, candidatos_asociacion, asociar_alumno, desasociar_alumno
from pydantic import BaseModel

from src.carreras.servicio import (
    cambiar_estado_carrera,
    borrar_carrera,
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
    "",
    response_model=list[CarreraRespuesta],
)
async def obtener_carreras(
    db: AsyncSession = Depends(get_db),
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

@enrutador.get("/{carrera_id}/asociaciones")
async def obtener_asociaciones_carrera(
    carrera_id: UUID,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await consultar_asociaciones(carrera_id, db)


@enrutador.delete("/{carrera_id}", status_code=204)
async def eliminar_carrera(carrera_id: UUID, db: AsyncSession = Depends(get_db), _admin=Depends(obtener_admin)):
    await borrar_carrera(carrera_id, db)
    return Response(status_code=204)


class AsociacionAlumno(BaseModel):
    legajo_id: UUID
    cohorte_id: UUID


@enrutador.get("/{carrera_id}/asociaciones/candidatos")
async def listar_candidatos(carrera_id: UUID, db: AsyncSession = Depends(get_db), _admin=Depends(obtener_admin)):
    return await candidatos_asociacion(carrera_id, db)


@enrutador.post("/{carrera_id}/asociaciones/alumnos", status_code=201)
async def agregar_alumno(carrera_id: UUID, datos: AsociacionAlumno, db: AsyncSession = Depends(get_db), _admin=Depends(obtener_admin)):
    return await asociar_alumno(carrera_id, datos.legajo_id, datos.cohorte_id, db, _admin)


@enrutador.delete("/{carrera_id}/asociaciones/alumnos/{legajo_id}", status_code=204)
async def quitar_alumno(carrera_id: UUID, legajo_id: UUID, db: AsyncSession = Depends(get_db), _admin=Depends(obtener_admin)):
    await desasociar_alumno(carrera_id, legajo_id, db, _admin)
    return Response(status_code=204)
