from datetime import date, datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import AsyncMock
import pytest
from src.acceso.services.service import AccesoService, AccesoError
from src.shared.security.tokens import hash_token

class FakeAccesoRepo:
    def __init__(self):
        self.cohorte = SimpleNamespace(id=uuid4())
        self.periodo = SimpleNamespace(id=uuid4(), cohorte_id=self.cohorte.id, fecha_abre=date.today()-timedelta(days=1), fecha_cierra=date.today()+timedelta(days=1))
        self.legajo = SimpleNamespace(id=uuid4())
        self.enlaces = {}
        self.sesiones = {}
        self.intentos = 0
    async def obtener_cohorte(self, _): return self.cohorte
    async def obtener_periodo(self, _): return self.periodo
    async def obtener_legajo(self, _): return self.legajo
    async def crear_enlace(self, enlace):
        if enlace.usos_realizados is None: enlace.usos_realizados = 0
        if enlace.revocado is None: enlace.revocado = False
        self.enlaces[enlace.token_hash] = enlace; return enlace
    async def obtener_enlace_hash(self, token_hash): return self.enlaces.get(token_hash)
    async def registrar_uso(self, enlace):
        enlace.usos_realizados += 1
        return True
    async def crear_sesion(self, sesion): self.sesiones[sesion.token_hash] = sesion; return sesion
    async def obtener_sesion(self, token_hash):
        sesion = self.sesiones.get(token_hash)
        return sesion if sesion and not sesion.revocada and sesion.expira_at > datetime.now(timezone.utc) else None
    async def obtener_enlace_id(self, enlace_id):
        return next((e for e in self.enlaces.values() if e.id == enlace_id), None)
    async def obtener_periodo(self, _): return self.periodo
    async def registrar_intento(self, _key, maximo):
        self.intentos += 1
        return self.intentos <= maximo
    async def revocar_sesion(self, token_hash):
        if token_hash in self.sesiones: self.sesiones[token_hash].revocada = True
    async def revocar(self, enlace_id):
        enlace = await self.obtener_enlace_id(enlace_id)
        if enlace: enlace.revocado = True
        return enlace

@pytest.fixture
def repo(): return FakeAccesoRepo()

@pytest.mark.asyncio
async def test_crear_enlace_inscripcion_exitoso(repo):
    result = await AccesoService(repo).crear_enlace(tipo="INSCRIPCION", cohorte_id=repo.cohorte.id, periodo_id=None, legajo_id=None, duracion_dias=7, usos_maximos=3, creado_por="coord@utn.edu.ar", frontend_url="http://localhost:5173/")
    assert result["tipo"] == "INSCRIPCION"
    assert result["url"].startswith("http://localhost:5173/inscripcion?token=")
    assert len(repo.enlaces) == 1

@pytest.mark.parametrize("kwargs", [
    {"tipo":"OTRO", "cohorte_id":None, "legajo_id":None, "duracion_dias":7, "usos_maximos":None},
    {"tipo":"INSCRIPCION", "cohorte_id":None, "legajo_id":None, "duracion_dias":7, "usos_maximos":None},
    {"tipo":"INSCRIPCION", "cohorte_id":uuid4(), "legajo_id":uuid4(), "duracion_dias":7, "usos_maximos":None},
    {"tipo":"SEGUIMIENTO", "cohorte_id":None, "legajo_id":None, "duracion_dias":7, "usos_maximos":None},
    {"tipo":"INSCRIPCION", "cohorte_id":uuid4(), "legajo_id":None, "duracion_dias":91, "usos_maximos":None},
    {"tipo":"INSCRIPCION", "cohorte_id":uuid4(), "legajo_id":None, "duracion_dias":7, "usos_maximos":10001},
])
@pytest.mark.asyncio
async def test_crear_enlace_rechaza_datos_invalidos(repo, kwargs):
    kwargs.update(periodo_id=None, creado_por="coord@utn.edu.ar", frontend_url="http://localhost")
    with pytest.raises(AccesoError): await AccesoService(repo).crear_enlace(**kwargs)

@pytest.mark.asyncio
async def test_validar_token_no_encontrado(repo):
    assert await AccesoService(repo).validar_token("no-existe") == {"valido": False, "tipo": None}

