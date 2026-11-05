from uuid import UUID
from src.inscripcion.domain.entities import Cohorte
from src.inscripcion.domain.repo import CohorteRepository

class GestionarInscripcionUseCase:
    def __init__(self, repository: CohorteRepository):
        self.repository = repository

    async def execute(self, cohorte_id: UUID, abierta: bool) -> Cohorte:
        cohorte = await self.repository.get_by_id(cohorte_id)
        if not cohorte:
            raise ValueError("Cohorte no encontrada")

        if abierta:
            cohorte.abrir_inscripcion()
        else:
            cohorte.cerrar_inscripcion()

        return await self.repository.update(cohorte)