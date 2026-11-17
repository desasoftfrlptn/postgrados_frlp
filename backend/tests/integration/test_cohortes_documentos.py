"""Pruebas HTTP con PostgreSQL, en un esquema aislado por caso."""
import io
import os
from datetime import datetime, timezone
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from pypdf import PdfReader, PdfWriter
from sqlalchemy import func, select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.schema import CreateSchema, DropSchema

from src.main import app
from src.shared.database.connection import Base, DB_SCHEMA
from src.shared.database.session import get_db
from src.shared.auth.jwt import crear_token_acceso
from src.shared.auth.orm_models import Usuario
from src.inscripcion.infrastructure.orm_models import AuditoriaLegajo, Cohorte, Legajo
from src.gestion_documental.infrastructure.orm_models import Documento
from src.gestion_documental.infrastructure import storage
from src.gestion_documental.application import services

pytestmark = [pytest.mark.asyncio, pytest.mark.integration]


@pytest_asyncio.fixture
async def entorno(monkeypatch, tmp_path):
    valor = os.getenv("TEST_DATABASE_URL")
    if not valor:
        pytest.skip("Requiere TEST_DATABASE_URL apuntando a fenix_postgrado_test")
    url = make_url(valor)
    if url.database != "fenix_postgrado_test" or url.query:
        pytest.fail("La base debe ser fenix_postgrado_test, sin parametros")
    schema = "test_api_" + uuid4().hex
    engine = create_async_engine(url.set(drivername="postgresql+asyncpg"),
        execution_options={"schema_translate_map": {DB_SCHEMA: schema}})
    monkeypatch.setenv("JWT_SECRET", "secreto-exclusivo-de-pruebas-api-1234567890")
    monkeypatch.setattr(storage, "STORAGE_ROOT", tmp_path)
    monkeypatch.setattr(services, "STORAGE_ROOT", tmp_path)
    # El antivirus se prueba por separado y en la verificacion real con ClamAV.
    monkeypatch.setattr(storage, "analizar_con_antivirus", lambda _: None)
    try:
        async with engine.begin() as conn:
            await conn.execute(CreateSchema(schema))
            await conn.run_sync(Base.metadata.create_all)
        async with AsyncSession(engine, expire_on_commit=False) as db:
            async def override_db():
                yield db
            anterior = app.dependency_overrides.get(get_db)
            app.dependency_overrides[get_db] = override_db
            try:
                async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test/api/v1") as client:
                    yield client, db, tmp_path
            finally:
                if anterior is None:
                    app.dependency_overrides.pop(get_db, None)
                else:
                    app.dependency_overrides[get_db] = anterior
    finally:
        try:
            async with engine.begin() as conn:
                await conn.execute(DropSchema(schema, cascade=True, if_exists=True))
        finally:
            await engine.dispose()


async def usuario(db, rol="coordinador"):
    obj = Usuario(id=uuid4(), nombre="Usuario de prueba", email=f"{uuid4().hex}@example.com",
                  password_hash="sin-login", rol=rol, activo=True)
    db.add(obj)
    await db.commit()
    return obj


def auth(user):
    return {"Authorization": "Bearer " + crear_token_acceso(user.id)}


async def cohorte(db, anio=2026):
    obj = Cohorte(id=uuid4(), anio=anio, nombre=f"Cohorte {uuid4().hex}",
                  inscripcion_abierta=True, fecha_inicio=None)
    db.add(obj)
    await db.commit()
    return obj