@pytest.mark.asyncio
async def test_intercambiar_token_crea_sesion_y_consumo(repo):
    result = await AccesoService(repo).crear_enlace(tipo="INSCRIPCION", cohorte_id=repo.cohorte.id, periodo_id=None, legajo_id=None, duracion_dias=1, usos_maximos=1, creado_por="c", frontend_url="http://localhost")
    raw = result["url"].split("token=")[1]
    session_token, enlace = await AccesoService(repo).intercambiar(raw)
    assert session_token and enlace.usos_realizados == 1
    assert hash_token(session_token) in repo.sesiones

@pytest.mark.asyncio
async def test_intercambiar_rechaza_enlace_vencido(repo):
    result = await AccesoService(repo).crear_enlace(tipo="INSCRIPCION", cohorte_id=repo.cohorte.id, periodo_id=None, legajo_id=None, duracion_dias=1, usos_maximos=None, creado_por="c", frontend_url="http://localhost")
    raw = result["url"].split("token=")[1]
    enlace = repo.enlaces[hash_token(raw)]
    enlace.expira_at = datetime.now(timezone.utc)-timedelta(seconds=1)
    with pytest.raises(AccesoError): await AccesoService(repo).intercambiar(raw)

@pytest.mark.asyncio
async def test_limite_solicitudes_rechaza_superado(repo):
    service = AccesoService(repo)
    await service.verificar_limite("127.0.0.1", "validar", maximo=1)
    with pytest.raises(AccesoError): await service.verificar_limite("127.0.0.1", "validar", maximo=1)

@pytest.mark.asyncio
async def test_crear_enlace_rechaza_periodo_de_otra_cohorte(repo):
    repo.periodo.cohorte_id = uuid4()
    with pytest.raises(AccesoError, match="pertenece a la cohorte"):
        await AccesoService(repo).crear_enlace(tipo="INSCRIPCION", cohorte_id=repo.cohorte.id, periodo_id=repo.periodo.id, legajo_id=None, duracion_dias=7, usos_maximos=None, creado_por="c", frontend_url="http://localhost")

@pytest.mark.asyncio
async def test_crear_enlace_seguimiento_exitoso(repo):
    result = await AccesoService(repo).crear_enlace(tipo="SEGUIMIENTO", cohorte_id=None, periodo_id=None, legajo_id=repo.legajo.id, duracion_dias=7, usos_maximos=None, creado_por="c", frontend_url="http://localhost")
    assert result["tipo"] == "SEGUIMIENTO"

@pytest.mark.asyncio
async def test_crear_enlace_seguimiento_rechaza_legajo_inexistente(repo):
    repo.obtener_legajo = AsyncMock(return_value=None)
    with pytest.raises(AccesoError, match="legajo indicado no existe"):
        await AccesoService(repo).crear_enlace(tipo="SEGUIMIENTO", cohorte_id=None, periodo_id=None, legajo_id=uuid4(), duracion_dias=7, usos_maximos=None, creado_por="c", frontend_url="http://localhost")

@pytest.mark.asyncio
async def test_validar_token_rechaza_vencido_revocado_y_agotado(repo):
    result = await AccesoService(repo).crear_enlace(tipo="INSCRIPCION", cohorte_id=repo.cohorte.id, periodo_id=None, legajo_id=None, duracion_dias=1, usos_maximos=1, creado_por="c", frontend_url="http://localhost")
    token = result["url"].split("token=")[1]
    enlace = repo.enlaces[hash_token(token)]
    enlace.revocado = True
    assert (await AccesoService(repo).validar_token(token))["valido"] is False
    enlace.revocado = False
    enlace.expira_at = datetime.now(timezone.utc)-timedelta(seconds=1)
    assert (await AccesoService(repo).validar_token(token))["valido"] is False
    enlace.expira_at = datetime.now(timezone.utc)+timedelta(days=1)
    enlace.usos_realizados = 1
    assert (await AccesoService(repo).validar_token(token))["valido"] is False

@pytest.mark.asyncio
async def test_intercambiar_rechaza_maximo_de_usos(repo):
    result = await AccesoService(repo).crear_enlace(tipo="INSCRIPCION", cohorte_id=repo.cohorte.id, periodo_id=None, legajo_id=None, duracion_dias=1, usos_maximos=1, creado_por="c", frontend_url="http://localhost")
    token = result["url"].split("token=")[1]
    repo.enlaces[hash_token(token)].usos_realizados = 1
    with pytest.raises(AccesoError, match="máximo de usos"):
        await AccesoService(repo).intercambiar(token)

