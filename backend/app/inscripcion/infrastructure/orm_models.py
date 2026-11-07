"""Tablas del módulo de inscripción (ARQUITECTURA.md §8.1 + tipos del front)."""

import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database.connection import Base

# Valores permitidos (los mismos que los tipos de frontend/src/shared/types/types.ts)
ESTADOS_LEGAJO = (
    "BORRADOR", "PENDIENTE", "EN_REVISION", "OBSERVADO", "COMPLETADO",
    "ACTIVO", "VENCIDO", "RECHAZADO", "BAJA", "GRADUADO",
)
TIPOS_CARRERA = ("Especializacion", "Maestria", "Doctorado")
TIPOS_BECA = ("30", "100")
SEMAFOROS = ("VERDE", "AMARILLO", "ROJO")


def valores_sql(valores: tuple[str, ...]) -> str:
    """Convierte ("A", "B") en "'A', 'B'" para armar los CHECK."""
    return ", ".join(f"'{v}'" for v in valores)


class Cohorte(Base):
    __tablename__ = "cohortes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    anio: Mapped[int]
    nombre: Mapped[str] = mapped_column(String(50), unique=True)
    inscripcion_abierta: Mapped[bool] = mapped_column(server_default=text("false"))
    fecha_inicio: Mapped[date | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class PeriodoInscripcion(Base):
    __tablename__ = "periodos_inscripcion"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    cohorte_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cohortes.id"), index=True)
    fecha_abre: Mapped[date]
    fecha_cierra: Mapped[date | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class Legajo(Base):
    __tablename__ = "legajos"
    __table_args__ = (
        CheckConstraint(f"estado IN ({valores_sql(ESTADOS_LEGAJO)})", name="estado_legajo_valido"),
        CheckConstraint(f"tipo_carrera IN ({valores_sql(TIPOS_CARRERA)})", name="tipo_carrera_valido"),
        CheckConstraint(f"tipo_beca IN ({valores_sql(TIPOS_BECA)})", name="tipo_beca_valido"),
        CheckConstraint(f"semaforo IN ({valores_sql(SEMAFOROS)})", name="semaforo_valido"),
        Index("idx_legajos_cohorte_est", "cohorte_id", "estado"),
        Index("idx_legajos_semaforo_rojo", "semaforo", postgresql_where=text("semaforo = 'ROJO'")),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    numero_legajo: Mapped[str | None] = mapped_column(String(20), unique=True)  # se asigna al aprobar
    cohorte_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cohortes.id"))

    # Datos personales
    dni: Mapped[str] = mapped_column(String(20), index=True)
    apellido: Mapped[str] = mapped_column(String(100))
    nombre: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), index=True)
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("usuarios.id", ondelete="SET NULL"), index=True)
    email_alternativo: Mapped[str | None] = mapped_column(String(255))
    telefono_movil: Mapped[str] = mapped_column(String(30))

    # Domicilio (en el front es un objeto; acá, una columna por campo)
    domicilio_direccion: Mapped[str] = mapped_column(String(200))
    domicilio_ciudad: Mapped[str] = mapped_column(String(100))
    domicilio_provincia: Mapped[str] = mapped_column(String(100))
    domicilio_pais: Mapped[str] = mapped_column(String(60))

    # Datos académicos
    titulo_grado: Mapped[str] = mapped_column(String(200))
    titulo_posgrado: Mapped[str | None] = mapped_column(String(200))
    # TODO(equipo): definir cómo se guardan las 2 carreras de BR-001 (SRS/PRD):
    # "un aspirante no puede inscribirse a más de 2 carreras simultáneamente".
    # El tipo Legajo del front tiene una sola (tipo_carrera + carrera_elegida), pero
    # CrearLegajoRequest manda tipo_carreras[] y carreras[] (hasta 2).
    # Opción A (propuesta): un legajo por carrera. Encaja con el semáforo, que se
    # calcula por tipo_carrera, y con estado/numero_legajo por carrera. Si se elige,
    # hay que sacar el unique de email (la 2da inscripción tendría el mismo email).
    # Opción B: un legajo con 2 carreras → tabla aparte legajo_carreras.
    tipo_carrera: Mapped[str | None] = mapped_column(String(30))
    carrera_elegida: Mapped[str] = mapped_column(String(100))
    motivacion: Mapped[str] = mapped_column(String(500))

    # Beca
    solicita_beca: Mapped[bool] = mapped_column(server_default=text("false"))
    tipo_beca: Mapped[str | None] = mapped_column(String(10))

    # Estado y seguimiento
    estado: Mapped[str] = mapped_column(String(30), server_default=text("'BORRADOR'"))
    semaforo: Mapped[str] = mapped_column(String(10), server_default=text("'VERDE'"))
    semaforo_manual: Mapped[bool] = mapped_column(server_default=text("false"))  # true = lo cambió el coordinador
    fecha_inscripcion: Mapped[datetime | None]
    fecha_activacion: Mapped[datetime | None]  # cuando pasa a ACTIVO

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class AuditoriaLegajo(Base):
    __tablename__ = "auditoria_legajos"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    legajo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("legajos.id"), index=True)
    estado_anterior: Mapped[str | None] = mapped_column(String(30))
    estado_nuevo: Mapped[str] = mapped_column(String(30))
    comentario: Mapped[str | None] = mapped_column(Text)
    usuario_email: Mapped[str | None] = mapped_column(String(255))  # None si fue automático
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