async def legajo(db, cohorte_id, *, owner=None, estado="PENDIENTE", carrera="Maestria", semaforo="VERDE"):
    obj = Legajo(id=uuid4(), cohorte_id=cohorte_id, dni="12345678", apellido="Prueba", nombre="API",
        email=f"{uuid4().hex}@example.com", usuario_id=owner, telefono_movil="123456",
        domicilio_direccion="Calle 1", domicilio_ciudad="La Plata", domicilio_provincia="Buenos Aires",
        domicilio_pais="Argentina", titulo_grado="Licenciatura", carrera_elegida="Maestria en Sistemas",
        motivacion="Solicitud ficticia para verificar endpoints contra una base de prueba aislada.",
        tipo_carrera=carrera, solicita_beca=False, estado=estado, semaforo=semaforo, semaforo_manual=False)
    db.add(obj)
    await db.commit()
    return obj


async def documento(db, legajo_id, carpeta):
    archivo = carpeta / (uuid4().hex + ".pdf")
    writer = PdfWriter(); writer.add_blank_page(width=595, height=842)
    buffer = io.BytesIO(); writer.write(buffer); archivo.write_bytes(buffer.getvalue())
    obj = Documento(id=uuid4(), legajo_id=legajo_id, tipo="DNI", path_storage=archivo.name,
        nombre_original="dni.pdf", checksum_sha256="0" * 64, tamanio_bytes=archivo.stat().st_size,
        estado="PENDIENTE_REVISION", fecha_subida=datetime.now(timezone.utc))
    db.add(obj)
    await db.commit()
    return obj


async def seguimiento(client, staff, legajo_id):
    response = await client.post("accesos", headers=auth(staff), json={
        "tipo": "SEGUIMIENTO", "legajo_id": str(legajo_id), "duracion_dias": 1})
    assert response.status_code == 201, response.text
    from urllib.parse import parse_qs, urlparse
    token = parse_qs(urlparse(response.json()["url"]).query)["token"][0]
    response = await client.post("accesos/intercambiar", json={"token": token})
    assert response.status_code == 200


async def test_detalle_cohorte_y_404(entorno):
    client, db, _ = entorno
    c = await cohorte(db)
    response = await client.get(f"cohortes/{c.id}")
    assert response.status_code == 200
    assert response.json()["id"] == str(c.id)
    assert response.json()["abierta"] is True
    assert (await client.get(f"cohortes/{uuid4()}")).status_code == 404
    assert (await client.get("cohortes/no-es-uuid")).status_code == 422


async def test_estadisticas_agrega_filtros_y_cohortes_vacias(entorno):
    client, db, _ = entorno
    staff = await usuario(db)
    cs = [await cohorte(db, anio) for anio in [2025, 2026, 2027, 2028]]
    await legajo(db, cs[1].id, estado="ACTIVO", semaforo="ROJO")
    await legajo(db, cs[1].id, estado="GRADUADO")
    await legajo(db, cs[1].id, estado="BAJA", carrera="Doctorado")
    await legajo(db, cs[1].id, estado="BORRADOR")
    response = await client.get("estadisticas/cohortes", headers=auth(staff))
    assert response.status_code == 200, response.text
    data = response.json()
    assert [c["anio"] for c in data] == [2028, 2027, 2026]
    assert all(data[0][k] == 0 for k in ["total_inscriptos", "activos", "graduados", "en_riesgo", "dados_de_baja"])
    assert data[2] == {"cohorte_id": str(cs[1].id), "cohorte_nombre": cs[1].nombre, "anio": 2026,
        "total_inscriptos": 3, "activos": 1, "graduados": 1, "en_riesgo": 1, "dados_de_baja": 1}
    filtrada = await client.get("estadisticas/cohortes?tipo_carrera=Doctorado", headers=auth(staff))
    assert filtrada.status_code == 200
    assert filtrada.json()[2]["total_inscriptos"] == 1
    assert filtrada.json()[2]["dados_de_baja"] == 1
    assert filtrada.json()[2]["activos"] == 0
    assert (await client.get("estadisticas/cohortes?tipo_carrera=Invalida", headers=auth(staff))).status_code == 422


async def test_estadisticas_requiere_coordinador(entorno):
    client, db, _ = entorno
    assert (await client.get("estadisticas/cohortes")).status_code == 401
    student = await usuario(db, "estudiante")
    assert (await client.get("estadisticas/cohortes", headers=auth(student))).status_code == 403


