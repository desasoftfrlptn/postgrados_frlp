from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from enum import Enum
from typing import Iterable
import unicodedata

class ReglaNegocioError(ValueError):
    """Una operación incumple una regla del sistema."""

class PermisoDenegadoError(PermissionError):
    """El actor no tiene permiso para realizar la operación."""

class AccionLegajo(str, Enum):
    REVISAR = "REVISAR"
    OBSERVAR = "OBSERVAR"
    APROBAR = "APROBAR"
    RECHAZAR = "RECHAZAR"
    MATRICULAR = "MATRICULAR"
    DAR_BAJA = "DAR_BAJA"

class Semaforo(str, Enum):
    SIN_EVALUAR = "SIN_EVALUAR"
    VERDE = "VERDE"
    AMARILLO = "AMARILLO"
    ROJO = "ROJO"

@dataclass(frozen=True)
class CambioEstado:
    estado_anterior: str
    estado_nuevo: str
    comentario: str | None

@dataclass(frozen=True)
class ResultadoAvance:
    seminarios_requeridos: int
    seminarios_aprobados: int
    seminarios_pendientes: int
    porcentaje: float

@dataclass(frozen=True)
class ResultadoSemaforo:
    color: Semaforo
    dias_transcurridos: int
    duracion_dias: int
    porcentaje_tiempo: float
    motivo: str

TRANSICIONES = {
    AccionLegajo.REVISAR: {
        "PENDIENTE": "EN_REVISION",
        "OBSERVADO": "EN_REVISION",
        "RECHAZADO": "EN_REVISION",
        "COMPLETADO": "EN_REVISION",
        "VENCIDO": "EN_REVISION",
    },
    AccionLegajo.OBSERVAR: {
        "EN_REVISION": "OBSERVADO",
    },
    AccionLegajo.APROBAR: {
        "EN_REVISION": "COMPLETADO",
    },
    AccionLegajo.RECHAZAR: {
        "EN_REVISION": "RECHAZADO",
    },
    AccionLegajo.MATRICULAR: {
        "COMPLETADO": "ACTIVO",
    },
    AccionLegajo.DAR_BAJA: {
        "ACTIVO": "BAJA",
        "EN_RIESGO": "BAJA",
    },
}


REGLAS_SEMAFORO = {
    "ESPECIALIZACION": {
        "duracion": 730,
        "amarillo": 50,
        "rojo": 75,
    },
    "MAESTRIA": {
        "duracion": 1095,
        "amarillo": 50,
        "rojo": 80,
    },
    "DOCTORADO": {
        "duracion": 1825,
        "amarillo": 40,
        "rojo": 70,
    },
}

def normalizar_texto(valor: str) -> str:
    """
    Normaliza identificadores para comparar:
    'Especialización' -> 'ESPECIALIZACION'.
    """
    descompuesto = unicodedata.normalize("NFKD", valor.strip())

    return "".join(
        caracter
        for caracter in descompuesto
        if not unicodedata.combining(caracter)
    ).upper()

def exigir_rol(
    rol: str,
    activo: bool,
    roles_permitidos: Iterable[str],
) -> None:
    permitidos = {
        normalizar_texto(permitido)
        for permitido in roles_permitidos
    }

    if not activo:
        raise PermisoDenegadoError(
            "El usuario está desactivado."
        )

    if normalizar_texto(rol) not in permitidos:
        raise PermisoDenegadoError(
            "El usuario no tiene permiso para esta operación."
        )

def exigir_coordinador(rol: str, activo: bool) -> None:
    exigir_rol(
        rol=rol,
        activo=activo,
        roles_permitidos={"COORDINADOR"},
    )
    
def exigir_cpr(rol: str, activo: bool) -> None:
    exigir_rol(
        rol=rol,
        activo=activo,
        roles_permitidos={"CPR"},
    )
    
def validar_cambio_estado(
    *,
    estado_actual: str,
    accion: AccionLegajo,
    rol: str,
    activo: bool,
    comentario: str | None = None,
    documentacion_completa: bool = False,
    datos_verificados: bool = False,
    reserva_vencida: bool = False,
    documentacion_a_corregir: Iterable[str] = (),
) -> CambioEstado:
    """
    Valida un cambio de estado.

    No modifica la base ni genera el número de legajo.
    Esas acciones deben ejecutarse en la misma transacción
    que la auditoría, después de esta validación.
    """
    exigir_coordinador(rol, activo)

    estado = normalizar_texto(estado_actual)
    nuevo_estado = TRANSICIONES[accion].get(estado)

    if nuevo_estado is None:
        raise ReglaNegocioError(
            f"No se puede ejecutar {accion.value} "
            f"desde el estado {estado}."
        )

    comentario_limpio = (
        comentario.strip()
        if comentario is not None
        else None
    )

    if comentario_limpio == "":
        comentario_limpio = None

    # Observar necesita indicar qué debe corregir el aspirante.
    if (
        accion == AccionLegajo.OBSERVAR
        and comentario_limpio is None
        and not any(documentacion_a_corregir)
    ):
        raise ReglaNegocioError(
            "La observación debe indicar qué debe corregirse."
        )

    if (
        accion == AccionLegajo.RECHAZAR
        and comentario_limpio is None
    ):
        raise ReglaNegocioError(
            "Debe indicar el motivo del rechazo."
        )

    if (
        accion == AccionLegajo.DAR_BAJA
        and comentario_limpio is None
    ):
        raise ReglaNegocioError(
            "Debe indicar el motivo de la baja."
        )

    if accion == AccionLegajo.APROBAR:
        if not datos_verificados:
            raise ReglaNegocioError(
                "Primero deben verificarse los datos del legajo."
            )

        if not documentacion_completa:
            raise ReglaNegocioError(
                "No puede aprobarse un legajo "
                "con documentación incompleta."
            )

    if (
        accion == AccionLegajo.MATRICULAR
        and reserva_vencida
    ):
        raise ReglaNegocioError(
            "La reserva de vacante está vencida."
        )

    return CambioEstado(
        estado_anterior=estado,
        estado_nuevo=nuevo_estado,
        comentario=comentario_limpio,
    )


