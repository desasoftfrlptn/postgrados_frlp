from uuid import UUID

from src.configuracion_publica.aplicacion.faq import (
    listar_preguntas,
    crear_pregunta,
    modificar_pregunta,
    cambiar_estado_pregunta,
)

from src.configuracion_publica.presentacion.esquema import (
    PreguntaFrecuenteCrear,
    PreguntaFrecuenteRespuesta,
    PreguntaFrecuenteEstado,
)

from src.usuarios.seguridad import TokenBearer
# Define las rutas de consulta y administración del contenido público.

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
)

from src.compartido.limite_consultas import (
    validar_limite_consultas,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
)
from sqlalchemy.ext.asyncio import AsyncSession

from src.usuarios.servicio import (
    obtener_administrador_actual,
)
from src.compartido.conexion import get_db

from src.configuracion_publica.aplicacion.servicio import (
    modificar_configuracion,
    obtener_configuracion,
    restablecer_configuracion,
)

from src.configuracion_publica.presentacion.esquema import (
    ConfiguracionSeccionModificar,
    ConfiguracionSeccionRespuesta,
)

import logging
from src.conduccion.servicio import encolar_correo
from src.compartido.correo import enviar_correo

from src.configuracion_publica.presentacion.esquema import (
    ConsultaContactoCrear,
    ConsultaContactoRespuesta,
)

enrutador = APIRouter(
    prefix="/api/v1/configuracion-publica",
    tags=["Configuración Pública"],
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
    "/{seccion}",
    response_model=ConfiguracionSeccionRespuesta,
)
async def consultar_configuracion(
    seccion: str,
    db: AsyncSession = Depends(get_db),
):
    valores = await obtener_configuracion(
        seccion,
        db,
    )

    return ConfiguracionSeccionRespuesta(
        seccion=seccion,
        valores=valores,
    )


@enrutador.put(
    "/{seccion}",
    response_model=ConfiguracionSeccionRespuesta,
)
async def actualizar_configuracion(
    seccion: str,
    datos: ConfiguracionSeccionModificar,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    valores = await modificar_configuracion(
        seccion,
        datos.valores,
        db,
    )

    return ConfiguracionSeccionRespuesta(
        seccion=seccion,
        valores=valores,
    )


@enrutador.post(
    "/home/restablecer",
    response_model=ConfiguracionSeccionRespuesta,
)
async def restablecer_inicio(
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    valores = await restablecer_configuracion(
        "home",
        db,
    )

    return ConfiguracionSeccionRespuesta(
        seccion="home",
        valores=valores,
    )


@enrutador.post(
    "/contacto/restablecer",
    response_model=ConfiguracionSeccionRespuesta,
)
async def restablecer_contacto(
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    valores = await restablecer_configuracion(
        "contacto",
        db,
    )

    return ConfiguracionSeccionRespuesta(
        seccion="contacto",
        valores=valores,
    )

logger = logging.getLogger(__name__)


@enrutador.post(
    "/contacto/consultas",
    response_model=ConsultaContactoRespuesta,
)
async def enviar_consulta_contacto(
    consulta: ConsultaContactoCrear,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ip = (
        request.client.host
        if request.client
        else "desconocida"
    )

    validar_limite_consultas(ip)

    configuracion = await obtener_configuracion(
        "contacto",
        db,
    )

    destinatario = configuracion.get("email", "").strip()

    if not destinatario:
        raise HTTPException(
            status_code=503,
            detail=(
                "El servicio de consultas no está "
                "disponible temporalmente."
            ),
        )

    contenido = (
        "Nueva consulta desde el sitio de Posgrado\n\n"
        f"Nombre: {consulta.nombre}\n"
        f"Correo electrónico: {consulta.email}\n"
        f"Asunto: {consulta.asunto}\n\n"
        f"Mensaje:\n{consulta.mensaje}"
    )

    try:
        encolar_correo(
            db,
            destinatario=destinatario,
            asunto="Nueva consulta - Posgrado UTN FRLP",
            contenido=contenido,
            responder_a=str(consulta.email),
        )

        await db.commit()

    except Exception as exc:
        await db.rollback()

        logger.error(
            "Error guardando consulta de contacto: %s",
            type(exc).__name__,
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "No se pudo registrar la consulta. "
                "Intentá nuevamente más tarde."
            ),
        ) from exc

    return ConsultaContactoRespuesta(
        mensaje="Recibimos tu consulta correctamente."
    )

@enrutador.get(
    "/faq/publicas",
    response_model=list[PreguntaFrecuenteRespuesta],
)
async def consultar_faq_publica(
    db: AsyncSession = Depends(get_db),
):
    return await listar_preguntas(db)


# Administración de preguntas frecuentes.
@enrutador.get(
    "/faq/admin",
    response_model=list[PreguntaFrecuenteRespuesta],
)
async def consultar_faq_admin(
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await listar_preguntas(
        db,
        solo_activas=False,
    )


@enrutador.post(
    "/faq/admin",
    response_model=PreguntaFrecuenteRespuesta,
    status_code=201,
)
async def registrar_faq(
    datos: PreguntaFrecuenteCrear,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await crear_pregunta(
        datos.model_dump(),
        db,
    )


@enrutador.put(
    "/faq/admin/{pregunta_id}",
    response_model=PreguntaFrecuenteRespuesta,
)
async def actualizar_faq(
    pregunta_id: UUID,
    datos: PreguntaFrecuenteCrear,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await modificar_pregunta(
        pregunta_id,
        datos.model_dump(),
        db,
    )


@enrutador.patch(
    "/faq/admin/{pregunta_id}/estado",
    response_model=PreguntaFrecuenteRespuesta,
)
async def actualizar_estado_faq(
    pregunta_id: UUID,
    datos: PreguntaFrecuenteEstado,
    db: AsyncSession = Depends(get_db),
    administrador=Depends(obtener_admin),
):
    return await cambiar_estado_pregunta(
        pregunta_id,
        datos.activa,
        db,
    )