async def test_listado_documental_permisos_y_no_expone_storage(entorno):
    client, db, carpeta = entorno
    staff = await usuario(db)
    owner = await usuario(db, "estudiante")
    other = await usuario(db, "estudiante")
    c = await cohorte(db)
    l = await legajo(db, c.id, owner=owner.id)
    d = await documento(db, l.id, carpeta)
    path = f"legajos/{l.id}/documentos"
    assert (await client.get(path)).status_code == 401
    assert (await client.get(path, headers=auth(other))).status_code == 403
    assert (await client.get(path, headers={"Authorization": "Bearer invalido"})).status_code == 401
    for user in [staff, owner]:
        response = await client.get(path, headers=auth(user))
        assert response.status_code == 200
        assert response.json()[0]["id"] == str(d.id)
        assert "path_storage" not in response.json()[0]
        assert "checksum_sha256" not in response.json()[0]
        download = await client.get(f"documentos/{d.id}/download", headers=auth(user))
        assert download.status_code == 200
        assert download.headers["content-type"] == "application/pdf"
    await seguimiento(client, staff, l.id)
    assert (await client.get(path)).status_code == 200
    otro = await legajo(db, c.id)
    assert (await client.get(f"legajos/{otro.id}/documentos")).status_code == 403
    assert (await client.get(f"legajos/{uuid4()}/documentos", headers=auth(staff))).status_code == 404


async def test_revision_valida_rol_motivo_y_pertenencia(entorno):
    client, db, carpeta = entorno
    staff = await usuario(db)
    student = await usuario(db, "estudiante")
    c = await cohorte(db)
    l = await legajo(db, c.id, owner=student.id)
    otro = await legajo(db, c.id)
    d = await documento(db, l.id, carpeta)
    path = f"legajos/{l.id}/documentos/{d.id}"
    datos = {"accion": "OBSERVAR", "motivo": "  Falta una pagina  "}
    assert (await client.patch(path, json=datos)).status_code == 401
    assert (await client.patch(path, json=datos, headers=auth(student))).status_code == 403
    for payload in [{"accion":"OBSERVAR"}, {"accion":"MARCAR_FALTANTE","motivo":"  "},
                    {"accion":"INVALIDA"}, {"accion":"OBSERVAR","motivo":"x"*2001}]:
        assert (await client.patch(path, json=payload, headers=auth(staff))).status_code == 422
    assert (await client.patch(f"legajos/{otro.id}/documentos/{d.id}", json=datos, headers=auth(staff))).status_code == 404
    response = await client.patch(path, json=datos, headers=auth(staff))
    assert response.status_code == 200, response.text
    assert response.json()["estado"] == "OBSERVADO"
    assert response.json()["motivo_observacion"] == "Falta una pagina"
    assert l.estado == "PENDIENTE"
    assert (await db.scalar(select(func.count()).select_from(AuditoriaLegajo))) == 1
    audit = (await db.scalars(select(AuditoriaLegajo))).one()
    assert audit.usuario_email == staff.email and str(d.id) in audit.comentario
    response = await client.patch(path, json={"accion":"APROBAR"}, headers=auth(staff))
    assert response.status_code == 200
    assert response.json()["estado"] == "APROBADO" and response.json()["motivo_observacion"] is None


