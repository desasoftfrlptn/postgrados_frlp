from src.inscripcion.domain.entities import Cohorte
from src.inscripcion.domain.repo import CohorteRepository

class CrearCohorteUseCase:
    def __init__(self, repository: CohorteRepository):
        self.repository = repository

    async def execute(self, anio: int, nombre: str, fecha_inicio=None) -> Cohorte:
        nueva_cohorte = Cohorte(
            id=None,
            anio=anio,
            nombre=nombre,
            abierta=False,
            fecha_inicio=fecha_inicio
        )
        return await self.repository.create(nueva_cohorte)