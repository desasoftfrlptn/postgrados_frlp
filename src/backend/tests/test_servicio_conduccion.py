from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4
import pytest
from fastapi import HTTPException
from src.conduccion import servicio as s
from src.conduccion.esquemas import AccionLegajoPeticion
from src.conduccion.modelos import (
    AuditoriaConduccionORM,
    NotificacionConduccionORM,
)
from src.conduccion.reglas import AccionLegajo


@pytest.fixture
def sesion(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAIL", "admin@example.com")
    db = MagicMock()
    db.scalar = AsyncMock()
    db.scalars = AsyncMock(return_value=[])
    db.get = AsyncMock()
    db.execute = AsyncMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    return db


@pytest.fixture
def coordinador():
    return SimpleNamespace(
        id=uuid4(),
        activo=True,
        rol=SimpleNamespace(nombre="COORDINADOR"),
    )


@pytest.fixture
def legajo():
    return SimpleNamespace(
        id=uuid4(),
        cohorte_id=uuid4(),
        estado="PENDIENTE",
        solicitud_beca=None,
        correo_electronico="aspirante@example.com",
        numero_seguimiento="INS-2026-1",
        nombre="Ana",
        apellido="Pérez",
        carrera_elegida="Ingeniería",
        dni_pasaporte="12345678",
    )


@pytest.fixture
def gestion(legajo):
    return SimpleNamespace(
        legajo_id=legajo.id,
        numero_legajo=None,
        datos_verificados=True,
        tiene_titulo_posgrado=False,
        fecha_aprobacion=None,
        fecha_matricula=None,
        fecha_baja=None,
        observaciones=None,
        documentacion_a_corregir=[],
    )


@pytest.fixture
def preparar(monkeypatch, legajo, gestion):
    monkeypatch.setattr(
        s,
        "obtener_legajo",
        AsyncMock(return_value=legajo),
    )

    monkeypatch.setattr(
        s,
        "obtener_gestion",
        AsyncMock(return_value=gestion),
    )


def eventos_agregados(db, clase):
    return [
        llamada.args[0]
        for llamada in db.add.call_args_list
        if isinstance(llamada.args[0], clase)
    ]


async def test_revision_registra_auditoria(
    sesion,
    coordinador,
    legajo,
    gestion,
    preparar,
):
    resultado = await s.aplicar_accion(
        sesion,
        legajo.id,
        AccionLegajoPeticion(
            accion=AccionLegajo.REVISAR,
            estado_esperado="PENDIENTE",
        ),
        coordinador,
    )

    assert legajo.estado == "EN_REVISION"
    assert resultado["estado"] == "EN_REVISION"

    eventos = eventos_agregados(
        sesion,
        AuditoriaConduccionORM,
    )

    assert len(eventos) == 1
    assert eventos[0].actor_id == coordinador.id
    assert eventos[0].accion == "REVISAR"
    assert eventos[0].anterior == {"estado": "PENDIENTE"}
    assert eventos[0].nuevo["estado"] == "EN_REVISION"

    sesion.commit.assert_not_awaited()


async def test_observar_guarda_comentario_y_notificacion(
    sesion,
    coordinador,
    legajo,
    gestion,
    preparar,
):
    legajo.estado = "EN_REVISION"

    await s.aplicar_accion(
        sesion,
        legajo.id,
        AccionLegajoPeticion(
            accion=AccionLegajo.OBSERVAR,
            estado_esperado="EN_REVISION",
            comentario="Falta copia del título.",
        ),
        coordinador,
    )

    assert legajo.estado == "OBSERVADO"
    assert gestion.observaciones == "Falta copia del título."
    assert gestion.datos_verificados is False

    notificaciones = eventos_agregados(
        sesion,
        NotificacionConduccionORM,
    )

    assert len(notificaciones) == 1
    assert (
        notificaciones[0].destinatario
        == legajo.correo_electronico
    )
    assert (
        "Falta copia del título."
        in notificaciones[0].contenido
    )


async def test_aprobar_asigna_numero_y_fecha(
    sesion,
    coordinador,
    legajo,
    gestion,
    preparar,
    monkeypatch,
):
    legajo.estado = "EN_REVISION"

    monkeypatch.setattr(
        s,
        "obtener_completitud",
        AsyncMock(
            return_value=SimpleNamespace(completo=True)
        ),
    )

    async def asignar(db, legajo, gestion):
        gestion.numero_legajo = "26-001-001"
        return gestion.numero_legajo

    numerar = AsyncMock(side_effect=asignar)

    monkeypatch.setattr(
        s,
        "asignar_legajo_personal",
        numerar,
    )

    fecha = datetime(
        2026, 1, 1, tzinfo=timezone.utc
    )

    await s.aplicar_accion(
        sesion,
        legajo.id,
        AccionLegajoPeticion(
            accion=AccionLegajo.APROBAR,
            estado_esperado="EN_REVISION",
        ),
        coordinador,
        ahora=fecha,
    )

    assert legajo.estado == "COMPLETADO"
    assert gestion.numero_legajo == "26-001-001"
    assert gestion.fecha_aprobacion == fecha

    numerar.assert_awaited_once_with(
        sesion,
        legajo, gestion,
    )


async def test_aprobacion_incompleta_no_modifica_estado(
    sesion,
    coordinador,
    legajo,
    gestion,
    preparar,
    monkeypatch,
):
    legajo.estado = "EN_REVISION"

    monkeypatch.setattr(
        s,
        "obtener_completitud",
        AsyncMock(
            return_value=SimpleNamespace(completo=False)
        ),
    )

    with pytest.raises(HTTPException) as error:
        await s.aplicar_accion(
            sesion,
            legajo.id,
            AccionLegajoPeticion(
                accion=AccionLegajo.APROBAR,
                estado_esperado="EN_REVISION",
            ),
            coordinador,
        )

    assert error.value.status_code == 422
    assert legajo.estado == "EN_REVISION"
    assert gestion.numero_legajo is None

    assert eventos_agregados(
        sesion,
        AuditoriaConduccionORM,
    ) == []


async def test_estado_desactualizado_devuelve_conflicto(
    sesion,
    coordinador,
    legajo,
    preparar,
):
    legajo.estado = "OBSERVADO"

    with pytest.raises(HTTPException) as error:
        await s.aplicar_accion(
            sesion,
            legajo.id,
            AccionLegajoPeticion(
                accion=AccionLegajo.APROBAR,
                estado_esperado="EN_REVISION",
            ),
            coordinador,
        )

    assert error.value.status_code == 409
    assert legajo.estado == "OBSERVADO"


async def test_matricula_dentro_de_plazo(
    sesion,
    coordinador,
    legajo,
    gestion,
    preparar,
):
    legajo.estado = "COMPLETADO"

    aprobacion = datetime(
        2026, 1, 1, tzinfo=timezone.utc
    )
    ahora = aprobacion + timedelta(days=10)

    gestion.fecha_aprobacion = aprobacion
    gestion.numero_legajo = "26-001-001"

    await s.aplicar_accion(
        sesion,
        legajo.id,
        AccionLegajoPeticion(
            accion=AccionLegajo.MATRICULAR,
            estado_esperado="COMPLETADO",
        ),
        coordinador,
        ahora=ahora,
    )

    assert legajo.estado == "ACTIVO"
    assert gestion.fecha_matricula == ahora


async def test_matricula_rechaza_reserva_vencida(
    sesion,
    coordinador,
    legajo,
    gestion,
    preparar,
):
    legajo.estado = "COMPLETADO"

    aprobacion = datetime(
        2026, 1, 1, tzinfo=timezone.utc
    )
    gestion.fecha_aprobacion = aprobacion

    with pytest.raises(HTTPException) as error:
        await s.aplicar_accion(
            sesion,
            legajo.id,
            AccionLegajoPeticion(
                accion=AccionLegajo.MATRICULAR,
                estado_esperado="COMPLETADO",
            ),
            coordinador,
            ahora=aprobacion + timedelta(days=30),
        )

    assert error.value.status_code == 422
    assert legajo.estado == "COMPLETADO"


async def test_matricula_sin_fecha_historica_rechazada(
    sesion,
    coordinador,
    legajo,
    gestion,
    preparar,
):
    legajo.estado = "COMPLETADO"
    gestion.fecha_aprobacion = None

    with pytest.raises(HTTPException) as error:
        await s.aplicar_accion(
            sesion,
            legajo.id,
            AccionLegajoPeticion(
                accion=AccionLegajo.MATRICULAR,
                estado_esperado="COMPLETADO",
            ),
            coordinador,
        )

    assert error.value.status_code == 409


async def test_baja_registra_fecha(
    sesion,
    coordinador,
    legajo,
    gestion,
    preparar,
):
    legajo.estado = "ACTIVO"

    fecha = datetime(
        2026, 2, 1, tzinfo=timezone.utc
    )

    await s.aplicar_accion(
        sesion,
        legajo.id,
        AccionLegajoPeticion(
            accion=AccionLegajo.DAR_BAJA,
            estado_esperado="ACTIVO",
            comentario="Solicitud del estudiante.",
        ),
        coordinador,
        ahora=fecha,
    )

    assert legajo.estado == "BAJA"
    assert gestion.fecha_baja == fecha


@pytest.mark.parametrize(
    "rol",
    ["ADMIN", "CPR", "DOCENTE", "ASPIRANTE"],
)
async def test_servicio_rechaza_otros_roles(
    rol,
    sesion,
    coordinador,
    legajo,
):
    coordinador.rol.nombre = rol

    with pytest.raises(HTTPException) as error:
        await s.aplicar_accion(
            sesion,
            legajo.id,
            AccionLegajoPeticion(
                accion=AccionLegajo.REVISAR,
                estado_esperado="PENDIENTE",
            ),
            coordinador,
        )

    assert error.value.status_code == 403
    sesion.scalar.assert_not_awaited()
    sesion.add.assert_not_called()


async def test_transaccion_confirma_una_vez(sesion):
    operacion = AsyncMock(return_value={"ok": True})

    resultado = await s.ejecutar_transaccion(
        sesion,
        operacion,
    )

    assert resultado == {"ok": True}
    operacion.assert_awaited_once()
    sesion.commit.assert_awaited_once()
    sesion.rollback.assert_not_awaited()


async def test_transaccion_revierte_si_falla(sesion):
    operacion = AsyncMock(
        side_effect=HTTPException(
            status_code=422,
            detail="Operación inválida.",
        )
    )

    with pytest.raises(HTTPException):
        await s.ejecutar_transaccion(
            sesion,
            operacion,
        )

    sesion.commit.assert_not_awaited()
    sesion.rollback.assert_awaited_once()


async def test_vencimiento_modifica_y_audita(sesion):
    legajo = SimpleNamespace(
        id=uuid4(),
        estado="COMPLETADO",
        correo_electronico="aspirante@example.com",
        numero_seguimiento="INS-2026-1",
        nombre="Ana",
        apellido="Pérez",
        carrera_elegida="Ingeniería",
        dni_pasaporte="12345678",
    )

    gestion = SimpleNamespace(
        numero_legajo="26-001-001",
    )

    resultado_legajos = MagicMock()
    resultado_legajos.all.return_value = [
        (legajo, gestion),
    ]

    resultado_correos = MagicMock()
    resultado_correos.scalars.return_value.all.return_value = [
        "coordinador@example.com",
    ]

    sesion.execute.side_effect = [
        resultado_legajos,
        resultado_correos,
    ]

    resultado = await s.vencer_reservas(
        sesion,
        ahora=datetime(
            2026, 2, 1, tzinfo=timezone.utc
        ),
    )

    assert resultado["cantidad"] == 1
    assert legajo.estado == "VENCIDO"

    eventos = eventos_agregados(
        sesion,
        AuditoriaConduccionORM,
    )

    assert eventos[0].actor_id is None
    assert eventos[0].actor_rol == "SISTEMA"
    assert eventos[0].accion == "VENCER_RESERVA"

    notificaciones = eventos_agregados(
        sesion,
        NotificacionConduccionORM,
    )

    assert len(notificaciones) == 2
    assert {n.destinatario for n in notificaciones} == {
        "aspirante@example.com", "coordinador@example.com"
    }

async def test_legajo_personal_se_reutiliza_entre_cohortes(sesion, monkeypatch):
    from src.conduccion.modelos import LegajoPersonalORM
    numerar = AsyncMock(return_value="26-001-001")
    monkeypatch.setattr(s, "generar_numero_legajo", numerar)
    primera = SimpleNamespace(dni_pasaporte="12.345.678", cohorte_id=uuid4())
    segunda = SimpleNamespace(dni_pasaporte="12345678", cohorte_id=uuid4())
    g1 = SimpleNamespace(numero_legajo=None)
    g2 = SimpleNamespace(numero_legajo=None)
    sesion.get.return_value = None
    await s.asignar_legajo_personal(sesion, primera, g1)
    personal = eventos_agregados(sesion, LegajoPersonalORM)[0]
    sesion.get.return_value = personal
    await s.asignar_legajo_personal(sesion, segunda, g2)
    assert personal.documento == "12345678"
    assert g1.numero_legajo == g2.numero_legajo == "26-001-001"
    numerar.assert_awaited_once_with(sesion, primera.cohorte_id)
