from collections.abc import Generator
from contextlib import nullcontext
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

import main
from src.authentication.infrastructure.models import User
from src.db.base import Base
from src.inscripcion.application.vencer_reservas import vencer_reservas
from src.inscripcion.infrastructure.models import Cohorte, Legajo
from src.shared.auditoria.modelos import EventoAuditoria


@pytest.fixture
def sesion(tmp_path: Path) -> Generator[Session, None, None]:
    motor = create_engine(f"sqlite:///{tmp_path / 'reservas.db'}")
    Base.metadata.create_all(motor)
    with Session(motor) as session:
        yield session
    motor.dispose()


def _crear_legajo(cohorte_id: UUID, *, estado: str, dni: str) -> Legajo:
    return Legajo(
        cohorte_id=cohorte_id,
        estado=estado,
        carreras=["Especialización"],
        dni=dni,
        apellido="Aspirante",
        nombre="Ana",
        nacionalidad="Argentina",
        email=f"{dni}@example.com",
        email_alternativo=f"{dni}.alt@example.com",
        telefono_movil="2215551234",
        domicilio="Calle 1",
        ciudad="La Plata",
        provincia="Buenos Aires",
        pais="Argentina",
        titulo_grado="Ingeniería",
        como_conocio="web",
        motivacion="Quiero profundizar mis conocimientos en esta disciplina.",
        solicita_beca=False,
    )


def _evento_completado(legajo_id: UUID, creado_en: datetime) -> EventoAuditoria:
    return EventoAuditoria(
        accion="legajo.transicion",
        tipo_recurso="legajo",
        id_recurso=str(legajo_id),
        detalles={"estado_anterior": "En Revisión", "estado_nuevo": "Completado"},
        creado_en=creado_en,
    )


def test_vencimiento_usa_la_ultima_transicion_y_es_idempotente(
    sesion: Session,
) -> None:
    ahora = datetime(2026, 12, 31, 12, 0, tzinfo=timezone.utc)
    cohorte = Cohorte(anio=2026, nombre="Cohorte 2026", inscripcion_abierta=False)
    sesion.add(cohorte)
    sesion.flush()

    vencido = _crear_legajo(cohorte.id, estado="Completado", dni="30123456")
    limite = _crear_legajo(cohorte.id, estado="Completado", dni="30123457")
    reciente = _crear_legajo(cohorte.id, estado="Completado", dni="30123458")
    activo = _crear_legajo(cohorte.id, estado="Activo", dni="30123459")
    re_completado = _crear_legajo(cohorte.id, estado="Completado", dni="30123460")
    sesion.add_all((vencido, limite, reciente, activo, re_completado))
    sesion.flush()
    sesion.add_all(
        (
            _evento_completado(vencido.id, ahora - timedelta(days=31)),
            _evento_completado(limite.id, ahora - timedelta(days=30)),
            _evento_completado(reciente.id, ahora - timedelta(days=29)),
            _evento_completado(activo.id, ahora - timedelta(days=31)),
            _evento_completado(re_completado.id, ahora - timedelta(days=31)),
            _evento_completado(re_completado.id, ahora - timedelta(days=10)),
        )
    )
    sesion.commit()

    resultado = vencer_reservas(sesion, ahora=ahora)

    assert {legajo.id for legajo in resultado} == {vencido.id, limite.id}
    assert sesion.get(Legajo, vencido.id).estado == "Vencido"
    assert sesion.get(Legajo, limite.id).estado == "Vencido"
    assert sesion.get(Legajo, reciente.id).estado == "Completado"
    assert sesion.get(Legajo, activo.id).estado == "Activo"
    assert sesion.get(Legajo, re_completado.id).estado == "Completado"

    eventos_vencimiento = list(
        sesion.scalars(
            select(EventoAuditoria).where(
                EventoAuditoria.accion == "legajo.vencer_reserva"
            )
        )
    )
    assert len(eventos_vencimiento) == 2
    assert vencer_reservas(sesion, ahora=ahora) == []
    assert len(
        list(
            sesion.scalars(
                select(EventoAuditoria).where(
                    EventoAuditoria.accion == "legajo.vencer_reserva"
                )
            )
        )
    ) == 2


def test_job_notifica_a_coordinadores_activos(
    sesion: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ahora = datetime.now(timezone.utc)
    cohorte = Cohorte(anio=2026, nombre="Cohorte 2026", inscripcion_abierta=False)
    coordinador = User(
        email="coord@example.com",
        password_hash="x" * 60,
        role="COORDINADOR",
        is_active=True,
    )
    inactivo = User(
        email="inactivo@example.com",
        password_hash="x" * 60,
        role="COORDINADOR",
        is_active=False,
    )
    sesion.add(cohorte)
    sesion.flush()
    legajo = _crear_legajo(cohorte.id, estado="Completado", dni="30123456")
    sesion.add_all((legajo, coordinador, inactivo))
    sesion.flush()
    sesion.add(_evento_completado(legajo.id, ahora - timedelta(days=31)))
    sesion.commit()

    envios: list[tuple[str, list[tuple[str, str]]]] = []
    monkeypatch.setattr(main, "SessionLocal", lambda: nullcontext(sesion))
    monkeypatch.setattr(
        main,
        "enviar_email_vencimiento_reservas",
        lambda email, registros: envios.append((email, registros)),
    )

    main._procesar_vencimientos_reservas()

    assert sesion.get(Legajo, legajo.id).estado == "Vencido"
    assert envios == [
        ("coord@example.com", [(str(legajo.id), str(legajo.id))])
    ]
