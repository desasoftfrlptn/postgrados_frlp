from datetime import date
from uuid import UUID

from src.inscripcion.infrastructure.orm_models import PeriodoInscripcion
from src.inscripcion.domain.repository_periodos import PeriodoRepository


class PeriodoError(Exception):
    pass


class CohorteNoEncontrada(PeriodoError):
    pass


class PeriodoNoEncontrado(PeriodoError):
    pass


class FechasPeriodoInvalidas(PeriodoError):
    pass


class PeriodoService:
    def __init__(self, repository: PeriodoRepository):
        self._repository = repository

    async def vigente(self):
        resultado = await self._repository.obtener_vigente(date.today())
        if resultado is None:
            return {"abierto": False, "periodo": None, "cohorte_id": None}

        periodo, cohorte_id = resultado
        return {
            "abierto": True,
            "periodo": {
                "fecha_abre": periodo.fecha_abre,
                "fecha_cierra": periodo.fecha_cierra,
            },
            "cohorte_id": cohorte_id,
        }

    async def listar(self, cohorte_id: UUID):
        if await self._repository.obtener_cohorte(cohorte_id) is None:
            raise CohorteNoEncontrada("La cohorte indicada no existe")
        return await self._repository.listar_por_cohorte(cohorte_id)

    async def crear(self, cohorte_id: UUID, *, fecha_abre: date, fecha_cierra: date | None):
        if await self._repository.obtener_cohorte(cohorte_id) is None:
            raise CohorteNoEncontrada("La cohorte indicada no existe")
        self._validar_fechas(fecha_abre, fecha_cierra)
        periodo = PeriodoInscripcion(
            cohorte_id=cohorte_id,
            fecha_abre=fecha_abre,
            fecha_cierra=fecha_cierra,
        )
        return await self._repository.crear(periodo)

    async def actualizar(self, periodo_id: UUID, *, fecha_cierra: date | None):
        periodo = await self._repository.obtener(periodo_id)
        if periodo is None:
            raise PeriodoNoEncontrado("El período indicado no existe")
        self._validar_fechas(periodo.fecha_abre, fecha_cierra)
        periodo.fecha_cierra = fecha_cierra
        return await self._repository.guardar(periodo)

    @staticmethod
    def _validar_fechas(fecha_abre: date, fecha_cierra: date | None):
        if fecha_cierra is not None and fecha_cierra < fecha_abre:
            raise FechasPeriodoInvalidas(
                "La fecha de cierre no puede ser anterior a la fecha de apertura"
            )
