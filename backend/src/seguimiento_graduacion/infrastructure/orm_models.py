"""Tablas del módulo de seguimiento de graduación (Módulo C)."""

import uuid
from datetime import date, datetime

from sqlalchemy import CheckConstraint, ForeignKey, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database.connection import Base

TIPOS_TRABAJO_FINAL = ("TFI", "Maestria", "Doctorado")


class TrabajoFinal(Base):
    __tablename__ = "trabajos_finales"
    __table_args__ = (
        CheckConstraint(
            "tipo IN (" + ", ".join(f"'{t}'" for t in TIPOS_TRABAJO_FINAL) + ")",
            name="tipo_trabajo_final_valido",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    legajo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("legajos.id"), unique=True)  # uno por legajo
    tipo: Mapped[str] = mapped_column(String(20))
    titulo: Mapped[str] = mapped_column(String(300))
    director: Mapped[str] = mapped_column(String(150))
    codirector: Mapped[str | None] = mapped_column(String(150))
    fecha_cpr: Mapped[date]
    numero_resolucion: Mapped[str] = mapped_column(String(50))
    creado_por: Mapped[str] = mapped_column(String(255))  # email del CPR que lo cargó (auditoría)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
