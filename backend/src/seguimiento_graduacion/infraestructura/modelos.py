from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class TrabajoFinal(Base):
    __tablename__ = "trabajos_finales"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('TFI', 'Maestría', 'Doctorado')",
            name="ck_trabajos_finales_tipo",
        ),
        Index("ix_trabajos_finales_legajo_id", "legajo_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    legajo_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("legajos.id", ondelete="RESTRICT"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    titulo: Mapped[str] = mapped_column(String(500), nullable=False)
    director_nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    director_email: Mapped[str] = mapped_column(String(254), nullable=False)
    codirector: Mapped[str | None] = mapped_column(String(200), nullable=True)
    fecha_aprobacion_cpr: Mapped[date] = mapped_column(Date, nullable=False)
    numero_resolucion: Mapped[str] = mapped_column(String(100), nullable=False)


class PlanGraduacion(Base):
    __tablename__ = "planes_graduacion"
    __table_args__ = (
        UniqueConstraint("cohorte_id", "carrera", name="uq_plan_graduacion_cohorte_carrera"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    cohorte_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("cohortes.id", ondelete="RESTRICT"), nullable=False,
    )
    carrera: Mapped[str] = mapped_column(String(30), nullable=False)
    confirmado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    requiere_recalculo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class AsignacionCoordinador(Base):
    __tablename__ = "asignaciones_coordinador_carrera"
    __table_args__ = (
        UniqueConstraint("carrera", "usuario_id", name="uq_coordinador_carrera"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    carrera: Mapped[str] = mapped_column(String(30), nullable=False)
    usuario_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False,
    )


class AvanceTesis(Base):
    __tablename__ = "avances_tesis"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    legajo_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("legajos.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    carrera: Mapped[str] = mapped_column(String(30), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    descripcion: Mapped[str] = mapped_column(String(1000), nullable=False)


class SemaforoGraduacion(Base):
    __tablename__ = "semaforos_graduacion"
    __table_args__ = (
        UniqueConstraint("legajo_id", "carrera", name="uq_semaforo_legajo_carrera"),
        CheckConstraint("estado IN ('VERDE', 'AMARILLO', 'ROJO')", name="ck_semaforo_estado"),
        Index("ix_semaforos_estado", "estado"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    legajo_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("legajos.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    carrera: Mapped[str] = mapped_column(String(30), nullable=False)
    estado: Mapped[str] = mapped_column(String(10), nullable=False)
    motivo: Mapped[str] = mapped_column(String(250), nullable=False)
    seminarios_adeudados: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_ultimo_avance: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_cambio: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recalculado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class AlertaRiesgo(Base):
    __tablename__ = "alertas_riesgo"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    semaforo_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("semaforos_graduacion.id", ondelete="RESTRICT"), nullable=False,
    )
    motivo: Mapped[str] = mapped_column(String(250), nullable=False)
    dias_restantes: Mapped[int] = mapped_column(Integer, nullable=False)
    destinatarios_definidos: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    creada_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class EntregaAlerta(Base):
    __tablename__ = "entregas_alerta_riesgo"
    __table_args__ = (
        UniqueConstraint("alerta_id", "usuario_id", name="uq_entrega_alerta_usuario"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    alerta_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("alertas_riesgo.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    usuario_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False,
    )
    enviado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