def fecha_vencimiento_reserva(
    fecha_aprobacion: datetime,
) -> datetime:
    """
    BR-005: la reserva vence a los 30 días corridos
    desde que el legajo pasa a COMPLETADO.

    Exige fechas con zona horaria.
    """
    if fecha_aprobacion.utcoffset() is None:
        raise ReglaNegocioError(
            "La fecha de aprobación debe tener zona horaria."
        )

    return fecha_aprobacion + timedelta(days=30)


def reserva_esta_vencida(
    fecha_aprobacion: datetime,
    ahora: datetime,
) -> bool:
    if ahora.utcoffset() is None:
        raise ReglaNegocioError(
            "La fecha actual debe tener zona horaria."
        )

    return ahora >= fecha_vencimiento_reserva(
        fecha_aprobacion
    )


def debe_vencer_legajo(
    *,
    estado: str,
    fecha_aprobacion: datetime | None,
    ahora: datetime,
) -> bool:
    """
    Solo permite vencimiento automático de reservas
    que continúen en COMPLETADO.
    """
    if normalizar_texto(estado) != "COMPLETADO":
        return False

    if fecha_aprobacion is None:
        raise ReglaNegocioError(
            "No se puede calcular el vencimiento "
            "sin fecha de aprobación."
        )

    return reserva_esta_vencida(
        fecha_aprobacion,
        ahora,
    )


def calcular_asistencia(
    presentes: int,
    clases_dictadas: int,
) -> float | None:
    """
    BR-002: presentes / clases dictadas hasta hoy × 100.

    Con cero clases devuelve None: todavía no hay datos.
    """
    if presentes < 0 or clases_dictadas < 0:
        raise ReglaNegocioError(
            "Las cantidades no pueden ser negativas."
        )

    if presentes > clases_dictadas:
        raise ReglaNegocioError(
            "Las asistencias no pueden superar "
            "las clases dictadas."
        )

    if clases_dictadas == 0:
        return None

    return round(
        presentes / clases_dictadas * 100,
        2,
    )


def validar_nota(nota: int | float | str | Decimal) -> Decimal:
    """
    Nota entre 1 y 10, con hasta un decimal.
    Rechaza también NaN e infinito.
    """
    if isinstance(nota, bool):
        raise ReglaNegocioError(
            "La nota debe ser numérica."
        )

    try:
        valor = Decimal(str(nota))
    except (InvalidOperation, ValueError):
        raise ReglaNegocioError(
            "La nota debe ser numérica."
        ) from None

    if not valor.is_finite():
        raise ReglaNegocioError(
            "La nota debe ser un número finito."
        )

    if valor < 1 or valor > 10:
        raise ReglaNegocioError(
            "La nota debe estar entre 1 y 10."
        )

    if valor != valor.quantize(Decimal("0.1")):
        raise ReglaNegocioError(
            "La nota admite como máximo un decimal."
        )

    return valor


def calcular_estado_seminario(
    *,
    nota_final: int | float | str | Decimal | None,
    presentes: int,
    clases_dictadas: int,
) -> str:
    """
    BR-003: aprobado con nota >=4 y asistencia >=75%.

    No utiliza el porcentaje redondeado para decidir
    la aprobación, evitando aprobar un valor inferior
    al 75% por efecto del redondeo.
    """
    calcular_asistencia(
        presentes,
        clases_dictadas,
    )

    if nota_final is None:
        return "PENDIENTE"

    nota = validar_nota(nota_final)

    if nota < 4:
        return "DESAPROBADO"

    if clases_dictadas == 0:
        return "PENDIENTE"

    cumple_asistencia = (
        presentes * 100 >= clases_dictadas * 75
    )

    if cumple_asistencia:
        return "APROBADO"

    return "DESAPROBADO"


