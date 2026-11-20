from datetime import date, datetime, timedelta, timezone

import pytest

from src.conduccion.reglas import (
    AccionLegajo,
    PermisoDenegadoError,
    ReglaNegocioError,
    Semaforo,
    calcular_asistencia,
    calcular_avance,
    calcular_estado_seminario,
    calcular_vencimiento_seminario,
    debe_vencer_legajo,
    evaluar_semaforo,
    exigir_cpr,
    fecha_vencimiento_reserva,
    normalizar_texto,
    reserva_esta_vencida,
    validar_asignacion_verde,
    validar_cambio_estado,
    validar_nota,
)


def argumentos_cambio(**cambios):
    datos = {
        "estado_actual": "PENDIENTE",
        "accion": AccionLegajo.REVISAR,
        "rol": "COORDINADOR",
        "activo": True,
    }
    datos.update(cambios)
    return datos


def argumentos_semaforo(**cambios):
    inicio = date(2020, 1, 1)

    datos = {
        "tipo_carrera": "Especialización",
        "fecha_inicio": inicio,
        "hoy": inicio + timedelta(days=100),
        "seminarios_pendientes": 0,
        "trabajo_final_iniciado": True,
        "director_asignado": True,
        "avance_registrado": True,
        "fecha_cpr": inicio,
        "verde_asignado_por_coordinador": False,
    }
    datos.update(cambios)
    return datos


def test_normaliza_tipo_carrera():
    assert normalizar_texto(
        "  Especialización "
    ) == "ESPECIALIZACION"


@pytest.mark.parametrize(
    "estado,accion,nuevo",
    [
        (
            "PENDIENTE",
            AccionLegajo.REVISAR,
            "EN_REVISION",
        ),
        (
            "EN_REVISION",
            AccionLegajo.OBSERVAR,
            "OBSERVADO",
        ),
        (
            "EN_REVISION",
            AccionLegajo.APROBAR,
            "COMPLETADO",
        ),
        (
            "EN_REVISION",
            AccionLegajo.RECHAZAR,
            "RECHAZADO",
        ),
        (
            "COMPLETADO",
            AccionLegajo.MATRICULAR,
            "ACTIVO",
        ),
        (
            "ACTIVO",
            AccionLegajo.DAR_BAJA,
            "BAJA",
        ),
        (
            "EN_RIESGO",
            AccionLegajo.DAR_BAJA,
            "BAJA",
        ),
    ],
)
def test_transiciones_validas(estado, accion, nuevo):
    resultado = validar_cambio_estado(
        **argumentos_cambio(
            estado_actual=estado,
            accion=accion,
            comentario="Comentario de prueba",
            documentacion_completa=True,
            datos_verificados=True,
        )
    )

    assert resultado.estado_anterior == estado
    assert resultado.estado_nuevo == nuevo


@pytest.mark.parametrize(
    "rol",
    [
        "ASPIRANTE",
        "ESTUDIANTE",
        "DOCENTE",
        "CPR",
        "ADMIN",
    ],
)
def test_cambio_rechaza_otros_roles(rol):
    with pytest.raises(PermisoDenegadoError):
        validar_cambio_estado(
            **argumentos_cambio(rol=rol)
        )


def test_cambio_rechaza_usuario_inactivo():
    with pytest.raises(PermisoDenegadoError):
        validar_cambio_estado(
            **argumentos_cambio(activo=False)
        )


@pytest.mark.parametrize(
    "estado,accion",
    [
        ("BORRADOR", AccionLegajo.REVISAR),
        ("PENDIENTE", AccionLegajo.APROBAR),
        ("RECHAZADO", AccionLegajo.MATRICULAR),
        ("COMPLETADO", AccionLegajo.DAR_BAJA),
        ("BAJA", AccionLegajo.REVISAR),
    ],
)
def test_transiciones_invalidas(estado, accion):
    with pytest.raises(ReglaNegocioError):
        validar_cambio_estado(
            **argumentos_cambio(
                estado_actual=estado,
                accion=accion,
            )
        )


@pytest.mark.parametrize("comentario", [None, "", "   "])
def test_observar_exige_comentario(comentario):
    with pytest.raises(ReglaNegocioError):
        validar_cambio_estado(
            **argumentos_cambio(
                estado_actual="EN_REVISION",
                accion=AccionLegajo.OBSERVAR,
                comentario=comentario,
            )
        )


def test_observacion_normaliza_comentario():
    resultado = validar_cambio_estado(
        **argumentos_cambio(
            estado_actual="EN_REVISION",
            accion=AccionLegajo.OBSERVAR,
            comentario="  Falta copia del título.  ",
        )
    )

    assert resultado.comentario == "Falta copia del título."


