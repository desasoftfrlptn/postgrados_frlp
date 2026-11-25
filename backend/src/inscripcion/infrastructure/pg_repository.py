"""Implementación PostgreSQL del repositorio usando SQLAlchemy async."""

from typing import Any, List, Optional
from uuid import UUID

from sqlalchemy import and_, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.inscripcion.domain.exceptions import ConflictoLegajo
from src.inscripcion.infrastructure.orm_models import AuditoriaLegajo, Cohorte, Legajo
from src.shared.auth.orm_models import Usuario, InvitacionCuenta
from src.shared.security.tokens import generar_token, hash_token
from src.shared.auth.passwords import hash_contrasena
from datetime import datetime, timedelta, timezone

from src.inscripcion.domain.repository import CohorteRepository

class PostgresLegajoRepository:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def obtener_cohorte(self, cohorte_id: UUID) -> Cohorte | None:
        return await self._db.get(Cohorte, cohorte_id)

    async def existe_dni_en_cohorte(self, cohorte_id: UUID, dni: str) -> bool:
        result = await self._db.scalar(
            select(Legajo.id).where(Legajo.cohorte_id == cohorte_id, Legajo.dni == dni).limit(2) # dni puede aparecer hasta 2 veces en una cohorte
        )
        return result is not None

    async def crear(self, datos: dict[str, Any]) -> Legajo:
        legajo = Legajo(**datos)
        self._db.add(legajo)
        return await self.guardar(legajo)

    async def listar(self, *, offset: int, limit: int,
                     filtros: dict[str, Any]) -> tuple[list[Legajo], int]:
        condiciones = []
        if filtros.get("estado"):
            condiciones.append(Legajo.estado == filtros["estado"])
        if filtros.get("cohorte_id"):
            condiciones.append(Legajo.cohorte_id == filtros["cohorte_id"])
        if filtros.get("tipo_carrera"):
            condiciones.append(Legajo.tipo_carrera == filtros["tipo_carrera"])
        if filtros.get("solicita_beca") is not None:
            condiciones.append(Legajo.solicita_beca == filtros["solicita_beca"])
        if filtros.get("dni"):
            condiciones.append(Legajo.dni.ilike(f'%{filtros["dni"]}%'))
        if filtros.get("apellido"):
            condiciones.append(func.unaccent(Legajo.apellido).ilike(f'%{filtros["apellido"]}%'))

        total = await self._db.scalar(
            select(func.count()).select_from(Legajo).where(*condiciones)
        ) or 0
        result = await self._db.scalars(
            select(Legajo).where(*condiciones)
            .order_by(Legajo.created_at.desc())
            .offset(offset).limit(limit)
        )
        return list(result), int(total)

    async def obtener_por_id(self, legajo_id: UUID) -> Legajo | None:
        return await self._db.get(Legajo, legajo_id)

    async def contar_numeros_legajo(self, cohorte_id: UUID) -> int:
        return int(await self._db.scalar(
            select(func.count(Legajo.id)).where(
                Legajo.cohorte_id == cohorte_id,
                Legajo.numero_legajo.is_not(None),
            )
        ) or 0)

    async def agregar_auditoria(self, *, legajo_id: UUID, estado_anterior: str | None,
                                estado_nuevo: str, comentario: str | None,
                                usuario_email: str | None) -> None:
        self._db.add(AuditoriaLegajo(
            legajo_id=legajo_id,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_nuevo,
            comentario=comentario,
            usuario_email=usuario_email,
        ))

    async def preparar_cuenta_estudiante(self, legajo: Legajo) -> str | None:
        """Vincula una cuenta al activar el legajo y genera invitación de primer acceso."""
        usuario = await self._db.scalar(select(Usuario).where(Usuario.email == legajo.email.lower()))
        if usuario is not None and (usuario.rol != "estudiante" or not usuario.activo):
            raise ConflictoLegajo("El email ya pertenece a una cuenta que no es de estudiante", "email")
        if usuario is None:
            nom = legajo.nombre
            ap = legajo.apellido
            usuario = Usuario(email=legajo.email.lower(), rol="estudiante", activo=True, nombre=f"{nom} {ap}", password_hash=hash_contrasena("Cambiame2026!"))
            self._db.add(usuario)
            await self._db.flush()
        legajo.usuario_id = usuario.id
        ahora = datetime.now(timezone.utc)
        await self._db.execute(update(InvitacionCuenta).where(
            InvitacionCuenta.usuario_id == usuario.id, InvitacionCuenta.usada_at.is_(None)
        ).values(usada_at=ahora))
        token = generar_token()
        self._db.add(InvitacionCuenta(
            usuario_id=usuario.id,
            token_hash=hash_token(token),
            expira_at=ahora + timedelta(minutes=30),
        ))
        return token

    async def guardar(self, legajo: Legajo) -> Legajo:
        try:
            await self._db.commit()
            await self._db.refresh(legajo)
        except IntegrityError as exc:
            await self._db.rollback()
            raise ConflictoLegajo(
                "Ya existe un legajo con ese email o número de legajo", "email"
            ) from exc
        return legajo

