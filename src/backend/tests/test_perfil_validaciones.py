import pytest
from pydantic import ValidationError
from src.usuarios.perfil_validaciones import DatosPerfil, ModificacionPerfil, validar_foto


def test_normaliza_telefono():
    assert DatosPerfil(telefono_movil="+54 (221) 1234567").telefono_movil == "+542211234567"


@pytest.mark.parametrize("telefono", ["123", "abcdef", "1" * 16])
def test_telefono_invalido(telefono):
    with pytest.raises(ValidationError):
        DatosPerfil(telefono_movil=telefono)


def test_no_permite_cambiar_rol():
    with pytest.raises(ValidationError):
        DatosPerfil(rol="ADMIN")


def test_preferencia_persistible():
    assert DatosPerfil(notificaciones_automaticas=False).model_dump()["notificaciones_automaticas"] is False


def test_version_requerida():
    with pytest.raises(ValidationError):
        ModificacionPerfil(foto=None)


@pytest.mark.parametrize("foto", ["data:image/svg+xml;base64,AAAA", "data:image/png;base64,AAAA", "data:image/jpeg;base64,!!!"])
def test_rechaza_imagen_invalida(foto):
    with pytest.raises(ValueError):
        validar_foto(foto)


def test_distingue_quitar_foto_de_no_modificar():
    assert "foto" in ModificacionPerfil(version=1, foto=None).model_fields_set
    assert "foto" not in ModificacionPerfil(version=1, datos=DatosPerfil()).model_fields_set


def test_preferencia_no_reemplaza_otros_datos():
    cambio = ModificacionPerfil(version=1, datos={"notificaciones_automaticas": False})
    assert cambio.datos.model_dump(exclude_unset=True) == {"notificaciones_automaticas": False}
