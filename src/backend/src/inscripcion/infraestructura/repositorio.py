
from uuid import UUID

from sqlalchemy import (
    func,
    or_,
    select,
    update,
)
from sqlalchemy.ext.asyncio import AsyncSession

from src.inscripcion.puertos import (
    LegajoRepositorio,
)
from src.inscripcion.infraestructura.orm_modelos import (
    LegajoORM,
)
from src.inscripcion.infraestructura.documentos_modelos import (
    DocumentoLegajoORM,
)
from src.inscripcion.presentacion.esquemas import (
    LegajoCrear,
)


class LegajoRepositorioPostgres(LegajoRepositorio):

    def __init__(
        self,
        session: AsyncSession,
    ):
        self.session = session

    async def existe_por_email_o_dni(
        self,
        email: str,
        dni: str,
    ) -> bool:
        query = select(
            LegajoORM
        ).where(
            or_(
                LegajoORM.correo_electronico == email,
                LegajoORM.dni_pasaporte == dni,
            )
        )

        resultado = await self.session.execute(
            query
        )

        return (
            resultado.scalars().first()
            is not None
        )


    async def obtener_por_email_o_dni(
        self,
        email: str,
        dni: str,
    ) -> LegajoORM | None:
        """
        Obtiene un legajo únicamente cuando el correo
        y el DNI corresponden al usuario autenticado.
        """

        consulta = select(LegajoORM).where(
            LegajoORM.correo_electronico == email,
            LegajoORM.dni_pasaporte == dni,
        )

        resultado = await self.session.execute(consulta)

        return resultado.scalars().first()


    async def guardar(
        self,
        datos: LegajoCrear,
    ) -> LegajoORM:
        nuevo_legajo = LegajoORM(
            carrera_elegida=datos.carrera_elegida,
            apellido=datos.apellido,
            nombre=datos.nombre,
            nacionalidad=datos.nacionalidad,
            dni_pasaporte=datos.dni_pasaporte,
            telefono_movil=datos.telefono_movil,
            correo_electronico=datos.correo_electronico,
            correo_alternativo=datos.correo_alternativo,
            domicilio=datos.domicilio,
            pais=datos.pais,
            provincia=datos.provincia,
            ciudad=datos.ciudad,
            titulo_anterior=datos.titulo_anterior,
            universidad_anterior=datos.universidad_anterior,
            estado="PENDIENTE",
        )

        self.session.add(nuevo_legajo)

        await self.session.commit()

        await self.session.refresh(
            nuevo_legajo
        )

        return nuevo_legajo


    async def existe_por_email(
        self,
        email: str,
    ) -> bool:
        consulta = select(LegajoORM.id).where(
            LegajoORM.correo_electronico == email.strip()
        )

        resultado = await self.session.execute(consulta)

        return resultado.scalar_one_or_none() is not None

    async def existe_dni_en_cohorte(
        self,
        dni: str,
        cohorte_id: UUID,
    ) -> bool:
        consulta = select(LegajoORM.id).where(
            LegajoORM.dni_pasaporte == dni.strip(),
            LegajoORM.cohorte_id == cohorte_id,
        )

        resultado = await self.session.execute(consulta)

        return resultado.scalar_one_or_none() is not None

    async def contar_legajos_por_cohorte(
        self,
        cohorte_id: UUID,
    ) -> int:
        consulta = select(func.count(LegajoORM.id)).where(
            LegajoORM.cohorte_id == cohorte_id
        )

        resultado = await self.session.execute(consulta)

        return resultado.scalar_one()


    async def listar_legajos(
        self,
        dni: str | None = None,
        apellido: str | None = None,
        carrera: str | None = None,
        estado: str | None = None,
        cohorte_id: UUID | None = None,
    ) -> list[LegajoORM]:
        """
        Lista los legajos registrados
        aplicando los filtros recibidos.
        """

        consulta = select(LegajoORM)

        if cohorte_id is not None:
            consulta = consulta.where(
                LegajoORM.cohorte_id == cohorte_id
            )
        if dni and dni.strip():
            consulta = consulta.where(
                LegajoORM.dni_pasaporte == dni.strip()
            )

        if apellido and apellido.strip():
            consulta = consulta.where(
                LegajoORM.apellido.ilike(
                    f"%{apellido.strip()}%"
                )
            )

        if carrera and carrera.strip():
            consulta = consulta.where(
                LegajoORM.carrera_elegida == carrera.strip()
            )

        if estado and estado.strip():
            consulta = consulta.where(
                LegajoORM.estado == estado.strip().upper()
            )

        consulta = consulta.order_by(
            LegajoORM.apellido,
            LegajoORM.nombre,
        )

        resultado = await self.session.execute(
            consulta
        )

        return list(
            resultado.scalars().all()
        )

    async def obtener_por_id(
        self,
        legajo_id: UUID,
    ) -> LegajoORM | None:
        """
        Obtiene un legajo por su identificador.
        """

        consulta = select(LegajoORM).where(
            LegajoORM.id == legajo_id
        )

        resultado = await self.session.execute(
            consulta
        )

        return resultado.scalars().first()


    async def listar_documentos_por_legajo(
        self,
        legajo_id: UUID,
    ) -> list[DocumentoLegajoORM]:
        """
        Consulta los documentos asociados a un legajo.
        No descarga ni expone los archivos.
        """

        consulta = (
            select(DocumentoLegajoORM)
            .where(
                DocumentoLegajoORM.legajo_id == legajo_id
            )
            .order_by(
                DocumentoLegajoORM.fecha,
                DocumentoLegajoORM.tipo,
            )
        )

        resultado = await self.session.execute(
            consulta
        )

        return list(
            resultado.scalars().all()
        )

    async def actualizar_estado_legajo(
        self,
        legajo_id: UUID,
        estado_actual: str,
        estado_nuevo: str,
    ) -> LegajoORM | None:
        """
        Actualiza el estado solo si todavía coincide
        con el estado anterior esperado.

        Devuelve None cuando no se pudo actualizar.

        La validación de roles y transiciones debe
        realizarse previamente en la aplicación.
        """

        consulta = (
            update(LegajoORM)
            .where(
                LegajoORM.id == legajo_id,
                LegajoORM.estado == estado_actual,
            )
            .values(
                estado=estado_nuevo,
            )
            .returning(
                LegajoORM.id,
            )
        )

        resultado = await self.session.execute(
            consulta
        )

        identificador_actualizado = (
            resultado.scalar_one_or_none()
        )

        if identificador_actualizado is None:
            return None

        await self.session.commit()

        return await self.obtener_por_id(
            identificador_actualizado
        )