@pytest.mark.parametrize(
    "documentos,datos",
    [
        (False, False),
        (False, True),
        (True, False),
    ],
)
def test_aprobar_exige_datos_y_documentos(documentos, datos):
    with pytest.raises(ReglaNegocioError):
        validar_cambio_estado(
            **argumentos_cambio(
                estado_actual="EN_REVISION",
                accion=AccionLegajo.APROBAR,
                documentacion_completa=documentos,
                datos_verificados=datos,
            )
        )


def test_matricular_rechaza_reserva_vencida():
    with pytest.raises(ReglaNegocioError):
        validar_cambio_estado(
            **argumentos_cambio(
                estado_actual="COMPLETADO",
                accion=AccionLegajo.MATRICULAR,
                reserva_vencida=True,
            )
        )


def test_reserva_dura_treinta_dias():
    aprobacion = datetime(
        2026, 1, 1, 12, 0, tzinfo=timezone.utc
    )

    assert fecha_vencimiento_reserva(aprobacion) == datetime(
        2026, 1, 31, 12, 0, tzinfo=timezone.utc
    )


def test_reserva_no_vence_antes_del_limite():
    aprobacion = datetime(
        2026, 1, 1, tzinfo=timezone.utc
    )
    ahora = (
        aprobacion
        + timedelta(days=30)
        - timedelta(seconds=1)
    )

    assert reserva_esta_vencida(aprobacion, ahora) is False


def test_reserva_vence_en_el_limite():
    aprobacion = datetime(
        2026, 1, 1, tzinfo=timezone.utc
    )
    ahora = aprobacion + timedelta(days=30)

    assert reserva_esta_vencida(aprobacion, ahora) is True


@pytest.mark.parametrize(
    "estado",
    ["ACTIVO", "BAJA", "RECHAZADO", "GRADUADO"],
)
def test_vencimiento_no_afecta_otros_estados(estado):
    aprobacion = datetime(
        2026, 1, 1, tzinfo=timezone.utc
    )

    assert debe_vencer_legajo(
        estado=estado,
        fecha_aprobacion=aprobacion,
        ahora=aprobacion + timedelta(days=100),
    ) is False


def test_completado_sin_fecha_no_inventa_vencimiento():
    with pytest.raises(ReglaNegocioError):
        debe_vencer_legajo(
            estado="COMPLETADO",
            fecha_aprobacion=None,
            ahora=datetime.now(timezone.utc),
        )


def test_reserva_rechaza_fecha_sin_zona():
    with pytest.raises(ReglaNegocioError):
        fecha_vencimiento_reserva(
            datetime(2026, 1, 1)
        )


def test_asistencia_del_enunciado():
    assert calcular_asistencia(7, 10) == 70.0


def test_sin_clases_no_informa_cien_por_ciento():
    assert calcular_asistencia(0, 0) is None


@pytest.mark.parametrize(
    "presentes,clases",
    [(-1, 10), (1, -1), (11, 10), (1, 0)],
)
def test_asistencias_invalidas(presentes, clases):
    with pytest.raises(ReglaNegocioError):
        calcular_asistencia(presentes, clases)


@pytest.mark.parametrize("nota", [1, 4, 7.5, 10, "8.2"])
def test_notas_validas(nota):
    assert validar_nota(nota) is not None


@pytest.mark.parametrize(
    "nota",
    [0, 11, 7.55, "abc", "NaN", "Infinity", True],
)
def test_notas_invalidas(nota):
    with pytest.raises(ReglaNegocioError):
        validar_nota(nota)


@pytest.mark.parametrize(
    "nota,presentes,clases,esperado",
    [
        (4, 3, 4, "APROBADO"),
        (10, 2, 4, "DESAPROBADO"),
        (3, 4, 4, "DESAPROBADO"),
        (None, 4, 4, "PENDIENTE"),
        (8, 0, 0, "PENDIENTE"),
    ],
)
def test_estado_seminario(
    nota,
    presentes,
    clases,
    esperado,
):
    assert calcular_estado_seminario(
        nota_final=nota,
        presentes=presentes,
        clases_dictadas=clases,
    ) == esperado


def test_redondeo_no_convierte_asistencia_en_aprobatoria():
    # 74.999%, que al redondear a dos decimales da 75%.
    assert calcular_asistencia(74999, 100000) == 75.0

    assert calcular_estado_seminario(
        nota_final=8,
        presentes=74999,
        clases_dictadas=100000,
    ) == "DESAPROBADO"


def test_avance_academico():
    resultado = calcular_avance(
        seminarios_requeridos=8,
        seminarios_aprobados=6,
    )

    assert resultado.porcentaje == 75.0
    assert resultado.seminarios_pendientes == 2


@pytest.mark.parametrize(
    "requeridos,aprobados",
    [(0, 0), (-1, 0), (8, -1), (8, 9)],
)
def test_avance_rechaza_cantidades_invalidas(
    requeridos,
    aprobados,
):
    with pytest.raises(ReglaNegocioError):
        calcular_avance(
            seminarios_requeridos=requeridos,
            seminarios_aprobados=aprobados,
        )


