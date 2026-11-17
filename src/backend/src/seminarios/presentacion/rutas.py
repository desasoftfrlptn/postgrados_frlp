from src.usuarios.seguridad import TokenBearer
# Define las rutas para la administración de seminarios.

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import (
    HTTPAuthorizationCredentials,
)
from sqlalchemy.ext.asyncio import AsyncSession

from src.usuarios.servicio import (
    obtener_administrador_actual,
    obtener_usuario_actual,
)
from src.compartido.conexion import get_db
from src.seminarios.aplicacion.servicio import (
    cambiar_estado_seminario,
    crear_seminario,
    listar_seminarios,
    modificar_seminario,
    listar_seminarios_docente,
    inscribir_alumno_seminario,
    listar_alumnos_seminario,
    registrar_calificacion_seminario,
    registrar_asistencia_clase,
    listar_cursada_estudiante,
    verificar_seminario_docente,
)
from src.seminarios.presentacion.esquema import (
    SeminarioCrear,
    SeminarioEstadoModificar,
    SeminarioModificar,
    SeminarioRespuesta,
    AlumnoSeminarioRespuesta,
    CalificacionActualizar,
    InscripcionSeminarioCrear,
    AsistenciaClaseRegistrar,
    CursadaEstudianteRespuesta,
   
)


enrutador = APIRouter(
    prefix="/api/v1/seminarios",
    tags=["Seminarios"],
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

async def obtener_docente_actual(
    credenciales: HTTPAuthorizationCredentials = Depends(
        seguridad_bearer
    ),
    db: AsyncSession = Depends(get_db),
):
    usuario = await obtener_usuario_actual(
        credenciales.credentials,
        db,
    )
    if (
        not usuario.activo
        or usuario.rol is None
        or usuario.rol.nombre != "DOCENTE"
    ):
        raise HTTPException(
            status_code=403,
            detail="Acceso exclusivo para docentes",
        )
    return usuario


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

@enrutador.get(
    "/mis-seminarios",
    response_model=list[SeminarioRespuesta],
)
async def obtener_mis_seminarios(
    db: AsyncSession = Depends(get_db),
    docente=Depends(obtener_docente_actual),
):
    return await listar_seminarios_docente(
        docente.id,
        db,
    )

@enrutador.get(
    "/mi-cursada",
    response_model=list[CursadaEstudianteRespuesta],
)
async def obtener_mi_cursada(
    credenciales: HTTPAuthorizationCredentials = Depends(seguridad_bearer),
    db: AsyncSession = Depends(get_db),
):
    usuario = await obtener_usuario_actual(credenciales.credentials, db)
    return await listar_cursada_estudiante(
        usuario.correo_electronico,
        usuario.dni or "",
        db,
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

@enrutador.get(
    "/{seminario_id}/estudiantes",
    response_model=list[AlumnoSeminarioRespuesta],
)
async def obtener_estudiantes_seminario(
    seminario_id: UUID,
    db: AsyncSession = Depends(get_db),
    docente=Depends(obtener_docente_actual),
):
    return await listar_alumnos_seminario(
        seminario_id,
        docente.id,
        db,
    )


@enrutador.post(
    "/{seminario_id}/estudiantes",
    response_model=AlumnoSeminarioRespuesta,
    status_code=201,
)
async def inscribir_estudiante_en_seminario(
    seminario_id: UUID,
    datos: InscripcionSeminarioCrear,
    db: AsyncSession = Depends(get_db),
    docente=Depends(obtener_docente_actual),
):
    await verificar_seminario_docente(seminario_id, docente.id, db)
    return await inscribir_alumno_seminario(
        seminario_id,
        datos.legajo_id,
        datos.dni_pasaporte,
        db,
    )


@enrutador.patch(
    "/{seminario_id}/estudiantes/{legajo_id}/calificacion",
    response_model=AlumnoSeminarioRespuesta,
)
async def guardar_calificacion_estudiante(
    seminario_id: UUID,
    legajo_id: UUID,
    datos: CalificacionActualizar,
    db: AsyncSession = Depends(get_db),
    docente=Depends(obtener_docente_actual),
):
    return await registrar_calificacion_seminario(
        seminario_id,
        legajo_id,
        datos.nota_final,
        docente.id,
        db,
    )

@enrutador.post(
    "/{seminario_id}/asistencias",
    response_model=list[AlumnoSeminarioRespuesta],
)
async def registrar_asistencia_seminario(
    seminario_id: UUID,
    datos: AsistenciaClaseRegistrar,
    db: AsyncSession = Depends(get_db),
    docente=Depends(obtener_docente_actual),
):
    return await registrar_asistencia_clase(
        seminario_id,
        datos.fecha,
        datos.presentes_legajo_ids,
        docente.id,
        db,
    )
