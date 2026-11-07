"""Implementación PostgreSQL del repositorio usando SQLAlchemy async."""

from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.inscripcion.domain.exceptions import ConflictoLegajo
from app.inscripcion.infrastructure.orm_models import AuditoriaLegajo, Cohorte, Legajo
from app.usuarios.models import Usuario, InvitacionCuenta
from app.shared.security.tokens import generar_token, hash_token
from datetime import datetime, timedelta, timezone


class PostgresLegajoRepository:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def obtener_cohorte(self, cohorte_id: UUID) -> Cohorte | None:
        return await self._db.get(Cohorte, cohorte_id)

    async def existe_dni_en_cohorte(self, cohorte_id: UUID, dni: str) -> bool:
        result = await self._db.scalar(
            select(Legajo.id).where(Legajo.cohorte_id == cohorte_id, Legajo.dni == dni).limit(1)
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
        if usuario is not None and (usuario.rol != "ESTUDIANTE" or not usuario.activo):
            raise ConflictoLegajo("El email ya pertenece a una cuenta que no es de estudiante", "email")
        if usuario is None:
            usuario = Usuario(email=legajo.email.lower(), rol="ESTUDIANTE", activo=True)
            self._db.add(usuario)
            await self._db.flush()
        legajo.usuario_id = usuario.id
        if usuario.password_hash:
            return None
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
