from collections.abc import Generator
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from main import app
from src.authentication.application.security import create_token_pair
from src.authentication.infrastructure.models import User
from src.core.config import settings
from src.db.base import Base
from src.db.session import get_db
from src.inscripcion.application.estado_documental import (
    DOCUMENTOS_OBLIGATORIOS_BASE,
    es_documento_requerido,
    evaluar_estado_documental,
    evaluar_estado_documental_por_id,
    obtener_documentos_requeridos,
)
from src.inscripcion.application.gestion_documentos import LegajoDocumentalNoEncontrado
from src.inscripcion.infrastructure.models import Cohorte, DocumentoInscripcion, Legajo

PDF_PRUEBA = b"%PDF-1.4\ncontenido documental\n%%EOF"
CHECKSUM_PRUEBA = sha256(PDF_PRUEBA).hexdigest()
TOKEN_PROPIETARIO = "token-propietario-estado-doc"


def _construir_legajo(
    *,
    cohorte_id=None,
    estado: str = "Pendiente",
    solicita_beca: bool = False,
    titulo_posgrado: str | None = None,
    tipos_documentos: tuple[str, ...] = (),
) -> Legajo:
    legajo = Legajo(
        id=uuid4(),
        cohorte_id=cohorte_id or uuid4(),
        estado=estado,
        carreras=["Especialización"],
        dni="30123456",
        apellido="Pérez",
        nombre="Ana",
        nacionalidad="Argentina",
        email="ana@example.com",
        email_alternativo="ana.alt@example.com",
        telefono_movil="2215551234",
        domicilio="Calle 1",
        ciudad="La Plata",
        provincia="Buenos Aires",
        pais="Argentina",
        titulo_grado="Ingeniería",
        titulo_posgrado=titulo_posgrado,
        como_conocio="web",
        motivacion="Motivación válida para la inscripción del posgrado.",
        solicita_beca=solicita_beca,
        tipo_beca="30%" if solicita_beca else None,
        token_propietario_hash=sha256(TOKEN_PROPIETARIO.encode("ascii")).hexdigest(),
        token_propietario_expira_en=datetime.now(timezone.utc) + timedelta(days=30),
    )
    legajo.documentos = [
        DocumentoInscripcion(
            legajo_id=legajo.id,
            tipo=tipo,
            path_storage=f"inscripciones/{tipo.lower()}.pdf",
            checksum_sha256=CHECKSUM_PRUEBA,
        )
        for tipo in tipos_documentos
    ]
    return legajo


def test_obtener_documentos_requeridos_y_condicionales() -> None:
    assert obtener_documentos_requeridos() == DOCUMENTOS_OBLIGATORIOS_BASE
    assert obtener_documentos_requeridos(titulo_posgrado="   ") == DOCUMENTOS_OBLIGATORIOS_BASE
    assert obtener_documentos_requeridos(titulo_posgrado="Maestría") == (
        *DOCUMENTOS_OBLIGATORIOS_BASE,
        "TITULO_POSGRADO",
    )
    assert obtener_documentos_requeridos(solicita_beca=True) == (
        *DOCUMENTOS_OBLIGATORIOS_BASE,
        "FORM_BECA",
    )
    assert obtener_documentos_requeridos(solicita_beca=True, titulo_posgrado="Doctorado") == (
        *DOCUMENTOS_OBLIGATORIOS_BASE,
        "TITULO_POSGRADO",
        "FORM_BECA",
    )
    assert es_documento_requerido("DNI") is True
    assert es_documento_requerido("FORM_BECA", solicita_beca=False) is False
    assert es_documento_requerido("FORM_BECA", solicita_beca=True) is True
    assert es_documento_requerido("TITULO_POSGRADO", titulo_posgrado="Esp.") is True
    assert es_documento_requerido("DESCONOCIDO") is False


def test_evaluar_estado_documental_incompleto_completo_y_validado() -> None:
    sin_docs = _construir_legajo()
    eval_sin = evaluar_estado_documental(sin_docs)
    assert eval_sin.estado == "INCOMPLETO"
    assert eval_sin.completo is False
    assert eval_sin.validado is False
    assert eval_sin.presentes == ()
    assert eval_sin.faltantes == DOCUMENTOS_OBLIGATORIOS_BASE

    parcial = _construir_legajo(tipos_documentos=("FORM_INSCRIPCION", "DNI"))
    eval_parcial = evaluar_estado_documental(parcial)
    assert eval_parcial.estado == "INCOMPLETO"
    assert eval_parcial.presentes == ("FORM_INSCRIPCION", "DNI")
    assert eval_parcial.faltantes == ("TITULO", "PARTIDA", "CUIT")

    completo_pendiente = _construir_legajo(
        estado="En Revisión",
        tipos_documentos=DOCUMENTOS_OBLIGATORIOS_BASE,
    )
    eval_completo = evaluar_estado_documental(completo_pendiente)
    assert eval_completo.estado == "COMPLETO"
    assert eval_completo.completo is True
    assert eval_completo.validado is False
    assert eval_completo.faltantes == ()

    for estado_validado in ("Completado", "Activo", "Graduado", "En Riesgo"):
        legajo_val = _construir_legajo(
            estado=estado_validado,
            tipos_documentos=DOCUMENTOS_OBLIGATORIOS_BASE,
        )
        eval_val = evaluar_estado_documental(legajo_val)
        assert eval_val.estado == "VALIDADO"
        assert eval_val.completo is True
        assert eval_val.validado is True


