from src.inscripcion.application.estado_documental import calcular_estado_documental


def test_calcula_estado_de_documentos_obligatorios_cargados_y_pendientes() -> None:
    estado = calcular_estado_documental(
        solicita_beca=False,
        titulo_posgrado=None,
        tipos_cargados={"DNI", "PARTIDA"},
    )

    por_tipo = {requisito.tipo: requisito for requisito in estado}

    assert por_tipo["DNI"].estado == "CARGADO"
    assert por_tipo["PARTIDA"].estado == "CARGADO"
    assert por_tipo["FORM_INSCRIPCION"].estado == "PENDIENTE"
    assert por_tipo["TITULO"].estado == "PENDIENTE"
    assert por_tipo["CUIT"].estado == "PENDIENTE"
    assert por_tipo["DNI"].obligatorio is True


def test_documentos_condicionales_son_obligatorios_si_corresponden() -> None:
    estado = calcular_estado_documental(
        solicita_beca=True,
        titulo_posgrado="Doctorado",
        tipos_cargados=set(),
    )

    por_tipo = {requisito.tipo: requisito for requisito in estado}

    assert por_tipo["TITULO_POSGRADO"].estado == "PENDIENTE"
    assert por_tipo["TITULO_POSGRADO"].obligatorio is True
    assert por_tipo["FORM_BECA"].estado == "PENDIENTE"
    assert por_tipo["FORM_BECA"].obligatorio is True


def test_documentos_condicionales_no_aplicables_no_figuran_pendientes() -> None:
    estado = calcular_estado_documental(
        solicita_beca=False,
        titulo_posgrado="  ",
        tipos_cargados=set(),
    )

    por_tipo = {requisito.tipo: requisito for requisito in estado}

    assert por_tipo["TITULO_POSGRADO"].estado == "NO_APLICA"
    assert por_tipo["TITULO_POSGRADO"].obligatorio is False
    assert por_tipo["FORM_BECA"].estado == "NO_APLICA"
    assert por_tipo["FORM_BECA"].obligatorio is False
