"""Persistencia de trabajos finales mediante SQLAlchemy asíncrono (US-C-001)."""

from uuid import UUID
from dataclasses import asdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from src.seguimiento_graduacion.domain.repository import DatosTrabajoFinal
from src.seguimiento_graduacion.domain.exceptions import IntegridadTrabajoFinal, TrabajoFinalDuplicado

from src.inscripcion.infrastructure.orm_models import Legajo
from src.seguimiento_graduacion.infrastructure.orm_models import TrabajoFinal


class TrabajoFinalRepository:
    """Reutiliza la sesión recibida; quien la entrega controla la transacción.

    No abre conexiones propias ni confirma o revierte transacciones.
    Los errores de persistencia se propagan al llamador.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def obtener_legajo(self, legajo_id: UUID) -> Legajo | None:
        """Busca un legajo por su clave primaria; devuelve None si no existe."""
        return await self.session.get(Legajo, legajo_id)

    async def obtener_por_legajo(self, legajo_id: UUID) -> TrabajoFinal | None:
        """Consulta el trabajo final asociado al legajo, si está registrado."""
        consulta = select(TrabajoFinal).where(TrabajoFinal.legajo_id == legajo_id)
        resultado = await self.session.execute(consulta)
        return resultado.scalar_one_or_none()

    async def existe_para_legajo(self, legajo_id: UUID) -> bool:
        """Indica si hay un trabajo final; no sustituye la restricción UNIQUE."""
        return await self.obtener_por_legajo(legajo_id) is not None

    async def guardar(self, trabajo_final: TrabajoFinal) -> TrabajoFinal:
        """Envía los cambios a la base dentro de la transacción pendiente.

        flush permite obtener los valores generados por PostgreSQL, como el id.
        Si falla, el llamador debe revertir la transacción con rollback.
        """
        self.session.add(trabajo_final)
        await self.session.flush()
        return trabajo_final

    async def crear(
        self, legajo_id: UUID, datos: DatosTrabajoFinal, creado_por: str,
    ) -> TrabajoFinal:
        """Construye el modelo existente y traduce errores de integridad."""
        trabajo = TrabajoFinal(legajo_id=legajo_id, creado_por=creado_por, **asdict(datos))
        try:
            return await self.guardar(trabajo)
        except IntegrityError as exc:
            raise self._traducir_integridad(exc) from exc

    async def confirmar(self) -> None:
        """Confirma la transacción cuando lo solicita el caso de uso."""
        try:
            await self.session.commit()
        except IntegrityError as exc:
            raise self._traducir_integridad(exc) from exc

    async def revertir(self) -> None:
        """Revierte la transacción cuando lo solicita el caso de uso."""
        await self.session.rollback()

    @staticmethod
    def _traducir_integridad(error: IntegrityError) -> IntegridadTrabajoFinal | TrabajoFinalDuplicado:
        """Reconoce el duplicado por código y restricción, sin analizar mensajes."""
        original = error.orig
        detalle = getattr(original, "__cause__", None) or original
        codigo = getattr(original, "sqlstate", None) or getattr(detalle, "sqlstate", None)
        restriccion = getattr(detalle, "constraint_name", None)
        if codigo == "23505" and restriccion == "trabajos_finales_legajo_id_key":
            return TrabajoFinalDuplicado("El legajo ya tiene un trabajo final registrado")
        return IntegridadTrabajoFinal("No se pudo registrar el trabajo final por un conflicto de integridad")
