# Define las rutas de consulta y administración del contenido público.

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
from src.configuracion_publica.aplicacion.servicio import (
    modificar_configuracion,
    obtener_configuracion,
)
from src.configuracion_publica.presentacion.esquema import (
    ConfiguracionSeccionModificar,
    ConfiguracionSeccionRespuesta,
)


enrutador = APIRouter(
    prefix="/api/v1/configuracion-publica",
    tags=["Configuración Pública"],
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