@pytest.mark.asyncio
async def test_intercambiar_rechaza_si_registrar_uso_falla(repo):
    result = await AccesoService(repo).crear_enlace(tipo="INSCRIPCION", cohorte_id=repo.cohorte.id, periodo_id=None, legajo_id=None, duracion_dias=1, usos_maximos=None, creado_por="c", frontend_url="http://localhost")
    token = result["url"].split("token=")[1]
    repo.registrar_uso = AsyncMock(return_value=False)
    with pytest.raises(AccesoError, match="ya no está disponible"):
        await AccesoService(repo).intercambiar(token)

@pytest.mark.asyncio
async def test_obtener_contexto_rechaza_token_vacio_o_sesion_inexistente(repo):
    service = AccesoService(repo)
    assert await service.obtener_contexto("") is None
    assert await service.obtener_contexto("no-existe") is None

@pytest.mark.asyncio
async def test_obtener_contexto_rechaza_enlace_revocado(repo):
    result = await AccesoService(repo).crear_enlace(tipo="INSCRIPCION", cohorte_id=repo.cohorte.id, periodo_id=None, legajo_id=None, duracion_dias=1, usos_maximos=None, creado_por="c", frontend_url="http://localhost")
    raw = result["url"].split("token=")[1]
    session_token, enlace = await AccesoService(repo).intercambiar(raw)
    enlace.revocado = True
    assert await AccesoService(repo).obtener_contexto(session_token) is None

@pytest.mark.asyncio
async def test_obtener_contexto_rechaza_periodo_aun_no_abierto(repo):
    result = await AccesoService(repo).crear_enlace(tipo="INSCRIPCION", cohorte_id=repo.cohorte.id, periodo_id=repo.periodo.id, legajo_id=None, duracion_dias=1, usos_maximos=None, creado_por="c", frontend_url="http://localhost")
    raw = result["url"].split("token=")[1]
    session_token, _ = await AccesoService(repo).intercambiar(raw)
    repo.periodo.fecha_abre = date.today()+timedelta(days=1)
    assert await AccesoService(repo).obtener_contexto(session_token) is None

@pytest.mark.asyncio
async def test_obtener_contexto_devuelve_datos_validos(repo):
    result = await AccesoService(repo).crear_enlace(tipo="INSCRIPCION", cohorte_id=repo.cohorte.id, periodo_id=repo.periodo.id, legajo_id=None, duracion_dias=1, usos_maximos=None, creado_por="c", frontend_url="http://localhost")
    raw = result["url"].split("token=")[1]
    session_token, _ = await AccesoService(repo).intercambiar(raw)
    contexto = await AccesoService(repo).obtener_contexto(session_token)
    assert contexto["tipo"] == "INSCRIPCION"
    assert contexto["cohorte_id"] == repo.cohorte.id

@pytest.mark.asyncio
async def test_obtener_legajo_seguimiento_devuelve_legajo(repo):
    service = AccesoService(repo)
    service.obtener_contexto = AsyncMock(return_value={"tipo":"SEGUIMIENTO","legajo_id":repo.legajo.id})
    assert await service.obtener_legajo_seguimiento("s") is repo.legajo

@pytest.mark.asyncio
async def test_obtener_legajo_seguimiento_rechaza_tipo_incorrecto(repo):
    service = AccesoService(repo)
    service.obtener_contexto = AsyncMock(return_value={"tipo":"INSCRIPCION"})
    with pytest.raises(AccesoError): await service.obtener_legajo_seguimiento("s")

@pytest.mark.asyncio
async def test_cerrar_sesion_vacia_no_llama_repositorio(repo):
    await AccesoService(repo).cerrar_sesion("")
    assert not repo.sesiones

@pytest.mark.asyncio
async def test_revocar_enlace_inexistente(repo):
    repo.revocar = AsyncMock(return_value=None)
    with pytest.raises(AccesoError, match="no encontrado"):
        await AccesoService(repo).revocar(uuid4())
