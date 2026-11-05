from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from src.inscripcion.domain.entities import Cohorte

class CohorteRepository(ABC):

    @abstractmethod
    async def get_all(self) -> List[Cohorte]:
        pass

    @abstractmethod
    async def get_by_id(self, cohorte_id: UUID) -> Optional[Cohorte]:
        pass

    @abstractmethod
    async def create(self, cohorte: Cohorte) -> Cohorte:
        pass

    @abstractmethod
    async def update(self, cohorte: Cohorte) -> Cohorte:
        pass