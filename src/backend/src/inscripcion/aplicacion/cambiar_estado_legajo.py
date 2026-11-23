
# Gestiona los cambios de estado de los legajos.
# Aplica las reglas del workflow y los permisos.

from uuid import UUID

from fastapi import HTTPException

from src.inscripcion.aplicacion.workflow_legajo import (
    validar_transicion_legajo,
)
from src.inscripcion.infraestructura.repositorio import (
    LegajoRepositorioPostgres,
)
from src.inscripcion.infraestructura.orm_modelos import (
    LegajoORM,
)
from src.usuarios.modelos import UsuarioORM


async def cambiar_estado_legajo(
    repositorio: LegajoRepositorioPostgres,
    legajo_id: UUID,
    estado_nuevo: str,
    usuario: UsuarioORM,
) -> LegajoORM:
    """
    Cambia el estado de un legajo existente.

    Por ahora solo habilita iniciar la revisión.
    Las demás transiciones requieren implementar
    sus reglas de negocio adicionales.
    """

    if not usuario.activo:
        raise HTTPException(
            status_code=403,
            detail="El usuario no está habilitado.",
        )

    if (
        usuario.rol is None
        or usuario.rol.nombre != "COORDINADOR"
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Solo el coordinador puede realizar "
                "esta operación."
            ),
        )

    legajo = await repositorio.obtener_por_id(
        legajo_id
    )

    if legajo is None:
        raise HTTPException(
            status_code=404,
            detail="No se encontró el legajo.",
        )

    estado_actual = legajo.estado.strip().upper()
    nuevo_estado = estado_nuevo.strip().upper()

    if not validar_transicion_legajo(
        estado_actual,
        nuevo_estado,
        usuario.rol.nombre,
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "La transición de estado solicitada "
                "no está permitida."
            ),
        )

    # Única transición habilitada en este incremento.
    if (
        estado_actual != "PENDIENTE"
        or nuevo_estado != "EN_REVISION"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Esta operación todavía no está "
                "habilitada para esos estados."
            ),
        )

    legajo_actualizado = (
        await repositorio.actualizar_estado_legajo(
            legajo_id=legajo_id,
            estado_actual=estado_actual,
            estado_nuevo=nuevo_estado,
        )
    )

    if legajo_actualizado is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "El legajo fue modificado por otro "
                "usuario. Actualizá la información "
                "e intentá nuevamente."
            ),
        )

    return legajo_actualizado
