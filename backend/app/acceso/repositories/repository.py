from datetime import datetime, timedelta, timezone
from uuid import UUID
from sqlalchemy import case, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from app.acceso.models import EnlaceAcceso, SesionAcceso, LimiteSolicitud
from app.inscripcion.infrastructure.orm_models import Cohorte, PeriodoInscripcion

class AccesoRepository:
    def __init__(self, db: AsyncSession): self.db = db

    async def registrar_intento(self, key_hash: str, maximo: int = 10) -> bool:
        ahora = datetime.now(timezone.utc)
        limite = ahora - timedelta(hours=1)
        stmt = insert(LimiteSolicitud).values(key_hash=key_hash, window_start=ahora, attempts=1)
        stmt = stmt.on_conflict_do_update(
            index_elements=[LimiteSolicitud.key_hash],
            set_={
                "window_start": case((LimiteSolicitud.window_start <= limite, ahora), else_=LimiteSolicitud.window_start),
                "attempts": case((LimiteSolicitud.window_start <= limite, 1), else_=LimiteSolicitud.attempts + 1),
            },
        ).returning(LimiteSolicitud.attempts)
        intentos = (await self.db.execute(stmt)).scalar_one()
        await self.db.commit()
        return intentos <= maximo

    async def obtener_cohorte(self, cohorte_id: UUID): return await self.db.get(Cohorte, cohorte_id)

    async def obtener_periodo(self, periodo_id: UUID): return await self.db.get(PeriodoInscripcion, periodo_id)

    async def obtener_legajo(self, legajo_id: UUID):
        from app.inscripcion.infrastructure.orm_models import Legajo
        return await self.db.get(Legajo, legajo_id)

    async def obtener_enlace_hash(self, token_hash: str):
        return await self.db.scalar(select(EnlaceAcceso).where(EnlaceAcceso.token_hash == token_hash))

    async def registrar_uso(self, enlace: EnlaceAcceso) -> bool:
        stmt = update(EnlaceAcceso).where(
            EnlaceAcceso.id == enlace.id, EnlaceAcceso.revocado.is_(False),
            EnlaceAcceso.expira_at > datetime.now().astimezone(),
            (EnlaceAcceso.usos_maximos.is_(None) | (EnlaceAcceso.usos_realizados < EnlaceAcceso.usos_maximos)),
        ).values(usos_realizados=EnlaceAcceso.usos_realizados + 1).returning(EnlaceAcceso.id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def crear_enlace(self, enlace: EnlaceAcceso):
        self.db.add(enlace); await self.db.commit(); await self.db.refresh(enlace); return enlace

    async def crear_sesion(self, sesion: SesionAcceso):
        self.db.add(sesion); await self.db.commit(); await self.db.refresh(sesion); return sesion

    async def obtener_sesion(self, token_hash: str):
        return await self.db.scalar(select(SesionAcceso).where(
            SesionAcceso.token_hash == token_hash, SesionAcceso.revocada.is_(False),
            SesionAcceso.expira_at > datetime.now().astimezone()))

    async def revocar_sesion(self, token_hash: str):
        await self.db.execute(update(SesionAcceso).where(SesionAcceso.token_hash == token_hash).values(revocada=True))
        await self.db.commit()

    async def obtener_enlace_id(self, enlace_id: UUID): return await self.db.get(EnlaceAcceso, enlace_id)

    async def revocar(self, enlace_id: UUID):
        enlace = await self.db.get(EnlaceAcceso, enlace_id)
        if enlace is None: return None
        enlace.revocado = True
        await self.db.execute(update(SesionAcceso).where(SesionAcceso.enlace_id == enlace_id).values(revocada=True))
        await self.db.commit(); return enlace