def calcular_avance(
    *,
    seminarios_requeridos: int,
    seminarios_aprobados: int,
) -> ResultadoAvance:
    """
    El total requerido debe venir del plan o de una
    configuración validada, no solo de las inscripciones.
    """
    if seminarios_requeridos <= 0:
        raise ReglaNegocioError(
            "Debe configurarse una cantidad positiva "
            "de seminarios requeridos."
        )

    if seminarios_aprobados < 0:
        raise ReglaNegocioError(
            "La cantidad de aprobados no puede ser negativa."
        )

    if seminarios_aprobados > seminarios_requeridos:
        raise ReglaNegocioError(
            "La cantidad de aprobados supera "
            "los seminarios requeridos."
        )

    return ResultadoAvance(
        seminarios_requeridos=seminarios_requeridos,
        seminarios_aprobados=seminarios_aprobados,
        seminarios_pendientes=(
            seminarios_requeridos - seminarios_aprobados
        ),
        porcentaje=round(
            seminarios_aprobados
            / seminarios_requeridos
            * 100,
            2,
        ),
    )


def calcular_vencimiento_seminario(
    *,
    fecha_base: date,
    plazo_dias: int | None,
) -> date | None:
    """
    El plazo y la fecha base deben venir de la normativa.

    None significa que la regla todavía no está configurada.
    No se inventa un plazo predeterminado.
    """
    if plazo_dias is None:
        return None

    if plazo_dias <= 0:
        raise ReglaNegocioError(
            "El plazo debe ser mayor que cero."
        )

    return fecha_base + timedelta(days=plazo_dias)


def evaluar_semaforo(
    *,
    tipo_carrera: str,
    fecha_inicio: date,
    hoy: date,
    seminarios_pendientes: int,
    trabajo_final_iniciado: bool,
    director_asignado: bool,
    avance_registrado: bool,
    fecha_cpr: date | None,
    verde_asignado_por_coordinador: bool = False,
) -> ResultadoSemaforo:
    """
    RF-GRAD-002 y BR-008.

    El sistema puede asignar amarillo y rojo.
    Verde requiere una asignación manual previa y no
    prevalece sobre una condición de riesgo vigente.

    La fecha inicial del seguimiento debe estar definida
    institucionalmente y almacenada, no inferida.
    """
    tipo = normalizar_texto(tipo_carrera)

    if tipo not in REGLAS_SEMAFORO:
        raise ReglaNegocioError(
            "El tipo de carrera no tiene reglas configuradas."
        )

    if fecha_inicio > hoy:
        raise ReglaNegocioError(
            "El seguimiento no puede comenzar en el futuro."
        )

    if seminarios_pendientes < 0:
        raise ReglaNegocioError(
            "Los seminarios pendientes no pueden ser negativos."
        )

    if fecha_cpr is not None and fecha_cpr > hoy:
        raise ReglaNegocioError(
            "La fecha de aprobación CPR no puede ser futura."
        )

    regla = REGLAS_SEMAFORO[tipo]
    dias = (hoy - fecha_inicio).days
    duracion = regla["duracion"]

    # Se comparan enteros para respetar estrictamente
    # los umbrales del enunciado, que utilizan ">".
    supera_amarillo = (
        dias * 100 > duracion * regla["amarillo"]
    )
    supera_rojo = (
        dias * 100 > duracion * regla["rojo"]
    )

    if tipo == "ESPECIALIZACION":
        condicion_amarilla = not trabajo_final_iniciado
        condicion_roja = seminarios_pendientes > 0

        motivo_amarillo = (
            "Superó el 50% del plazo y no inició el TFI."
        )
        motivo_rojo = (
            "Superó el 75% del plazo y adeuda seminarios."
        )

    elif tipo == "MAESTRIA":
        condicion_amarilla = not director_asignado
        condicion_roja = seminarios_pendientes > 0

        motivo_amarillo = (
            "Superó el 50% del plazo y no tiene director."
        )
        motivo_rojo = (
            "Superó el 80% del plazo y adeuda seminarios."
        )

    else:
        condicion_amarilla = not avance_registrado
        condicion_roja = fecha_cpr is None

        motivo_amarillo = (
            "Superó el 40% del plazo y no tiene avance registrado."
        )
        motivo_rojo = (
            "Superó el 70% del plazo y no tiene fecha CPR."
        )

    if supera_rojo and condicion_roja:
        color = Semaforo.ROJO
        motivo = motivo_rojo

    elif supera_amarillo and condicion_amarilla:
        color = Semaforo.AMARILLO
        motivo = motivo_amarillo

    elif verde_asignado_por_coordinador:
        color = Semaforo.VERDE
        motivo = (
            "Verde asignado por el coordinador; "
            "sin condición automática de riesgo vigente."
        )

    else:
        color = Semaforo.SIN_EVALUAR
        motivo = (
            "Sin condición automática de riesgo. "
            "Pendiente de evaluación del coordinador."
        )

    return ResultadoSemaforo(
        color=color,
        dias_transcurridos=dias,
        duracion_dias=duracion,
        porcentaje_tiempo=round(
            dias / duracion * 100,
            2,
        ),
        motivo=motivo,
    )

def validar_asignacion_verde(
    *,
    rol: str,
    activo: bool,
) -> None:
    exigir_coordinador(rol, activo)