from dataclasses import dataclass
from datetime import date
from enum import Enum


class EstadoSemaforo(str, Enum):
    VERDE = "VERDE"
    AMARILLO = "AMARILLO"
    ROJO = "ROJO"


DURACION_DIAS = {
    "Especialización": 730,
    "Maestría": 1095,
    "Doctorado": 1825,
}


@dataclass(frozen=True)
class DatosSemaforo:
    tipo_carrera: str
    fecha_inscripcion: date
    seminarios_obligatorios_total: int
    seminarios_aprobados: int
    tiene_tfi_registrado: bool
    tiene_director_asignado: bool
    tiene_fecha_cpr: bool
    hoy: date


def calcular_semaforo(datos: DatosSemaforo) -> EstadoSemaforo:
    if datos.tipo_carrera not in DURACION_DIAS:
        raise ValueError("Tipo de carrera no admitido")
    if not 0 <= datos.seminarios_aprobados <= datos.seminarios_obligatorios_total:
        raise ValueError("La cantidad de seminarios aprobados es inválida")
    dias = (datos.hoy - datos.fecha_inscripcion).days
    if dias < 0:
        raise ValueError("La fecha de inscripción no puede estar en el futuro")
    duracion = DURACION_DIAS[datos.tipo_carrera]
    adeuda = datos.seminarios_aprobados < datos.seminarios_obligatorios_total
    if datos.tipo_carrera == "Especialización":
        if dias * 4 > duracion * 3 and adeuda:
            return EstadoSemaforo.ROJO
        if dias * 2 > duracion and not datos.tiene_tfi_registrado:
            return EstadoSemaforo.AMARILLO
    elif datos.tipo_carrera == "Maestría":
        if dias * 5 > duracion * 4 and adeuda:
            return EstadoSemaforo.ROJO
        if dias * 2 > duracion and not datos.tiene_director_asignado:
            return EstadoSemaforo.AMARILLO
    else:
        if dias * 10 > duracion * 7 and not datos.tiene_fecha_cpr:
            return EstadoSemaforo.ROJO
        if dias * 5 > duracion * 2 and not datos.tiene_director_asignado:
            return EstadoSemaforo.AMARILLO
    return EstadoSemaforo.VERDE
