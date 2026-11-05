from typing import List
from src.inscripcion.domain.entities import Cohorte
from src.inscripcion.domain.repo import CohorteRepository

class ListarCohortesUseCase:
    def __init__(self, repository: CohorteRepository):
        self.repository = repository

    async def execute(self) -> List[Cohorte]:
        return await self.repository.get_all()