import pytest
from src.conduccion.reglas import AccionLegajo, validar_cambio_estado, ReglaNegocioError

@pytest.mark.parametrize("estado", ["PENDIENTE", "EN_REVISION", "OBSERVADO", "COMPLETADO", "RECHAZADO", "VENCIDO"])
def test_baja_exige_motivo(estado):
    with pytest.raises(ReglaNegocioError):
        validar_cambio_estado(estado_actual=estado, accion=AccionLegajo.DAR_BAJA, rol="COORDINADOR", activo=True)

def test_reapertura_baja():
    cambio = validar_cambio_estado(estado_actual="BAJA", accion=AccionLegajo.REVISAR, rol="COORDINADOR", activo=True)
    assert cambio.estado_nuevo == "EN_REVISION"