async def test_faltante_y_reemplazo_conservan_historial_y_pdf(entorno):
    client, db, carpeta = entorno
    staff = await usuario(db)
    c = await cohorte(db)
    l = await legajo(db, c.id)
    d = await documento(db, l.id, carpeta)
    path = f"legajos/{l.id}/documentos"
    response = await client.patch(path+f"/{d.id}", headers=auth(staff),
        json={"accion":"MARCAR_FALTANTE", "motivo":"Adjuntar ambas caras"})
    assert response.status_code == 200
    assert response.json()["estado"] == "FALTANTE"
    assert (carpeta / d.path_storage).is_file()
    await seguimiento(client, staff, l.id)
    assert (await client.get(path)).json()[0]["estado"] == "FALTANTE"
    contenido = (carpeta/d.path_storage).read_bytes()
    response = await client.post(path, data={"tipo":"DNI"}, files={"file":("nuevo.pdf", contenido, "application/pdf")})
    assert response.status_code == 201, response.text
    nuevo = response.json()
    assert nuevo["id"] != str(d.id) and nuevo["estado"] == "PENDIENTE_REVISION"
    listado = (await client.get(path)).json()
    assert len(listado) == 1 and listado[0]["id"] == nuevo["id"]
    assert await db.scalar(select(func.count()).select_from(Documento)) == 2
    assert (await client.get(f"documentos/{d.id}/download")).status_code == 200
    assert (await client.patch(path+f"/{d.id}", headers=auth(staff), json={"accion":"APROBAR"})).status_code == 409


async def test_exportar_pdf_con_datos_reales_y_permisos(entorno):
    client, db, carpeta = entorno
    staff = await usuario(db)
    owner = await usuario(db, "estudiante")
    otro = await usuario(db, "estudiante")
    c = await cohorte(db)
    l = await legajo(db, c.id, owner=owner.id)
    l.apellido = "Muñoz & Hijos <API>"
    await db.commit()
    d = await documento(db, l.id, carpeta)
    from src.seguimiento_graduacion.infrastructure.orm_models import TrabajoFinal
    db.add(TrabajoFinal(id=uuid4(), legajo_id=l.id, tipo="Maestria", titulo="Proyecto final de prueba",
        director="Directora de prueba", codirector=None, fecha_cpr=datetime.now(timezone.utc).date(),
        numero_resolucion="RES-123", creado_por=staff.email))
    await db.commit()
    path = f"legajos/{l.id}/exportar-pdf"
    assert (await client.get(path)).status_code == 401
    assert (await client.get(path, headers=auth(otro))).status_code == 403
    assert (await client.get(f"legajos/{uuid4()}/exportar-pdf", headers=auth(staff))).status_code == 404
    for user in [staff, owner]:
        response = await client.get(path, headers=auth(user))
        assert response.status_code == 200, response.text
        assert response.headers["content-type"] == "application/pdf"
        assert response.headers["cache-control"] == "no-store"
        assert f"legajo-{l.id}.pdf" in response.headers["content-disposition"]
        assert response.content.startswith(b"%PDF-")
        pdf = PdfReader(io.BytesIO(response.content))
        texto = "\n".join(p.extract_text() for p in pdf.pages)
        assert "Muñoz & Hijos <API>" in texto
        assert l.email in texto and l.dni in texto and c.nombre in texto
        assert "dni.pdf" in texto and "PENDIENTE_REVISION" in texto
        assert "Proyecto final de prueba" in texto and "RES-123" in texto
        assert d.path_storage not in texto
        assert len(pdf.pages) >= 1
    assert await db.scalar(select(func.count()).select_from(AuditoriaLegajo)) == 0


async def test_exportar_pdf_sin_documentos_y_con_observacion_extensa(entorno):
    client, db, carpeta = entorno
    staff = await usuario(db)
    c = await cohorte(db)
    l = await legajo(db, c.id)
    path = f"legajos/{l.id}/exportar-pdf"
    response = await client.get(path, headers=auth(staff))
    assert response.status_code == 200
    assert "No hay documentos cargados" in "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(response.content)).pages)
    d = await documento(db, l.id, carpeta)
    d.estado = "OBSERVADO"
    d.motivo_observacion = "Linea de observacion\n" * 90
    await db.commit()
    response = await client.get(path, headers=auth(staff))
    assert response.status_code == 200
    assert len(PdfReader(io.BytesIO(response.content)).pages) > 1
