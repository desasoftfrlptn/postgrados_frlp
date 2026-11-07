"""Tablas del módulo de gestión documental (ARQUITECTURA.md §8.1 y §9)."""

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database.connection import Base

TIPOS_DOCUMENTO = (
    "DNI", "TITULO_GRADO", "PARTIDA", "CUIT_CUIL",
    "FORM_INSCRIPCION", "FORM_BECA", "TITULO_POSGRADO",
)
# "FALTANTE" no se guarda: es un documento que todavía no tiene fila en esta tabla.
ESTADOS_DOCUMENTO = ("PENDIENTE_REVISION", "APROBADO", "OBSERVADO")


def valores_sql(valores: tuple[str, ...]) -> str:
    """Convierte ("A", "B") en "'A', 'B'" para armar los CHECK."""
    return ", ".join(f"'{v}'" for v in valores)


class Documento(Base):
    __tablename__ = "documentos"
    __table_args__ = (
        CheckConstraint(f"tipo IN ({valores_sql(TIPOS_DOCUMENTO)})", name="tipo_doc_valido"),
        CheckConstraint(f"estado IN ({valores_sql(ESTADOS_DOCUMENTO)})", name="estado_doc_valido"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    legajo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("legajos.id", ondelete="CASCADE"), index=True)
    tipo: Mapped[str] = mapped_column(String(50))

    # Archivo (ARQUITECTURA.md §9): la ruta es interna, nunca pública.
    # El PDF se descarga siempre por GET /api/v1/documentos/{id}/download.
    path_storage: Mapped[str] = mapped_column(String(500))
    nombre_original: Mapped[str] = mapped_column(String(255))
    checksum_sha256: Mapped[str] = mapped_column(String(64))
    tamanio_bytes: Mapped[int]
    fecha_subida: Mapped[datetime] = mapped_column(server_default=func.now())

    # Revisión del coordinador
    estado: Mapped[str] = mapped_column(String(30), server_default=text("'PENDIENTE_REVISION'"))
    motivo_observacion: Mapped[str | None] = mapped_column(Text)  # solo si estado == OBSERVADO
