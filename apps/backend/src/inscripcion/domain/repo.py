from typing import Optional
from .entities import Aspirante, Legajo, EstadoLegajo, TipoCarrera


class LegajoRepository:
    """Interfaz abstracta para el repositorio de legajos.
    
    La implementación concreta vive en infrastructure/ (usa SQLAlchemy).
    Esta interfaz define el contrato que la capa de aplicación depende.
    Ningún otro módulo debe importar de SQLAlchemy directamente.
    """

    async def guardar(self, legajo: Legajo) -> Legajo:
        """Guardar un legajo en la base de datos. Debe implementarse en infrastructure/pg_repository.py."""
        raise NotImplementedError("Implementar en pg_repository.py")

    async def obtener_por_dni(self, dni: str) -> Optional[Legajo]:
        """Obtener un legajo por su DNI. Único en cohorte activa."""
        raise NotImplementedError("Implementar en pg_repository.py")

    async def obtener_por_id(self, legajo_id: str) -> Optional[Legajo]:
        """Obtener un legajo por su ID."""
        raise NotImplementedError("Implementar en pg_repository.py")

    async def listar_por_cohorte_y_estado(
            self, cohorte_id: str, estado: EstadoLegajo
    ) -> list[Legajo]:
        """Listar legajos de una cohorte con un estado específico."""
        raise NotImplementedError("Implementar en pg_repository.py")

    async def listar_en_estado(self, estado: EstadoLegajo) -> list[Legajo]:
        """Listar todos los legajos en un estado dado."""
        raise NotImplementedError("Implementar en pg_repository.py")

    async def actualizar_estado(
            self, legajo_id: str, nuevo_estado: EstadoLegajo, comentario: Optional[str] = None
    ) -> Legajo:
        """Actualizar el estado de un legajo y registrar en auditoría."""
        raise NotImplementedError("Implementar en pg_repository.py")

    async def existe_dni_en_cohorte(self, dni: str, cohorte_id: str) -> bool:
        """Verificar si ya existe un aspirante con ese DNI en la cohorte."""
        raise NotImplementedError("Implementar en pg_repository.py")