def test_evaluar_estado_documental_condicionales_y_opcionales() -> None:
    con_beca_sin_form = _construir_legajo(
        solicita_beca=True,
        tipos_documentos=DOCUMENTOS_OBLIGATORIOS_BASE,
    )
    eval_beca = evaluar_estado_documental(con_beca_sin_form)
    assert eval_beca.estado == "INCOMPLETO"
    assert eval_beca.faltantes == ("FORM_BECA",)

    con_posgrado_sin_titulo = _construir_legajo(
        titulo_posgrado="Maestría en Ingeniería",
        tipos_documentos=DOCUMENTOS_OBLIGATORIOS_BASE,
    )
    eval_pos = evaluar_estado_documental(con_posgrado_sin_titulo)
    assert eval_pos.estado == "INCOMPLETO"
    assert eval_pos.faltantes == ("TITULO_POSGRADO",)

    con_opcional_extra = _construir_legajo(
        solicita_beca=False,
        tipos_documentos=(*DOCUMENTOS_OBLIGATORIOS_BASE, "FORM_BECA"),
    )
    eval_extra = evaluar_estado_documental(con_opcional_extra)
    assert eval_extra.estado == "COMPLETO"
    assert eval_extra.opcionales_presentes == ("FORM_BECA",)


def test_evaluar_estado_documental_detecta_metadatos_y_archivos_invalidos(tmp_path: Path) -> None:
    legajo = _construir_legajo(tipos_documentos=DOCUMENTOS_OBLIGATORIOS_BASE)
    legajo.documentos[0].checksum_sha256 = "no-es-sha256"
    eval_meta = evaluar_estado_documental(legajo)
    assert eval_meta.estado == "INCOMPLETO"
    assert eval_meta.completo is False
    assert eval_meta.invalidos == ("FORM_INSCRIPCION",)
    assert eval_meta.faltantes == ("FORM_INSCRIPCION",)

    # Si existe una copia válida además de la inválida en memoria, prevalece la válida
    legajo.documentos.append(
        DocumentoInscripcion(
            legajo_id=legajo.id,
            tipo="FORM_INSCRIPCION",
            path_storage="inscripciones/form_ok.pdf",
            checksum_sha256=CHECKSUM_PRUEBA,
        )
    )
    assert evaluar_estado_documental(legajo).estado == "COMPLETO"

    # Verificación física en disco
    legajo_disco = _construir_legajo(tipos_documentos=DOCUMENTOS_OBLIGATORIOS_BASE)
    carpeta = tmp_path / "inscripciones"
    carpeta.mkdir(parents=True)
    for doc in legajo_disco.documentos:
        (tmp_path / doc.path_storage).write_bytes(PDF_PRUEBA)

    eval_ok = evaluar_estado_documental(
        legajo_disco,
        verificar_archivos=True,
        raiz_almacenamiento=tmp_path,
    )
    assert eval_ok.estado == "COMPLETO"

    # Alterar contenido de un archivo y borrar otro
    (tmp_path / legajo_disco.documentos[0].path_storage).write_bytes(b"corrupto")
    (tmp_path / legajo_disco.documentos[1].path_storage).unlink()
    legajo_disco.documentos[2].path_storage = "../fuera.pdf"

    eval_roto = evaluar_estado_documental(
        legajo_disco,
        verificar_archivos=True,
        raiz_almacenamiento=tmp_path,
    )
    assert eval_roto.estado == "INCOMPLETO"
    assert eval_roto.invalidos == ("FORM_INSCRIPCION", "DNI", "TITULO")
    assert eval_roto.faltantes == ("FORM_INSCRIPCION", "DNI", "TITULO")


