"""Tests del armado de mails (sin mandar nada: solo la plantilla)."""

from src.shared.email.cliente import renderizar


def test_completa_los_datos_de_la_plantilla():
    # Arrange
    datos = {"nombre_aspirante": "Ana Pérez", "carrera": "Maestría", "fecha_envio": "09/11/2026"}
    # Act
    html = renderizar("pendiente.html", datos)
    # Assert
    assert "Ana Pérez" in html
    assert "Maestría" in html
    assert "{{" not in html          # no quedó ninguna variable sin completar


def test_escapa_html_en_los_datos_para_evitar_xss():
    # Arrange: alguien escribe un script en el detalle de la observación
    datos = {
        "nombre_aspirante": "Ana",
        "carrera": "Maestría",
        "fecha_envio": "09/11/2026",
        "detalle_observacion": "<script>alert('hackeado')</script>",
    }
    # Act
    html = renderizar("observacion.html", datos)
    # Assert: aparece como texto escapado, no como etiqueta
    assert "<script>" not in html
    assert "&lt;script&gt;" in html