def test_vencimiento_sin_normativa_es_desconocido():
    assert calcular_vencimiento_seminario(
        fecha_base=date(2026, 1, 1),
        plazo_dias=None,
    ) is None


def test_vencimiento_seminario_configurado():
    assert calcular_vencimiento_seminario(
        fecha_base=date(2026, 1, 1),
        plazo_dias=90,
    ) == date(2026, 4, 1)


@pytest.mark.parametrize("plazo", [0, -10])
def test_vencimiento_rechaza_plazo_invalido(plazo):
    with pytest.raises(ReglaNegocioError):
        calcular_vencimiento_seminario(
            fecha_base=date(2026, 1, 1),
            plazo_dias=plazo,
        )


def test_sin_riesgo_no_asigna_verde_automaticamente():
    resultado = evaluar_semaforo(
        **argumentos_semaforo()
    )

    assert resultado.color == Semaforo.SIN_EVALUAR


def test_verde_manual_sin_condicion_de_riesgo():
    resultado = evaluar_semaforo(
        **argumentos_semaforo(
            verde_asignado_por_coordinador=True,
        )
    )

    assert resultado.color == Semaforo.VERDE


@pytest.mark.parametrize(
    "tipo,dias,cambios,color",
    [
        (
            "Especialización",
            366,
            {"trabajo_final_iniciado": False},
            Semaforo.AMARILLO,
        ),
        (
            "Especialización",
            548,
            {"seminarios_pendientes": 1},
            Semaforo.ROJO,
        ),
        (
            "Maestría",
            548,
            {"director_asignado": False},
            Semaforo.AMARILLO,
        ),
        (
            "Maestría",
            877,
            {"seminarios_pendientes": 1},
            Semaforo.ROJO,
        ),
        (
            "Doctorado",
            731,
            {"avance_registrado": False},
            Semaforo.AMARILLO,
        ),
        (
            "Doctorado",
            1278,
            {"fecha_cpr": None},
            Semaforo.ROJO,
        ),
    ],
)
def test_semaforos_del_srs(tipo, dias, cambios, color):
    inicio = date(2020, 1, 1)

    resultado = evaluar_semaforo(
        **argumentos_semaforo(
            tipo_carrera=tipo,
            hoy=inicio + timedelta(days=dias),
            **cambios,
        )
    )

    assert resultado.color == color


def test_umbral_amarillo_es_estrictamente_mayor():
    inicio = date(2020, 1, 1)

    resultado = evaluar_semaforo(
        **argumentos_semaforo(
            hoy=inicio + timedelta(days=365),
            trabajo_final_iniciado=False,
        )
    )

    assert resultado.color == Semaforo.SIN_EVALUAR


def test_rojo_prevalece_sobre_amarillo_y_verde():
    inicio = date(2020, 1, 1)

    resultado = evaluar_semaforo(
        **argumentos_semaforo(
            hoy=inicio + timedelta(days=600),
            seminarios_pendientes=1,
            trabajo_final_iniciado=False,
            verde_asignado_por_coordinador=True,
        )
    )

    assert resultado.color == Semaforo.ROJO

def test_tipo_carrera_desconocido():
    with pytest.raises(ReglaNegocioError):
        evaluar_semaforo(
            **argumentos_semaforo(
                tipo_carrera="Otra carrera",
            )
        )

def test_fecha_inicio_futura():
    with pytest.raises(ReglaNegocioError):
        evaluar_semaforo(
            **argumentos_semaforo(
                fecha_inicio=date(2030, 1, 1),
                hoy=date(2026, 1, 1),
            )
        )

def test_fecha_cpr_futura():
    with pytest.raises(ReglaNegocioError):
        evaluar_semaforo(
            **argumentos_semaforo(
                fecha_cpr=date(2030, 1, 1),
            )
        )

def test_coordinador_puede_asignar_verde():
    validar_asignacion_verde(
        rol="COORDINADOR",
        activo=True,
    )

@pytest.mark.parametrize(
    "rol",
    ["ADMIN", "CPR", "DOCENTE", "ASPIRANTE"],
)
def test_otros_roles_no_asignan_verde(rol):
    with pytest.raises(PermisoDenegadoError):
        validar_asignacion_verde(
            rol=rol,
            activo=True,
        )

def test_cpr_puede_modificar_tesis():
    exigir_cpr("CPR", True)

@pytest.mark.parametrize(
    "rol",
    ["COORDINADOR", "ADMIN", "DOCENTE", "ASPIRANTE"],
)
def test_otros_roles_no_modifican_tesis(rol):
    with pytest.raises(PermisoDenegadoError):
        exigir_cpr(rol, True)

def test_cpr_inactivo_no_modifica_tesis():
    with pytest.raises(PermisoDenegadoError):
        exigir_cpr("CPR", False)