@pytest.fixture
def entorno_documental(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[tuple[TestClient, Session, Cohorte, dict[str, str]], None, None]:
    motor = create_engine(f"sqlite:///{tmp_path / 'estado_documental.db'}")
    Base.metadata.create_all(motor)
    sesion = Session(motor)
    cohorte = Cohorte(anio=2026, nombre="Cohorte 2026", inscripcion_abierta=True)
    coordinador = User(email="coord@example.com", password_hash="sin-uso", role="COORDINADOR")
    cpr = User(email="cpr@example.com", password_hash="sin-uso", role="CPR")
    sesion.add_all((cohorte, coordinador, cpr))
    sesion.flush()
    tokens = {}
    for usuario in (coordinador, cpr):
        token, _, _ = create_token_pair(sesion, usuario)
        tokens[usuario.role] = f"Bearer {token}"
    sesion.commit()

    raiz = tmp_path / "storage"
    monkeypatch.setattr(settings, "storage_path", raiz)

    def sobreescribir_db() -> Generator[Session, None, None]:
        yield sesion

    previos = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = sobreescribir_db
    with TestClient(app) as cliente:
        yield cliente, sesion, cohorte, tokens
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previos)
    sesion.close()
    motor.dispose()


def test_evaluar_estado_documental_por_id_e_integracion_api(
    entorno_documental: tuple[TestClient, Session, Cohorte, dict[str, str]],
) -> None:
    cliente, sesion, cohorte, tokens = entorno_documental
    with pytest.raises(LegajoDocumentalNoEncontrado):
        evaluar_estado_documental_por_id(sesion, uuid4())

    legajo = _construir_legajo(
        cohorte_id=cohorte.id,
        estado="Pendiente",
        tipos_documentos=("FORM_INSCRIPCION", "DNI", "TITULO", "PARTIDA"),
    )
    carpeta = settings.storage_path / "inscripciones"
    carpeta.mkdir(parents=True, exist_ok=True)
    for doc in legajo.documentos:
        (settings.storage_path / doc.path_storage).write_bytes(PDF_PRUEBA)
    sesion.add(legajo)
    sesion.commit()

    eval_db = evaluar_estado_documental_por_id(sesion, legajo.id, verificar_archivos=True)
    assert eval_db.estado == "INCOMPLETO"
    assert eval_db.faltantes == ("CUIT",)

    coord = {"Authorization": tokens["COORDINADOR"]}
    cpr = {"Authorization": tokens["CPR"]}
    dueno = {"Authorization": f"Bearer {TOKEN_PROPIETARIO}"}

    assert cliente.get(f"/api/v1/legajos/{legajo.id}/estado-documental").status_code == 401
    assert cliente.get(f"/api/v1/legajos/{legajo.id}/estado-documental", headers=cpr).status_code == 403
    assert cliente.get(f"/api/v1/legajos/{uuid4()}/estado-documental", headers=coord).status_code == 404

    resp_incompleto = cliente.get(
        f"/api/v1/legajos/{legajo.id}/estado-documental",
        headers=dueno,
    )
    assert resp_incompleto.status_code == 200
    assert resp_incompleto.json()["estado"] == "INCOMPLETO"
    assert resp_incompleto.json()["faltantes"] == ["CUIT"]

    detalle_inicial = cliente.get(f"/api/v1/legajos/{legajo.id}", headers=coord)
    assert detalle_inicial.status_code == 200
    assert detalle_inicial.json()["documentacion_completa"] is False
    assert detalle_inicial.json()["estado_documental"] == "INCOMPLETO"
    assert detalle_inicial.json()["documentos_faltantes"] == ["CUIT"]

    # El aspirante sube el documento faltante (CUIT)
    subida = cliente.post(
        f"/api/v1/legajos/{legajo.id}/documentos",
        data={"tipo": "CUIT"},
        files={"archivo": ("cuit.pdf", PDF_PRUEBA, "application/pdf")},
        headers=dueno,
    )
    assert subida.status_code == 201

    detalle = cliente.get(f"/api/v1/legajos/{legajo.id}", headers=coord)
    assert detalle.status_code == 200
    assert detalle.json()["documentacion_completa"] is True
    assert detalle.json()["estado_documental"] == "COMPLETO"
    assert detalle.json()["documentos_faltantes"] == []

    # El coordinador pasa a En Revisión y Aprueba -> estado_documental VALIDADO
    assert cliente.patch(
        f"/api/v1/legajos/{legajo.id}/estado",
        json={"accion": "REVISAR"},
        headers=coord,
    ).status_code == 200
    assert cliente.patch(
        f"/api/v1/legajos/{legajo.id}/estado",
        json={"accion": "APROBAR"},
        headers=coord,
    ).status_code == 200

    resp_validado = cliente.get(
        f"/api/v1/legajos/{legajo.id}/estado-documental",
        headers=coord,
    )
    assert resp_validado.status_code == 200
    assert resp_validado.json()["estado"] == "VALIDADO"
    assert resp_validado.json()["validado"] is True
