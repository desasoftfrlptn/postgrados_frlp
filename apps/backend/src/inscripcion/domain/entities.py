from dataclasses import dataclass
from enum import Enum
from datetime import date
from typing import Optional


class EstadoLegajo(Enum):
    BORRADOR = "BORRADOR"
    PENDIENTE = "PENDIENTE"
    EN_REVISION = "EN_REVISION"
    OBSERVADO = "OBSERVADO"
    COMPLETADO = "COMPLETADO"
    ACTIVO = "ACTIVO"
    VENCIDO = "VENCIDO"
    RECHAZADO = "RECHAZADO"
    BAJA = "BAJA"
    GRADUADO = "GRADUADO"


@dataclass
class Aspirante:
    id: str
    dni: "DNI"
    email: "Email"
    nombre: str
    apellido: str
    tipo_carrera: "TipoCarrera"
    carrera_elegida: str
    motivacion: str
    solicita_beca: bool
    estado: EstadoLegajo = EstadoLegajo.BORRADOR
    fecha_inscripcion: Optional[date] = None

    def cambiar_estado(self, nuevo_estado: EstadoLegajo) -> "Aspirante":
        self.estado = nuevo_estado
        return self


@dataclass
class Legajo:
    id: str
    numero_legajo: str  # Formato: AÑO-COHORTE-SECUENCIAL (ej: 26-001-045)
    cohorte_id: str
    dni: "DNI"
    apellido: str
    nombre: str
    email: "Email"
    tipo_carrera: "TipoCarrera"
    solicita_beca: bool
    estado: EstadoLegajo = EstadoLegajo.BORRADOR
    fecha_inscripcion: Optional[date] = None
    fecha_activacion: Optional[date] = None
    semaforo: str = "VERDE"
    semaforo_manual: bool = False

    def puede_transicionar_a(self, nuevo_estado: EstadoLegajo) -> bool:
        """Reglas de transición de estado del legajo (BR-003, BR-005)."""
        # BORRADOR solo puede ir a PENDIENTE (guardar progreso)
        if self.estado == EstadoLegajo.BORRADOR and nuevo_estado != EstadoLegajo.PENDIENTE:
            return False
        # PENDIENTE puede ir a EN_REVISIÓN (revisar) u OBSERVADO (faltantes)
        if self.estado == EstadoLegajo.PENDIENTE and nuevo_estado not in (
                EstadoLegajo.EN_REVISION,
                EstadoLegajo.OBSERVADO,
        ):
            return False
        # EN_REVISIÓN puede ir a COMPLETADO (aprobar), RECHAZADO (denegar) u OBSERVADO (observar)
        if self.estado == EstadoLegajo.EN_REVISION and nuevo_estado not in (
                EstadoLegajo.COMPLETADO,
                EstadoLegajo.RECHAZADO,
                EstadoLegajo.OBSERVADO,
        ):
            return False
        # COMPLETADO puede ir a ACTIVO (matricular) o BAJA (no confirma)
        if self.estado == EstadoLegajo.COMPLETADO and nuevo_estado not in (
                EstadoLegajo.ACTIVO,
                EstadoLegajo.BAJA,
        ):
            return False
        # ACTIVO puede ir a GRADUADO (aprobación final) o RIESGO (módulo C detecta retraso)
        if self.estado == EstadoLegajo.ACTIVO and nuevo_estado not in (
                EstadoLegajo.GRADUADO,
                EstadoLegajo.RIESGO,
        ):
            return False
        return True

    def es_estado_terminal(self) -> bool:
        """Un estado es terminal si no puede seguir transicionando."""
        terminales = {
            EstadoLegajo.GRADUADO,
            EstadoLegajo.VENCIDO,
            EstadoLegajo.BAJA,
            EstadoLegajo.RECHAZADO,
        }
        return self.estado in terminales


@dataclass
class TipoCarrera:
    valor: str

    def __str__(self) -> str:
        return self.valor


# Alias para compatibilidad con esquemas Pydantic/BD
Esp = TipoCarrera("Especializacion")
Maestria = TipoCarrera("Maestria")
Doctorado = TipoCarrera("Doctorado")
