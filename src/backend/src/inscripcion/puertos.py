from abc import ABC, abstractmethod
from typing import Any
from uuid import UUID

from src.inscripcion.presentacion.esquemas import (
    LegajoCrear,
)


class LegajoRepositorio(ABC):

    @abstractmethod
    async def existe_por_email_o_dni(
        self,
        email: str,
        dni: str,
    ) -> bool:
        """
        Verifica si ya existe un aspirante
        con el mismo correo o documento.
        """
        pass

    @abstractmethod
    async def guardar(
        self,
        datos: LegajoCrear,
    ) -> Any:
        """
        Guarda un nuevo legajo.
        """
        pass

    @abstractmethod
    async def listar_legajos(
        self,
        dni: str | None = None,
        apellido: str | None = None,
        carrera: str | None = None,
        estado: str | None = None,
        cohorte_id: UUID | None = None,
    ) -> list[Any]:
        """
        Consulta los legajos registrados
        y permite combinar filtros.
        """
        pass

    @abstractmethod
    async def obtener_por_id(
        self,
        legajo_id: UUID,
    ) -> Any | None:
        """
        Busca un legajo por su identificador.
        Devuelve None si no existe.
        """
        pass
    
    @abstractmethod
    async def obtener_por_email_o_dni(
        self, email: str, dni: str) -> Any | None:
        pass    