class PostgresCohorteRepository(CohorteRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def obtener(self) -> List[Cohorte]:
        result = await self.session.execute(select(Cohorte))
        return list(result.scalars().all())

    async def obtener_por_id(self, cohorte_id: UUID) -> Optional[Cohorte]:
        result = await self.session.execute(
            select(Cohorte).where(Cohorte.id == cohorte_id)
        )
        return result.scalar_one_or_none()

    async def crear(self, datos: dict[str, Any]) -> Cohorte:
        db_model = Cohorte(**datos)
        self.session.add(db_model)
        await self.session.commit()
        await self.session.refresh(db_model)
        return db_model

    async def modificar(self, cohorte: Cohorte) -> Cohorte:
        await self.session.commit()
        await self.session.refresh(cohorte)
        return cohorte
    async def estadisticas(self, tipo_carrera: str | None = None) -> list[dict[str, Any]]:
        # El filtro va en el JOIN para conservar cohortes sin inscriptos con contadores en cero.
        condiciones = [Legajo.cohorte_id == Cohorte.id]
        if tipo_carrera is not None:
            condiciones.append(Legajo.tipo_carrera == tipo_carrera)
        query = (
            select(
                Cohorte.id.label("cohorte_id"), Cohorte.nombre.label("cohorte_nombre"), Cohorte.anio,
                func.count(Legajo.id).filter(Legajo.estado != "BORRADOR").label("total_inscriptos"),
                func.count(Legajo.id).filter(Legajo.estado == "ACTIVO").label("activos"),
                func.count(Legajo.id).filter(Legajo.estado == "GRADUADO").label("graduados"),
                func.count(Legajo.id).filter(Legajo.semaforo == "ROJO").label("en_riesgo"),
                func.count(Legajo.id).filter(Legajo.estado == "BAJA").label("dados_de_baja"),
            )
            .outerjoin(Legajo, and_(*condiciones))
            .group_by(Cohorte.id, Cohorte.nombre, Cohorte.anio, Cohorte.created_at)
            .order_by(Cohorte.anio.desc(), Cohorte.created_at.desc(), Cohorte.id.desc())
            .limit(3)
        )
        return [dict(row) for row in (await self.session.execute(query)).mappings()]

    async def desgranamiento(self) -> list[dict[str, Any]]:
        cohortes_result = await self.session.execute(
            select(Cohorte)
            .order_by(Cohorte.anio.desc(), Cohorte.created_at.desc())
            .limit(3)
        )
        cohortes = list(cohortes_result.scalars().all())

        resultado = []

        for cohorte in reversed(cohortes):
            total_inscriptos = int(await self.session.scalar(
                select(func.count(Legajo.id)).where(
                    Legajo.cohorte_id == cohorte.id,
                    Legajo.estado != "BORRADOR",
                )
            ) or 0)

            bajas_por_semestre = [0, 0, 0, 0, 0, 0]

            if cohorte.fecha_inicio:
                auditorias = await self.session.execute(
                    select(AuditoriaLegajo.created_at)
                    .join(Legajo, Legajo.id == AuditoriaLegajo.legajo_id)
                    .where(
                        Legajo.cohorte_id == cohorte.id,
                        AuditoriaLegajo.estado_nuevo == "BAJA",
                    )
                )

                for (fecha_baja,) in auditorias:
                    meses = (
                        (fecha_baja.year - cohorte.fecha_inicio.year) * 12
                        + fecha_baja.month - cohorte.fecha_inicio.month
                    )

                    if meses >= 0:
                        semestre = meses // 6
                        if semestre < 6:
                            bajas_por_semestre[semestre] += 1

            resultado.append({
                "cohorte_id": str(cohorte.id),
                "cohorte_nombre": cohorte.nombre,
                "anio": cohorte.anio,
                "total_inscriptos": total_inscriptos,
                "bajas_por_semestre": bajas_por_semestre,
                "en_curso": cohorte.anio == datetime.now().year,
            })

        return resultado