from datetime import date, datetime, timedelta, timezone
from uuid import UUID
from src.acceso.models import EnlaceAcceso, SesionAcceso
from src.acceso.repositories.repository import AccesoRepository
from src.shared.security.tokens import generar_token, hash_token

class AccesoError(Exception): pass

class AccesoService:
    def __init__(self, repo: AccesoRepository): self.repo = repo

    async def verificar_limite(self, ip: str, accion: str, maximo: int = 10):
        permitido = await self.repo.registrar_intento(hash_token(f"{accion}:{ip}"), maximo)
        if not permitido: raise AccesoError("Se superó el límite de solicitudes. Intente nuevamente más tarde")

    async def crear_enlace(self, *, tipo: str, cohorte_id: UUID | None, periodo_id: UUID | None,
                           legajo_id: UUID | None, duracion_dias: int, usos_maximos: int | None,
                           creado_por: str, frontend_url: str):
        tipo = tipo.upper()
        if tipo not in {"INSCRIPCION", "SEGUIMIENTO"}: raise AccesoError("Tipo de enlace inválido")
        if duracion_dias < 1 or duracion_dias > 90: raise AccesoError("La vigencia debe ser de 1 a 90 días")
        if tipo == "INSCRIPCION" and (cohorte_id is None or legajo_id is not None):
            raise AccesoError("El enlace de inscripción requiere cohorte y no debe asociarse a un legajo")
        if tipo == "SEGUIMIENTO" and (legajo_id is None or cohorte_id is not None):
            raise AccesoError("El enlace de seguimiento requiere legajo y no debe asociarse a cohorte")
        if usos_maximos is not None and not 1 <= usos_maximos <= 10000: raise AccesoError("usos_maximos fuera de rango")
        if tipo == "INSCRIPCION":
            cohorte = await self.repo.obtener_cohorte(cohorte_id)
            if not cohorte: raise AccesoError("La cohorte indicada no existe")
            if periodo_id:
                periodo = await self.repo.obtener_periodo(periodo_id)
                if not periodo or periodo.cohorte_id != cohorte_id:
                    raise AccesoError("El período no pertenece a la cohorte indicada")
        if tipo == "SEGUIMIENTO" and not await self.repo.obtener_legajo(legajo_id):
            raise AccesoError("El legajo indicado no existe")
        token = generar_token()
        expira = datetime.now(timezone.utc) + timedelta(days=duracion_dias)
        enlace = EnlaceAcceso(token_hash=hash_token(token), tipo=tipo, cohorte_id=cohorte_id,
            periodo_id=periodo_id, legajo_id=legajo_id, expira_at=expira,
            usos_maximos=usos_maximos, creado_por=creado_por)
        await self.repo.crear_enlace(enlace)
        ruta = ""
        if tipo == "INSCRIPCION":
            ruta = "inscripcion"
        else:
            ruta = "consultar"
        return {"id": enlace.id, "tipo": tipo, "expira_at": expira,
                "url": f"{frontend_url.rstrip('/')}/{ruta}?token={token}"}

    async def validar_token(self, token: str):
        enlace = await self.repo.obtener_enlace_hash(hash_token(token))
        ahora = datetime.now(timezone.utc)
        valido = bool(enlace and not enlace.revocado and enlace.expira_at > ahora
                      and (enlace.usos_maximos is None or enlace.usos_realizados < enlace.usos_maximos))
        return {"valido": valido, "tipo": enlace.tipo if valido else None}

    async def obtener_legajo_seguimiento(self, session_token: str):
        contexto = await self.obtener_contexto(session_token)
        if not contexto or contexto["tipo"] != "SEGUIMIENTO":
            raise AccesoError("Se requiere un enlace de seguimiento válido")
        legajo = await self.repo.obtener_legajo(contexto["legajo_id"])
        if not legajo: raise AccesoError("Legajo no encontrado")
        return legajo

    async def intercambiar(self, token: str):
        enlace = await self.repo.obtener_enlace_hash(hash_token(token))
        ahora = datetime.now(timezone.utc)
        if not enlace or enlace.revocado or enlace.expira_at <= ahora:
            raise AccesoError("El enlace no existe, venció o fue revocado")
        if enlace.usos_maximos is not None and enlace.usos_realizados >= enlace.usos_maximos:
            raise AccesoError("El enlace alcanzó el máximo de usos")
        if not await self.repo.registrar_uso(enlace): raise AccesoError("El enlace ya no está disponible")
        session_token = generar_token()
        sesion = SesionAcceso(enlace_id=enlace.id, token_hash=hash_token(session_token),
                              expira_at=min(enlace.expira_at, ahora + timedelta(hours=2)))
        await self.repo.crear_sesion(sesion)
        return session_token, enlace

    async def obtener_contexto(self, session_token: str):
        if not session_token: return None
        sesion = await self.repo.obtener_sesion(hash_token(session_token))
        if not sesion: return None
        enlace = await self.repo.obtener_enlace_id(sesion.enlace_id)
        if not enlace or enlace.revocado or enlace.expira_at <= datetime.now(timezone.utc): return None
        if enlace.periodo_id:
            periodo = await self.repo.obtener_periodo(enlace.periodo_id)
            hoy = date.today()
            if not periodo or periodo.fecha_abre > hoy or (periodo.fecha_cierra and periodo.fecha_cierra < hoy):
                return None
        return {"tipo": enlace.tipo, "cohorte_id": enlace.cohorte_id,
                "periodo_id": enlace.periodo_id, "legajo_id": enlace.legajo_id}

    async def cerrar_sesion(self, session_token: str):
        if session_token:
            await self.repo.revocar_sesion(hash_token(session_token))

    async def revocar(self, enlace_id: UUID):
        enlace = await self.repo.revocar(enlace_id)
        if not enlace: raise AccesoError("Enlace no encontrado")
        return enlace
