from sqlalchemy.future import select
from sqlalchemy.orm import Session
import uuid
from typing import Optional, List

from ...inscripcion.domain.entities import Aspirante, Legajo, EstadoLegajo, TipoCarrera
from ...inscripcion.domain.value_objects import DNI, Email
from ...inscripcion.domain.repo import LegajoRepository
from ...inscripcion.domain.estados import validar_transicion
from ...shared.exceptions import LegajoNoEncontrado


class PostgresLegajoRepository(LegajoRepository):
    """Implementación concreta de LegajoRepository usando SQLAlchemy."""

    def __init__(self, session: Session):
        self._session = session

    async def guardar(self, legajo: Legajo) -> Legajo:
        """Guardar un legajo en la base de datos."""
        from ...inscripcion.infrastructure.orm_models import LegajoModel, CohorteModel

        # Convertir dominio a modelo
        legajo_model = LegajoModel(
            id=legajo.id,
            numero_legajo=legajo.numero_legajo,
            cohorte_id=legajo.cohorte_id,
            dni=str(legajo.dni),
            apellido=legajo.apellido,
            nombre=legajo.nombre,
            email=str(legajo.email),
            tipo_carrera=legajo.tipo_carrera.valor,
            solicita_beca=legajo.solicita_beca,
            tipo_beca=legajo.tipo_beca,
            estado=legajo.estado.value,
            fecha_inscripcion=legajo.fecha_inscripcion,
            fecha_activacion=legajo.fecha_activacion,
            semaforo=legajo.semaforo,
            semaforo_manual=legajo.semaforo_manual,
        )

        self._session.add(legajo_model)
        await self._session.flush()
        return legajo

    async def obtener_por_dni(self, dni: str) -> Optional[Legajo]:
        """Obtener un legajo por su DNI. Único en cohorte activa."""
        from ...inscripcion.infrastructure.orm_models import LegajoModel

        result = await self._session.execute(
            select(LegajoModel).where(LegajoModel.dni == dni)
        )
        modelo = result.scalar_one_or_none()
        if modelo is None:
            return None
        return self._modelo_a_dominio(modelo)

    async def obtener_por_id(self, legajo_id: str) -> Optional[Legajo]:
        """Obtener un legajo por su ID."""
        from ...inscripcion.infrastructure.orm_models import LegajoModel

        result = await self._session.execute(
            select(LegajoModel).where(LegajoModel.id == legajo_id)
        )
        modelo = result.scalar_one_or_none()
        if modelo is None:
            raise LegajoNoEncontrado(legajo_id)
        return self._modelo_a_dominio(modelo)

    async def listar_por_cohorte_y_estado(
            self, cohorte_id: str, estado: EstadoLegajo
    ) -> list[Legajo]:
        """Listar legajos de una cohorte con un estado específico."""
        from ...inscripcion.infrastructure.orm_models import LegajoModel

        result = await self._session.execute(
            select(LegajoModel)
            .where(LegajoModel.cohorte_id == cohorte_id)
            .where(LegajoModel.estado == estado.value)
        )
        modelos = result.scalars().all()
        return [self._modelo_a_dominio(m) for m in modelos]

    async def listar_en_estado(self, estado: EstadoLegajo) -> list[Legajo]:
        """Listar todos los legajos en un estado dado."""
        from ...inscripcion.infrastructure.orm_models import LegajoModel

        result = await self._session.execute(
            select(LegajoModel).where(LegajoModel.estado == estado.value)
        )
        modelos = result.scalars().all()
        return [self._modelo_a_dominio(m) for m in modelos]

    async def actualizar_estado(
            self, legajo_id: str, nuevo_estado: EstadoLegajo, comentario: str = None
    ) -> Legajo:
        """Actualizar el estado de un legajo y registrar en auditoría."""
        from ...inscripcion.infrastructure.orm_models import LegajoModel, AuditoriaLegajoModel

        legajo_model = await self._session.get(LegajoModel, legajo_id)
        if legajo_model is None:
            raise LegajoNoEncontrado(legajo_id)

        # Guardar estado anterior para auditoría
        estado_anterior = legajo_model.estado

        # Actualizar estado
        legajo_model.estado = nuevo_estado.value

        # Registrar en auditoría (simplificado)
        # En un sistema completo, estoiría un modelo separado con usuario, timestamp, etc.
        from datetime import datetime
        auditoria = AuditoriaLegajoModel(
            id=uuid.uuid4(),
            legajo_id=legajo_id,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado.value,
            comentario=comentario,
            usuario_email="coordinador_sistema",  # Vendría del JWT en producción
            created_at=datetime.now(),
        )
        self._session.add(auditoria)

        # Retornar al dominio
        from ...inscripcion.domain.entities import Legajo as LegajoDom
        return LegajoDom(
            id=legajo_model.id,
            numero_legajo=legajo_model.numero_legajo,
            cohorte_id=legajo_model.cohorte_id,
            dni=LegajoDom.dni.__class__(legajo_model.dni),
            apellido=legajo_model.apellido,
            nombre=legajo_model.nombre,
            email=LegajoDom.email.__class__(legajo_model.email),
            tipo_carrera=TipoCarrera(legajo_model.tipo_carrera),
            solicita_beca=legajo_model.solicita_beca,
            estado=EstadoLegajo(legajo_model.estado),
            fecha_inscripcion=legajo_model.fecha_inscripcion,
            fecha_activacion=legajo_model.fecha_activacion,
            semaforo=legajo_model.semaforo,
            semaforo_manual=legajo_model.semaforo_manual,
        )

    async def existe_dni_en_cohorte(self, dni: str, cohorte_id: str) -> bool:
        """Verificar si ya existe un aspirante con ese DNI en la cohorte."""
        from ...inscripcion.infrastructure.orm_models import LegajoModel

        result = await self._session.execute(
            select(LegajoModel)
            .where(LegajoModel.dni == dni)
            .where(LegajoModel.cohorte_id == cohorte_id)
        )
        modelo = result.scalar_one_or_none()
        return modelo is not None

    def _modelo_a_dominio(self, modelo: object) -> Legajo:
        """Convertir modelo SQLAlchemy a entidad de dominio."""
        from ...inscripcion.domain.entities import Legajo, Aspirante, DNI, Email, TipoCarrera, EstadoLegajo

        dni_obj = DNI(modelo.dni)
        email_obj = Email(modelo.email)

        return Legajo(
            id=modelo.id,
            numero_legajo=modelo.numero_legajo,
            cohorte_id=str(modelo.cohorte_id) if modelo.cohorte_id else "",
            dni=dni_obj,
            apellido=modelo.apellido,
            nombre=modelo.nombre,
            email=email_obj,
            tipo_carrera=TipoCarrera(modelo.tipo_carrera),
            solicita_beca=modelo.solicita_beca,
            tipo_beca=modelo.tipo_beca,
            estado=EstadoLegajo(modelo.estado),
            fecha_inscripcion=modelo.fecha_inscripcion,
            fecha_activacion=modelo.fecha_activacion,
            semaforo=modelo.semaforo,
            semaforo_manual=modelo.semaforo_manual,
        )
