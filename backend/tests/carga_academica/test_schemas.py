"""Tests del contrato con el front: el JSON de US-B-002 va en camelCase."""

import uuid
from datetime import date

from src.carga_academica.presentation.schemas import AsistenciaUpdate, ClaseResponse


def test_el_front_manda_camel_case_y_lo_entendemos():
    # Arrange: el body que arma useActualizarAsistencia
    clase_id, legajo_id = uuid.uuid4(), uuid.uuid4()
    body = {"claseId": str(clase_id), "legajoId": str(legajo_id), "presente": True}
    # Act
    datos = AsistenciaUpdate.model_validate(body)
    # Assert: en Python lo usamos en snake_case
    assert datos.clase_id == clase_id
    assert datos.legajo_id == legajo_id


def test_la_clase_sale_en_camel_case():
    # Arrange
    clase = ClaseResponse(
        id=uuid.uuid4(),
        seminario_id=uuid.uuid4(),
        fecha=date(2026, 3, 3),
        asistencias=[{"legajo_id": uuid.uuid4(), "presente": True}],
    )
    # Act: FastAPI la convierte a JSON con by_alias=True
    json = clase.model_dump(mode="json", by_alias=True)
    # Assert: mismos nombres que el tipo `Clase` del front
    assert set(json) == {"id", "seminarioId", "fecha", "asistencias"}
    assert set(json["asistencias"][0]) == {"legajoId", "presente"}
