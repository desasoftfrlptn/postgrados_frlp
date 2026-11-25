"""Caso de uso de alta de trabajo final (US-C-001, RF-GRAD-001)."""

from uuid import UUID

from src.seguimiento_graduacion.domain.exceptions import (
    AccesoDenegado,
    LegajoNoEncontrado,
    TrabajoFinalDuplicado,
)
from src.seguimiento_graduacion.domain.repository import DatosTrabajoFinal, TrabajoFinalRepository


class RegistrarTrabajoFinal:
    """Coordina el alta en una sesión dedicada a esta operación."""

    def __init__(self, repository: TrabajoFinalRepository) -> None:
        self._repository = repository

    async def ejecutar(
        self, legajo_id: UUID, datos: DatosTrabajoFinal, *,
        usuario_email: str, usuario_rol: str,
    ):
        """Recibe la identidad autenticada desde el llamador, nunca desde el cuerpo.

        Las validaciones de formato corresponden a los schemas de entrada.
        Confirma el alta completa o revierte la transacción ante un error.
        """
        try:
            if usuario_rol != "cpr":
                raise AccesoDenegado("Solo la CPR puede registrar trabajos finales")
            if not usuario_email.strip():
                raise AccesoDenegado("Se requiere identificar al usuario responsable")
            if await self._repository.obtener_legajo(legajo_id) is None:
                raise LegajoNoEncontrado("El legajo indicado no existe")
            if await self._repository.existe_para_legajo(legajo_id):
                raise TrabajoFinalDuplicado("El legajo ya tiene un trabajo final registrado")
            trabajo = await self._repository.crear(legajo_id, datos, usuario_email)
            await self._repository.confirmar()
            return trabajo
        except Exception:
            await self._repository.revertir()
            raise
