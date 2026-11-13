from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import AsyncMock
import pytest
from src.inscripcion.application.service import LegajoService
from src.inscripcion.domain.exceptions import *

class FakeLegajoRepo:
    def __init__(self):
        self.cohorte = SimpleNamespace(id=uuid4(), anio=2026, nombre="Cohorte 1", inscripcion_abierta=True)
        self.legajo = SimpleNamespace(id=uuid4(), cohorte_id=self.cohorte.id, estado="EN_REVISION", usuario_id=None, email="alumno@ejemplo.com", numero_legajo=None)
        self.dni_duplicado = False
        self.auditorias = []
        self.creados = []
        self.guardar = AsyncMock(side_effect=lambda item: item)
        self.preparar_cuenta_estudiante = AsyncMock(return_value=None)
    async def obtener_cohorte(self, _): return self.cohorte
    async def existe_dni_en_cohorte(self, *_): return self.dni_duplicado
    async def crear(self, datos):
        values = dict(datos)
        values.update(id=uuid4(), usuario_id=None, numero_legajo=None, semaforo="VERDE", semaforo_manual=False, fecha_activacion=None, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
        item = SimpleNamespace(**values)
        self.creados.append(item); return item
    async def listar(self, *, offset, limit, filtros): return ([], 0)
    async def obtener_por_id(self, _): return self.legajo
    async def contar_numeros_legajo(self, _): return 4
    async def agregar_auditoria(self, **kwargs): self.auditorias.append(kwargs)

@pytest.fixture
def repo(): return FakeLegajoRepo()

@pytest.fixture
def datos_legajo(repo):
    return {"cohorte_id": repo.cohorte.id, "dni":"30456789", "apellido":"Pérez", "nombre":"Ana", "email":"ANA@EJEMPLO.COM", "email_alternativo":None, "telefono_movil":"2215551234", "domicilio_direccion":"Calle 1 123", "domicilio_ciudad":"La Plata", "domicilio_provincia":"Buenos Aires", "domicilio_pais":"Argentina", "titulo_grado":"Ingeniería", "titulo_posgrado":None, "tipo_carrera":"Especializacion", "carrera_elegida":"Sistemas", "motivacion":"Esta es una motivación suficientemente extensa para cumplir el mínimo requerido.", "solicita_beca":False, "tipo_beca":None}

@pytest.mark.asyncio
async def test_crear_legajo_exitoso_normaliza_datos(repo, datos_legajo):
    result = await LegajoService(repo).crear_legajo(datos_legajo, cohorte_autorizada=repo.cohorte.id)
    assert result.estado == "BORRADOR"
    assert result.dni == "30456789"
    assert result.email == "ana@ejemplo.com"

@pytest.mark.asyncio
async def test_crear_legajo_rechaza_cohorte_no_existente(repo, datos_legajo):
    repo.obtener_cohorte = AsyncMock(return_value=None)
    with pytest.raises(CohorteNoEncontrada): await LegajoService(repo).crear_legajo(datos_legajo, cohorte_autorizada=repo.cohorte.id)

@pytest.mark.asyncio
async def test_crear_legajo_requiere_enlace_de_cohorte(repo, datos_legajo):
    with pytest.raises(AccesoDenegado): await LegajoService(repo).crear_legajo(datos_legajo, cohorte_autorizada=None)

@pytest.mark.asyncio
async def test_crear_legajo_rechaza_inscripcion_cerrada(repo, datos_legajo):
    repo.cohorte.inscripcion_abierta = False
    with pytest.raises(InscripcionCerrada): await LegajoService(repo).crear_legajo(datos_legajo, cohorte_autorizada=repo.cohorte.id)

@pytest.mark.asyncio
async def test_crear_legajo_rechaza_dni_duplicado(repo, datos_legajo):
    repo.dni_duplicado = True
    with pytest.raises(ConflictoLegajo): await LegajoService(repo).crear_legajo(datos_legajo, cohorte_autorizada=repo.cohorte.id)

@pytest.mark.asyncio
async def test_listar_calcula_paginacion(repo):
    result = await LegajoService(repo).listar_legajos(page=2, limit=10, filtros={})
    assert result == {"data": [], "page": 2, "limit": 10, "total": 0, "pages": 0}

@pytest.mark.asyncio
async def test_obtener_legajo_rechaza_no_encontrado(repo):
    repo.obtener_por_id = AsyncMock(return_value=None)
    with pytest.raises(LegajoNoEncontrado): await LegajoService(repo).obtener_legajo(uuid4(), usuario_email="x", usuario_rol="COORDINADOR")

@pytest.mark.asyncio
async def test_obtener_legajo_restringe_a_no_titular(repo):
    with pytest.raises(AccesoDenegado): await LegajoService(repo).obtener_legajo(repo.legajo.id, usuario_email="x", usuario_rol="ESTUDIANTE")

@pytest.mark.asyncio
async def test_obtener_legajo_permite_coordinador(repo):
    assert await LegajoService(repo).obtener_legajo(repo.legajo.id, usuario_email="c", usuario_rol="COORDINADOR") is repo.legajo

@pytest.mark.asyncio
async def test_cambiar_estado_registra_auditoria(repo):
    legajo, token = await LegajoService(repo).cambiar_estado(repo.legajo.id, nuevo_estado="OBSERVADO", comentario="Falta documentación", usuario_email="coord@utn.edu.ar", usuario_rol="COORDINADOR")
    assert legajo.estado == "OBSERVADO"
    assert repo.auditorias[0]["estado_anterior"] == "EN_REVISION"
    assert token is None

@pytest.mark.asyncio
async def test_observar_exige_comentario(repo):
    with pytest.raises(ReglaNegocioInvalida): await LegajoService(repo).cambiar_estado(repo.legajo.id, nuevo_estado="OBSERVADO", comentario=" ", usuario_email="c", usuario_rol="COORDINADOR")

@pytest.mark.asyncio
async def test_cambiar_estado_rechaza_rol_no_coordinador(repo):
    with pytest.raises(AccesoDenegado): await LegajoService(repo).cambiar_estado(repo.legajo.id, nuevo_estado="OBSERVADO", comentario="Motivo", usuario_email="d", usuario_rol="DOCENTE")

@pytest.mark.asyncio
async def test_cambiar_estado_rechaza_transicion_invalida(repo):
    with pytest.raises(TransicionNoPermitida): await LegajoService(repo).cambiar_estado(repo.legajo.id, nuevo_estado="ACTIVO", comentario=None, usuario_email="c", usuario_rol="COORDINADOR")

@pytest.mark.asyncio
async def test_completar_genera_numero_de_legajo(repo):
    legajo, _ = await LegajoService(repo).cambiar_estado(repo.legajo.id, nuevo_estado="COMPLETADO", comentario=None, usuario_email="c", usuario_rol="COORDINADOR")
    assert legajo.numero_legajo == "26-001-005"

@pytest.mark.asyncio
async def test_activar_prepara_cuenta_estudiante(repo):
    repo.legajo.estado = "COMPLETADO"
    repo.preparar_cuenta_estudiante.return_value = "token-activacion"
    legajo, token = await LegajoService(repo).cambiar_estado(repo.legajo.id, nuevo_estado="ACTIVO", comentario=None, usuario_email="c", usuario_rol="COORDINADOR")
    assert legajo.estado == "ACTIVO"
    assert token == "token-activacion"
    repo.preparar_cuenta_estudiante.assert_awaited_once_with(legajo)
