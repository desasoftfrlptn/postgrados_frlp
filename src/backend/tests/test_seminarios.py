from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from src.seminarios.aplicacion.servicio import (
    calcular_porcentaje_asistencia,
    registrar_asistencia_clase,
    validar_y_calcular_estado_nota,
    verificar_seminario_docente,
)


def test_calcular_porcentaje_asistencia_br002():
    assert calcular_porcentaje_asistencia(0, 0) == 100.0
    assert calcular_porcentaje_asistencia(3, 4) == 75.0
    assert calcular_porcentaje_asistencia(2, 3) == 66.7
    assert calcular_porcentaje_asistencia(1, 4) == 25.0


@pytest.mark.parametrize(
    "nota,asistencia,estado_esperado",
    [
        (4.0, 75.0, "APROBADO"),
        (8.5, 90.0, "APROBADO"),
        (3.5, 100.0, "DESAPROBADO"),
        (7.0, 74.9, "DESAPROBADO"),
    ],
)
def test_validar_y_calcular_estado_nota_br003(
    nota,
    asistencia,
    estado_esperado,
):
    nota_validada, estado = validar_y_calcular_estado_nota(nota, asistencia)
    assert nota_validada == nota
    assert estado == estado_esperado


@pytest.mark.parametrize("nota_invalida", [0.5, 0.0, -2.0, 10.1, 11.0])
def test_validar_nota_fuera_de_rango_rf_doc_003(nota_invalida):
    with pytest.raises(HTTPException) as error:
        validar_y_calcular_estado_nota(nota_invalida, 80.0)
    assert error.value.status_code == 400


def test_validar_nota_mas_de_un_decimal_rf_doc_003():
    with pytest.raises(HTTPException) as error:
        validar_y_calcular_estado_nota(7.25, 85.0)
    assert error.value.status_code == 400


async def test_verificar_seminario_docente_aislamiento_br007(db):
    seminario_id = uuid4()
    docente_duenio = uuid4()
    otro_docente = uuid4()

    db.get.return_value = SimpleNamespace(
        id=seminario_id,
        docente_id=docente_duenio,
    )

    with pytest.raises(HTTPException) as error:
        await verificar_seminario_docente(seminario_id, otro_docente, db)

    assert error.value.status_code == 403


async def test_registrar_asistencia_rechaza_fecha_futura_br002(db):
    seminario_id = uuid4()
    docente_id = uuid4()
    maniana = date.today() + timedelta(days=1)

    db.get.return_value = SimpleNamespace(
        id=seminario_id,
        docente_id=docente_id,
    )

    with pytest.raises(HTTPException) as error:
        await registrar_asistencia_clase(
            seminario_id=seminario_id,
            fecha_clase=maniana,
            presentes_legajo_ids=[],
            docente_id=docente_id,
            db=db,
        )

    assert error.value.status_code == 400
    db.commit.assert_not_awaited()


async def test_registrar_asistencia_actualiza_contadores_rf_doc_002(
    db,
    monkeypatch,
):
    seminario_id = uuid4()
    docente_id = uuid4()
    legajo_presente = uuid4()
    legajo_ausente = uuid4()

    db.get.return_value = SimpleNamespace(
        id=seminario_id,
        docente_id=docente_id,
    )

    inscripcion_1 = SimpleNamespace(
        legajo_id=legajo_presente,
        asistencias=2,
        total_clases=3,
        nota_final=8.0,
        estado="DESAPROBADO",
    )
    inscripcion_2 = SimpleNamespace(
        legajo_id=legajo_ausente,
        asistencias=3,
        total_clases=3,
        nota_final=7.0,
        estado="APROBADO",
    )

    resultado_inscripciones = MagicMock()
    resultado_inscripciones.scalars.return_value.all.return_value = [
    inscripcion_1,
    inscripcion_2,
    ]
    resultado_clases_previas = MagicMock()
    resultado_clases_previas.scalars.return_value.all.return_value = []
    db.execute.side_effect = [
        resultado_inscripciones,
        resultado_clases_previas,
    ]
    monkeypatch.setattr(
        "src.seminarios.aplicacion.servicio.listar_alumnos_seminario",
        AsyncMock(return_value=[]),
    )

    await registrar_asistencia_clase(
        seminario_id=seminario_id,
        fecha_clase=date.today(),
        presentes_legajo_ids=[legajo_presente],
        docente_id=docente_id,
        db=db,
    )

    # Alumno 1 estuvo presente: pasa a 3/4 (75%) con nota 8.0 -> APROBADO
    assert inscripcion_1.total_clases == 4
    assert inscripcion_1.asistencias == 3
    assert inscripcion_1.estado == "APROBADO"

    # Alumno 2 inició ausente por defecto (RF-DOC-002): pasa a 3/4 (75%) -> APROBADO
    assert inscripcion_2.total_clases == 4
    assert inscripcion_2.asistencias == 3
    db.commit.assert_awaited_once()